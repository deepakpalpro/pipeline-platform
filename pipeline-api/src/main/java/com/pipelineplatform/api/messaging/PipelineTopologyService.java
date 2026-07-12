package com.pipelineplatform.api.messaging;

import java.util.ArrayList;
import java.util.List;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.stereotype.Service;

/**
 * Declares tenant-prefixed pipeline stage exchanges/queues with per-stage DLQ (architecture §8.2).
 *
 * <p>Stage input queues are bound to a pipeline DLX so broker rejects and app-level dead-letters
 * land on {@code ...stage.{n}.dlq}.
 */
@Service
public class PipelineTopologyService {

  private final AmqpAdmin amqpAdmin;

  public PipelineTopologyService(AmqpAdmin amqpAdmin) {
    this.amqpAdmin = amqpAdmin;
  }

  public PipelineTopology declare(String tenantId, String pipelineId, int stageCount) {
    if (stageCount < 1) {
      throw new IllegalArgumentException("stageCount must be >= 1");
    }

    String exchangeName = QueueNaming.pipelineExchange(tenantId, pipelineId);
    TopicExchange exchange = new TopicExchange(exchangeName, true, false);
    amqpAdmin.declareExchange(exchange);

    String dlxName = QueueNaming.deadLetterExchange(tenantId, pipelineId);
    TopicExchange deadLetterExchange = new TopicExchange(dlxName, true, false);
    amqpAdmin.declareExchange(deadLetterExchange);

    List<PipelineStageTopology> stages = new ArrayList<>();
    for (int stage = 1; stage <= stageCount; stage++) {
      String inputQueue = QueueNaming.stageInputQueue(tenantId, pipelineId, stage);
      String dlqName = QueueNaming.stageDlq(tenantId, pipelineId, stage);
      String routingKey = QueueNaming.stageRoutingKey(stage);
      String dlqRoutingKey = QueueNaming.stageDlqRoutingKey(stage);
      String outputQueue =
          stage < stageCount ? QueueNaming.stageOutputQueue(tenantId, pipelineId, stage) : null;

      Queue dlq = QueueBuilder.durable(dlqName).build();
      amqpAdmin.declareQueue(dlq);
      amqpAdmin.declareBinding(
          BindingBuilder.bind(dlq).to(deadLetterExchange).with(dlqRoutingKey));

      Queue queue =
          QueueBuilder.durable(inputQueue)
              .deadLetterExchange(dlxName)
              .deadLetterRoutingKey(dlqRoutingKey)
              .build();
      amqpAdmin.declareQueue(queue);
      amqpAdmin.declareBinding(BindingBuilder.bind(queue).to(exchange).with(routingKey));

      stages.add(new PipelineStageTopology(stage, inputQueue, outputQueue, dlqName, routingKey));
    }

    return new PipelineTopology(tenantId, pipelineId, exchangeName, List.copyOf(stages));
  }

  /**
   * Drop pending messages from stage input queues (and DLQs) so a new run cannot consume a stale
   * kickoff / prior-stage payload. Safe after {@link #declare}.
   */
  public void purgeStageQueues(PipelineTopology topology) {
    if (topology == null || topology.stages() == null) {
      return;
    }
    for (PipelineStageTopology stage : topology.stages()) {
      purgeQuietly(stage.inputQueue());
      purgeQuietly(stage.dlq());
    }
  }

  private void purgeQuietly(String queueName) {
    if (queueName == null || queueName.isBlank()) {
      return;
    }
    try {
      amqpAdmin.purgeQueue(queueName, false);
    } catch (Exception ignored) {
      // Queue may not exist yet on first declare race; declare already created it.
    }
  }
}
