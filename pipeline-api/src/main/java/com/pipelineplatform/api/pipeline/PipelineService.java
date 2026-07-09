package com.pipelineplatform.api.pipeline;

import com.pipelineplatform.api.tenant.TenantContext;
import com.pipelineplatform.api.tenant.TenantContextRequiredException;
import com.pipelineplatform.api.tenant.TenantFilters;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PipelineService {

  private final PipelineRepository pipelineRepository;
  private final EntityManager entityManager;

  public PipelineService(PipelineRepository pipelineRepository, EntityManager entityManager) {
    this.pipelineRepository = pipelineRepository;
    this.entityManager = entityManager;
  }

  @Transactional
  public PipelineResponse create(CreatePipelineRequest request) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    String name = request.name().trim();
    if (pipelineRepository.existsByTenantIdAndName(tenantId, name)) {
      throw new PipelineConflictException("Pipeline name already exists: " + name);
    }

    Pipeline pipeline = new Pipeline();
    pipeline.setId(UUID.randomUUID().toString());
    pipeline.setTenantId(tenantId);
    pipeline.setName(name);
    pipeline.setDescription(blankToNull(request.description()));
    pipeline.setVisibility(
        request.visibility() == null ? PipelineVisibility.PRIVATE : request.visibility());
    pipeline.setExecutionMode(
        request.executionMode() == null ? PipelineExecutionMode.ASYNC : request.executionMode());
    pipeline.setVersion(1);
    pipeline.setStatus(PipelineStatus.DRAFT);

    return PipelineResponse.from(pipelineRepository.save(pipeline));
  }

  @Transactional(readOnly = true)
  public PipelineResponse get(String id) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    return pipelineRepository
        .findFilteredById(id)
        .map(PipelineResponse::from)
        .orElseThrow(() -> new PipelineNotFoundException(id));
  }

  @Transactional(readOnly = true)
  public List<PipelineResponse> list() {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);
    return pipelineRepository.findAllFiltered().stream().map(PipelineResponse::from).toList();
  }

  @Transactional
  public PipelineResponse update(String id, UpdatePipelineRequest request) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    Pipeline pipeline =
        pipelineRepository
            .findFilteredById(id)
            .orElseThrow(() -> new PipelineNotFoundException(id));

    String name = request.name().trim();
    if (pipelineRepository.existsByTenantIdAndNameAndIdNot(tenantId, name, id)) {
      throw new PipelineConflictException("Pipeline name already exists: " + name);
    }

    pipeline.setName(name);
    pipeline.setDescription(blankToNull(request.description()));
    if (request.visibility() != null) {
      pipeline.setVisibility(request.visibility());
    }
    if (request.executionMode() != null) {
      pipeline.setExecutionMode(request.executionMode());
    }
    if (request.status() != null) {
      if (request.status() == PipelineStatus.ARCHIVED) {
        throw new PipelineValidationException("Use DELETE to archive a pipeline");
      }
      pipeline.setStatus(request.status());
    }
    pipeline.setVersion(pipeline.getVersion() + 1);
    return PipelineResponse.from(pipelineRepository.save(pipeline));
  }

  @Transactional
  public PipelineResponse archive(String id) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    Pipeline pipeline =
        pipelineRepository
            .findFilteredById(id)
            .orElseThrow(() -> new PipelineNotFoundException(id));
    pipeline.setStatus(PipelineStatus.ARCHIVED);
    pipeline.setVersion(pipeline.getVersion() + 1);
    return PipelineResponse.from(pipelineRepository.save(pipeline));
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
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
