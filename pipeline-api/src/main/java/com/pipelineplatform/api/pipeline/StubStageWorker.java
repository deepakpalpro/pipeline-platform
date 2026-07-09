package com.pipelineplatform.api.pipeline;

import com.pipelineplatform.api.k8s.PipeletJobClient;
import com.pipelineplatform.api.k8s.PipeletJobRequest;
import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.messaging.RabbitMessagingConfig;
import com.pipelineplatform.api.observability.PipelineLogEmitter;
import com.pipelineplatform.api.observability.PipeletMetricsEmitter;
import com.pipelineplatform.api.usage.MeterAgent;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Stub stage worker for Wave 2: advances stages over RabbitMQ. Spawns subsequent stage Jobs via
 * {@link PipeletJobClient} (stage 1 is spawned by the orchestrator). Emits pipelet metrics (W4-US01),
 * structured pipeline logs (W4-US04), and billable usage via {@link MeterAgent} (W5-US02).
 */
@Component
public class StubStageWorker {

  /** Stub processes one logical record per stage message (fixture-friendly for completeness). */
  public static final long STUB_RECORDS_PER_STAGE = 1L;

  private static final Logger log = LoggerFactory.getLogger(StubStageWorker.class);

  private final RabbitTemplate rabbitTemplate;
  private final PipelineRunOrchestrator orchestrator;
  private final PipeletJobClient pipeletJobClient;
  private final PipelineStepRepository pipelineStepRepository;
  private final PipeletMetricsEmitter pipeletMetricsEmitter;
  private final PipelineLogEmitter pipelineLogEmitter;
  private final MeterAgent meterAgent;

  public StubStageWorker(
      RabbitTemplate rabbitTemplate,
      PipelineRunOrchestrator orchestrator,
      PipeletJobClient pipeletJobClient,
      PipelineStepRepository pipelineStepRepository,
      PipeletMetricsEmitter pipeletMetricsEmitter,
      PipelineLogEmitter pipelineLogEmitter,
      MeterAgent meterAgent) {
    this.rabbitTemplate = rabbitTemplate;
    this.orchestrator = orchestrator;
    this.pipeletJobClient = pipeletJobClient;
    this.pipelineStepRepository = pipelineStepRepository;
    this.pipeletMetricsEmitter = pipeletMetricsEmitter;
    this.pipelineLogEmitter = pipelineLogEmitter;
    this.meterAgent = meterAgent;
  }

  @RabbitListener(queues = RabbitMessagingConfig.STUB_STAGE_WORKER_QUEUE)
  public void onStageMessage(StageMessage message) {
    if (message == null) {
      return;
    }
    log.debug(
        "Stub stage {}/{} for execution {}",
        message.stageOrder(),
        message.stageCount(),
        message.executionId());

    long startedNanos = System.nanoTime();
    Duration processing = Duration.ofNanos(Math.max(1L, System.nanoTime() - startedNanos));
    pipeletMetricsEmitter.recordBatch(
        message.tenantId(),
        message.pipelineId(),
        message.pipeletId(),
        STUB_RECORDS_PER_STAGE,
        STUB_RECORDS_PER_STAGE,
        processing);
    pipeletMetricsEmitter.touchHeartbeat(
        message.tenantId(), message.pipelineId(), message.pipeletId());
    pipelineLogEmitter.emitStageProcessed(
        message.tenantId(),
        message.pipelineId(),
        message.executionId(),
        message.pipeletId(),
        STUB_RECORDS_PER_STAGE,
        STUB_RECORDS_PER_STAGE,
        Math.max(1L, processing.toMillis()));
    meterAgent.recordStageProcessed(
        message.tenantId(),
        message.pipelineId(),
        message.executionId(),
        message.pipeletId(),
        message.stageOrder(),
        message.stageCount(),
        STUB_RECORDS_PER_STAGE,
        processing);

    String exchange = QueueNaming.pipelineExchange(message.tenantId(), message.pipelineId());

    if (message.stageOrder() >= message.stageCount()) {
      orchestrator.markCompleted(message.executionId(), 1, 1);
      return;
    }

    int next = message.stageOrder() + 1;
    PipelineStep nextStep =
        pipelineStepRepository.findByPipelineIdOrdered(message.pipelineId()).stream()
            .filter(s -> s.getStepOrder() == next)
            .findFirst()
            .orElse(null);
    String nextPipeletId = nextStep != null ? nextStep.getPipeletId() : "unknown";
    String inputQueue =
        nextStep != null && nextStep.getInputQueue() != null
            ? nextStep.getInputQueue()
            : QueueNaming.stageInputQueue(message.tenantId(), message.pipelineId(), next);
    String outputQueue =
        nextStep != null && nextStep.getOutputQueue() != null
            ? nextStep.getOutputQueue()
            : (next < message.stageCount()
                ? QueueNaming.stageOutputQueue(message.tenantId(), message.pipelineId(), next)
                : null);

    pipeletJobClient.create(
        PipeletJobRequest.of(
            message.tenantId(),
            message.pipelineId(),
            message.executionId(),
            nextPipeletId,
            next,
            message.stageCount(),
            inputQueue,
            outputQueue));

    StageMessage nextMessage =
        new StageMessage(
            message.executionId(),
            message.pipelineId(),
            message.tenantId(),
            nextPipeletId,
            next,
            message.stageCount(),
            message.payload());
    rabbitTemplate.convertAndSend(exchange, QueueNaming.stageRoutingKey(next), nextMessage);
    rabbitTemplate.convertAndSend(RabbitMessagingConfig.STUB_STAGE_WORKER_QUEUE, nextMessage);
  }
}
