package com.pipelineplatform.api.pipeline;

import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.messaging.RabbitMessagingConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Stub stage worker for Wave 2: consumes stage messages and either forwards to the next stage or
 * completes the execution. Replaced by real pipelet Jobs in W2-US05.
 */
@Component
public class StubStageWorker {

  private static final Logger log = LoggerFactory.getLogger(StubStageWorker.class);

  private final RabbitTemplate rabbitTemplate;
  private final PipelineRunOrchestrator orchestrator;

  public StubStageWorker(RabbitTemplate rabbitTemplate, PipelineRunOrchestrator orchestrator) {
    this.rabbitTemplate = rabbitTemplate;
    this.orchestrator = orchestrator;
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

    String exchange = QueueNaming.pipelineExchange(message.tenantId(), message.pipelineId());

    if (message.stageOrder() >= message.stageCount()) {
      orchestrator.markCompleted(message.executionId(), 1, 1);
      return;
    }

    int next = message.stageOrder() + 1;
    StageMessage nextMessage =
        new StageMessage(
            message.executionId(),
            message.pipelineId(),
            message.tenantId(),
            next,
            message.stageCount(),
            message.payload());
    rabbitTemplate.convertAndSend(exchange, QueueNaming.stageRoutingKey(next), nextMessage);
    rabbitTemplate.convertAndSend(RabbitMessagingConfig.STUB_STAGE_WORKER_QUEUE, nextMessage);
  }
}
