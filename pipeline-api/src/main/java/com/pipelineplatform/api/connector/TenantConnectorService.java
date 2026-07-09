package com.pipelineplatform.api.connector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pipelineplatform.api.tenant.TenantContext;
import com.pipelineplatform.api.tenant.TenantContextRequiredException;
import com.pipelineplatform.api.tenant.TenantFilters;
import com.pipelineplatform.connector.ConnectorRegistry;
import com.pipelineplatform.connector.spi.ConnectionTestResult;
import com.pipelineplatform.connector.spi.Connector;
import com.pipelineplatform.connector.spi.ConnectorConfig;
import com.pipelineplatform.connector.spi.ConnectorContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantConnectorService {

  public static final String REST_TYPE_ID = "ct-rest";

  private final TenantConnectorRepository repository;
  private final ConnectorTypeRepository connectorTypeRepository;
  private final ConnectorRegistry connectorRegistry;
  private final ObjectMapper objectMapper;

  @PersistenceContext private EntityManager entityManager;

  public TenantConnectorService(
      TenantConnectorRepository repository,
      ConnectorTypeRepository connectorTypeRepository,
      ConnectorRegistry connectorRegistry,
      ObjectMapper objectMapper) {
    this.repository = repository;
    this.connectorTypeRepository = connectorTypeRepository;
    this.connectorRegistry = connectorRegistry;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public TenantConnectorResponse create(CreateConnectorRequest request) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    ConnectorType type =
        connectorTypeRepository
            .findById(request.connectorTypeId())
            .orElseThrow(
                () ->
                    new TenantConnectorValidationException(
                        "Unknown connector type: " + request.connectorTypeId()));

    String name = request.name().trim();
    if (repository.existsByTenantIdAndName(tenantId, name)) {
      throw new TenantConnectorConflictException("Connector name already exists: " + name);
    }

    TenantConnector entity = new TenantConnector();
    entity.setId(UUID.randomUUID().toString());
    entity.setTenantId(tenantId);
    entity.setConnectorTypeId(type.getId());
    entity.setName(name);
    entity.setConfig(writeJson(request.config()));
    entity.setStatus(ConnectorInstanceStatus.active);
    return toResponse(repository.save(entity));
  }

  @Transactional(readOnly = true)
  public TenantConnectorResponse get(String id) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    return repository
        .findFilteredById(id)
        .map(this::toResponse)
        .orElseThrow(() -> new TenantConnectorNotFoundException(id));
  }

  @Transactional(readOnly = true)
  public List<TenantConnectorResponse> list() {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    return repository.findAllFiltered().stream().map(this::toResponse).toList();
  }

  @Transactional
  public ConnectionTestResponse test(String id) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    TenantConnector entity =
        repository.findFilteredById(id).orElseThrow(() -> new TenantConnectorNotFoundException(id));

    ConnectorType type =
        connectorTypeRepository
            .findById(entity.getConnectorTypeId())
            .orElseThrow(
                () ->
                    new TenantConnectorValidationException(
                        "Unknown connector type: " + entity.getConnectorTypeId()));

    Connector plugin =
        connectorRegistry
            .findByType(type.getType().name())
            .orElseThrow(
                () ->
                    new TenantConnectorValidationException(
                        "No SPI plugin registered for type: " + type.getType()));

    Connector instance = newInstance(plugin);
    instance.configure(
        new ConnectorContext(tenantId, entity.getId(), null, null, null),
        toConnectorConfig(readJson(entity.getConfig())));

    ConnectionTestResult result = instance.testConnection();
    Instant testedAt = Instant.now();
    entity.setLastTestedAt(testedAt);
    if (!result.success()) {
      entity.setStatus(ConnectorInstanceStatus.error);
    } else if (entity.getStatus() == ConnectorInstanceStatus.error) {
      entity.setStatus(ConnectorInstanceStatus.active);
    }
    repository.save(entity);
    instance.close();

    return new ConnectionTestResponse(
        result.success(), result.latencyMs(), result.message(), testedAt);
  }

  private static Connector newInstance(Connector plugin) {
    try {
      return plugin.getClass().getDeclaredConstructor().newInstance();
    } catch (ReflectiveOperationException ex) {
      throw new IllegalStateException(
          "Cannot instantiate connector plugin: " + plugin.getClass().getName(), ex);
    }
  }

  private ConnectorConfig toConnectorConfig(JsonNode configJson) {
    Map<String, Object> properties = new HashMap<>();
    Map<String, String> secrets = new HashMap<>();
    if (configJson != null && configJson.isObject()) {
      Iterator<Map.Entry<String, JsonNode>> fields = configJson.fields();
      while (fields.hasNext()) {
        Map.Entry<String, JsonNode> entry = fields.next();
        String key = entry.getKey();
        JsonNode value = entry.getValue();
        if (key.toLowerCase().contains("secret") || key.toLowerCase().contains("password")) {
          secrets.put(key, value.isNull() ? null : value.asText());
        } else if (value.isNumber()) {
          properties.put(key, value.numberValue());
        } else if (value.isBoolean()) {
          properties.put(key, value.booleanValue());
        } else if (!value.isNull()) {
          properties.put(key, value.asText());
        }
      }
    }
    return new ConnectorConfig(properties, secrets);
  }

  private TenantConnectorResponse toResponse(TenantConnector entity) {
    return new TenantConnectorResponse(
        entity.getId(),
        entity.getTenantId(),
        entity.getConnectorTypeId(),
        entity.getName(),
        readJson(entity.getConfig()),
        entity.getStatus(),
        entity.getLastTestedAt(),
        entity.getCreatedAt());
  }

  private JsonNode readJson(String json) {
    if (json == null || json.isBlank()) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(json);
    } catch (Exception ex) {
      throw new IllegalStateException("Invalid connector config JSON", ex);
    }
  }

  private String writeJson(JsonNode node) {
    try {
      return objectMapper.writeValueAsString(node);
    } catch (Exception ex) {
      throw new IllegalStateException("Cannot serialize connector config", ex);
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
