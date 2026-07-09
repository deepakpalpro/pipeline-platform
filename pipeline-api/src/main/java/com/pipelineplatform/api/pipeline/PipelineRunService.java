package com.pipelineplatform.api.pipeline;

import com.pipelineplatform.api.tenant.TenantContext;
import com.pipelineplatform.api.tenant.TenantContextRequiredException;
import com.pipelineplatform.api.tenant.TenantFilters;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PipelineRunService {

  private final PipelineRepository pipelineRepository;
  private final PipelineStepRepository pipelineStepRepository;
  private final PipelineExecutionRepository executionRepository;
  private final PipelineRunOrchestrator orchestrator;
  private final EntityManager entityManager;

  public PipelineRunService(
      PipelineRepository pipelineRepository,
      PipelineStepRepository pipelineStepRepository,
      PipelineExecutionRepository executionRepository,
      PipelineRunOrchestrator orchestrator,
      EntityManager entityManager) {
    this.pipelineRepository = pipelineRepository;
    this.pipelineStepRepository = pipelineStepRepository;
    this.executionRepository = executionRepository;
    this.orchestrator = orchestrator;
    this.entityManager = entityManager;
  }

  @Transactional
  public PipelineRunResponse run(String pipelineId) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    Pipeline pipeline =
        pipelineRepository
            .findFilteredById(pipelineId)
            .orElseThrow(() -> new PipelineNotFoundException(pipelineId));

    List<PipelineStep> steps = pipelineStepRepository.findByPipelineIdOrdered(pipelineId);
    PipelineExecution execution = orchestrator.start(pipeline, steps, ExecutionTrigger.MANUAL);
    return PipelineRunResponse.from(execution);
  }

  @Transactional(readOnly = true)
  public List<PipelineExecutionResponse> listExecutions(String pipelineId) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    pipelineRepository
        .findFilteredById(pipelineId)
        .orElseThrow(() -> new PipelineNotFoundException(pipelineId));

    return executionRepository.findFilteredByPipelineId(pipelineId).stream()
        .map(PipelineExecutionResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public PipelineExecutionResponse getExecution(String pipelineId, String executionId) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    pipelineRepository
        .findFilteredById(pipelineId)
        .orElseThrow(() -> new PipelineNotFoundException(pipelineId));

    PipelineExecution execution =
        executionRepository
            .findFilteredById(executionId)
            .filter(e -> e.getPipelineId().equals(pipelineId))
            .orElseThrow(() -> new PipelineExecutionNotFoundException(executionId));
    return PipelineExecutionResponse.from(execution);
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
