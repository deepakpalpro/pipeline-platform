package com.pipelineplatform.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pipelineplatform.api.tenant.TenantContext;
import com.pipelineplatform.api.tenant.TenantContextRequiredException;
import com.pipelineplatform.api.tenant.TenantFilters;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.UUID;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantServiceConfigService {

  private final TenantServiceConfigRepository repository;
  private final ServiceTypeRepository serviceTypeRepository;
  private final ConfigMerger configMerger;
  private final SecretRedactor secretRedactor;
  private final SecretEncryptor secretEncryptor;
  private final ObjectMapper objectMapper;

  @PersistenceContext private EntityManager entityManager;

  public TenantServiceConfigService(
      TenantServiceConfigRepository repository,
      ServiceTypeRepository serviceTypeRepository,
      ConfigMerger configMerger,
      SecretRedactor secretRedactor,
      SecretEncryptor secretEncryptor,
      ObjectMapper objectMapper) {
    this.repository = repository;
    this.serviceTypeRepository = serviceTypeRepository;
    this.configMerger = configMerger;
    this.secretRedactor = secretRedactor;
    this.secretEncryptor = secretEncryptor;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public TenantServiceResponse create(CreateTenantServiceRequest request) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    ServiceType type =
        serviceTypeRepository
            .findByIdWithDefaults(request.serviceTypeId())
            .orElseThrow(
                () ->
                    new TenantServiceValidationException(
                        "Unknown service type: " + request.serviceTypeId()));

    boolean vendorOk =
        type.getDefaults().stream().anyMatch(d -> d.getVendor().equals(request.vendor()));
    if (!vendorOk) {
      throw new TenantServiceValidationException(
          "Vendor not registered for type: " + request.vendor());
    }

    String name = request.name().trim();
    if (repository.existsByTenantIdAndName(tenantId, name)) {
      throw new TenantServiceConflictException("Service name already exists: " + name);
    }

    boolean inherits = request.inheritsDefault() == null || request.inheritsDefault();
    JsonNode stored = secretEncryptor.encryptSecrets(request.tenantConfig());

    TenantServiceConfig entity = new TenantServiceConfig();
    entity.setId(UUID.randomUUID().toString());
    entity.setTenantId(tenantId);
    entity.setServiceTypeId(type.getId());
    entity.setVendor(request.vendor());
    entity.setName(name);
    entity.setTenantConfig(writeJson(stored));
    entity.setInheritsDefault(inherits);
    entity.setStatus(ServiceInstanceStatus.active);

    return toResponse(repository.save(entity));
  }

  @Transactional(readOnly = true)
  public TenantServiceResponse get(String id) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    return repository
        .findFilteredById(id)
        .map(this::toResponse)
        .orElseThrow(() -> new TenantServiceNotFoundException(id));
  }

  @Transactional(readOnly = true)
  public List<TenantServiceResponse> list() {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    return repository.findAllFiltered().stream().map(this::toResponse).toList();
  }

  @Transactional
  public TenantServiceResponse update(String id, UpdateTenantServiceRequest request) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    TenantServiceConfig entity =
        repository.findFilteredById(id).orElseThrow(() -> new TenantServiceNotFoundException(id));

    entity.setName(request.name().trim());
    if (request.tenantConfig() != null) {
      JsonNode existing = readJson(entity.getTenantConfig());
      JsonNode merged = mergePreservingSecrets(existing, request.tenantConfig());
      entity.setTenantConfig(writeJson(secretEncryptor.encryptSecrets(merged)));
    }
    if (request.inheritsDefault() != null) {
      entity.setInheritsDefault(request.inheritsDefault());
    }
    if (request.status() != null) {
      entity.setStatus(request.status());
    }
    return toResponse(repository.save(entity));
  }

  @Transactional
  public void delete(String id) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    TenantServiceConfig entity =
        repository.findFilteredById(id).orElseThrow(() -> new TenantServiceNotFoundException(id));
    repository.delete(entity);
  }

  TenantServiceResponse toResponse(TenantServiceConfig entity) {
    JsonNode defaults = loadDefaults(entity.getServiceTypeId(), entity.getVendor());
    JsonNode overrides = readJson(entity.getTenantConfig());
    JsonNode merged = configMerger.merge(defaults, overrides, entity.isInheritsDefault());
    JsonNode redacted = secretRedactor.redact(merged);
    return new TenantServiceResponse(
        entity.getId(),
        entity.getTenantId(),
        entity.getServiceTypeId(),
        entity.getVendor(),
        entity.getName(),
        redacted,
        entity.isInheritsDefault(),
        entity.getStatus(),
        entity.getCreatedAt());
  }

  private JsonNode loadDefaults(String serviceTypeId, String vendor) {
    return serviceTypeRepository
        .findByIdWithDefaults(serviceTypeId)
        .flatMap(
            type ->
                type.getDefaults().stream()
                    .filter(d -> d.getVendor().equals(vendor))
                    .findFirst()
                    .map(d -> readJson(d.getDefaultConfig())))
        .orElseGet(objectMapper::createObjectNode);
  }

  /**
   * When the UI sends redacted placeholders ({@code ***}) for secret fields, keep the stored value.
   */
  private JsonNode mergePreservingSecrets(JsonNode existing, JsonNode incoming) {
    if (incoming == null || incoming.isNull() || !incoming.isObject()) {
      return existing == null ? objectMapper.createObjectNode() : existing;
    }
    var out = objectMapper.createObjectNode();
    if (existing != null && existing.isObject()) {
      existing.fields().forEachRemaining(e -> out.set(e.getKey(), e.getValue().deepCopy()));
    }
    incoming
        .fields()
        .forEachRemaining(
            e -> {
              String key = e.getKey();
              JsonNode value = e.getValue();
              if (SecretRedactor.isSecretKey(key) && isRedactedPlaceholder(value) && out.has(key)) {
                return;
              }
              out.set(key, value.deepCopy());
            });
    return out;
  }

  private static boolean isRedactedPlaceholder(JsonNode value) {
    if (value == null || !value.isTextual()) {
      return false;
    }
    String text = value.asText();
    return "***".equals(text) || "••••••".equals(text);
  }

  private JsonNode readJson(String json) {
    if (json == null || json.isBlank()) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(json);
    } catch (Exception ex) {
      throw new IllegalStateException("Invalid tenant_config JSON", ex);
    }
  }

  private String writeJson(JsonNode node) {
    try {
      return objectMapper.writeValueAsString(node);
    } catch (Exception ex) {
      throw new IllegalStateException("Cannot serialize tenant_config", ex);
    }
  }

  private static String requireTenantId() {
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new TenantContextRequiredException();
    }
    return tenantId;
  }

  private void enableTenantFilter(String tenantId) {
    Session session = entityManager.unwrap(Session.class);
    var filter = session.getEnabledFilter(TenantFilters.NAME);
    if (filter == null) {
      filter = session.enableFilter(TenantFilters.NAME);
    }
    filter.setParameter(TenantFilters.PARAM_TENANT_ID, tenantId);
  }
}
