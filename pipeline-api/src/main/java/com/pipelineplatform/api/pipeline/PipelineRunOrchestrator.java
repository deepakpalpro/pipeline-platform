package com.pipelineplatform.api.pipeline;

import com.pipelineplatform.api.messaging.PipelineTopology;
import com.pipelineplatform.api.messaging.PipelineTopologyService;
import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.messaging.RabbitMessagingConfig;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Starts async pipeline runs: persist execution, declare topology, publish to stub stage worker.
 *
 * <p>Real pipelet Jobs arrive in W2-US05; this story uses {@link StubStageWorker} to advance stages.
 */
@Service
public class PipelineRunOrchestrator {

  private static final Logger log = LoggerFactory.getLogger(PipelineRunOrchestrator.class);

  private final PipelineExecutionRepository executionRepository;
  private final PipelineTopologyService topologyService;
  private final RabbitTemplate rabbitTemplate;

  public PipelineRunOrchestrator(
      PipelineExecutionRepository executionRepository,
      PipelineTopologyService topologyService,
      RabbitTemplate rabbitTemplate) {
    this.executionRepository = executionRepository;
    this.topologyService = topologyService;
    this.rabbitTemplate = rabbitTemplate;
  }

  @Transactional
  public PipelineExecution start(
      Pipeline pipeline, List<PipelineStep> steps, ExecutionTrigger trigger) {
    if (steps == null || steps.isEmpty()) {
      throw new PipelineValidationException("Pipeline has no steps configured");
    }
    if (pipeline.getStatus() == PipelineStatus.ARCHIVED) {
      throw new PipelineValidationException("Cannot run an archived pipeline");
    }
    if (pipeline.getStatus() != PipelineStatus.ACTIVE) {
      throw new PipelineValidationException("Activate the pipeline before running (status=active)");
    }

    PipelineExecution execution = new PipelineExecution();
    execution.setId(UUID.randomUUID().toString());
    execution.setPipelineId(pipeline.getId());
    execution.setTenantId(pipeline.getTenantId());
    execution.setPipelineVersion(pipeline.getVersion());
    execution.setStatus(ExecutionStatus.PENDING);
    execution.setTrigger(trigger == null ? ExecutionTrigger.MANUAL : trigger);
    execution.setStartedAt(Instant.now());
    execution.setRecordsIn(0);
    execution.setRecordsOut(0);
    PipelineExecution saved = executionRepository.save(execution);

    int stageCount = steps.size();
    PipelineTopology topology =
        topologyService.declare(pipeline.getTenantId(), pipeline.getId(), stageCount);

    // Mirror kickoff onto stage-1 queue for topology observability; stub worker drives progress.
    StageMessage message =
        new StageMessage(
            saved.getId(),
            pipeline.getId(),
            pipeline.getTenantId(),
            1,
            stageCount,
            "run-" + saved.getId());
    rabbitTemplate.convertAndSend(
        topology.exchange(), QueueNaming.stageRoutingKey(1), message);
    rabbitTemplate.convertAndSend(RabbitMessagingConfig.STUB_STAGE_WORKER_QUEUE, message);

    saved.setStatus(ExecutionStatus.RUNNING);
    saved = executionRepository.save(saved);

    log.info(
        "Started execution {} for pipeline {} ({} stages)",
        saved.getId(),
        pipeline.getId(),
        stageCount);
    return saved;
  }

  @Transactional
  public void markCompleted(String executionId, long recordsIn, long recordsOut) {
    executionRepository
        .findById(executionId)
        .ifPresent(
            execution -> {
              if (isTerminal(execution.getStatus())) {
                return;
              }
              execution.setStatus(ExecutionStatus.COMPLETED);
              execution.setCompletedAt(Instant.now());
              execution.setRecordsIn(recordsIn);
              execution.setRecordsOut(recordsOut);
              executionRepository.save(execution);
            });
  }

  @Transactional
  public void markFailed(String executionId, String summary) {
    executionRepository
        .findById(executionId)
        .ifPresent(
            execution -> {
              if (isTerminal(execution.getStatus())) {
                return;
              }
              execution.setStatus(ExecutionStatus.FAILED);
              execution.setCompletedAt(Instant.now());
              execution.setErrorSummary(summary);
              executionRepository.save(execution);
            });
  }

  private static boolean isTerminal(ExecutionStatus status) {
    return status == ExecutionStatus.COMPLETED
        || status == ExecutionStatus.FAILED
        || status == ExecutionStatus.CANCELLED;
  }
}
