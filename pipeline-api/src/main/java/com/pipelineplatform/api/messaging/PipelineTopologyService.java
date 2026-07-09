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
 * Declares tenant-prefixed pipeline stage exchanges/queues (idempotent via AmqpAdmin).
 *
 * <p>DLQ queues are provisioned now; dead-letter routing policy is completed in W2-US06.
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

    List<PipelineStageTopology> stages = new ArrayList<>();
    for (int stage = 1; stage <= stageCount; stage++) {
      String inputQueue = QueueNaming.stageInputQueue(tenantId, pipelineId, stage);
      String dlqName = QueueNaming.stageDlq(tenantId, pipelineId, stage);
      String routingKey = QueueNaming.stageRoutingKey(stage);
      String outputQueue =
          stage < stageCount ? QueueNaming.stageOutputQueue(tenantId, pipelineId, stage) : null;

      Queue dlq = QueueBuilder.durable(dlqName).build();
      amqpAdmin.declareQueue(dlq);

      Queue queue = QueueBuilder.durable(inputQueue).build();
      amqpAdmin.declareQueue(queue);
      amqpAdmin.declareBinding(BindingBuilder.bind(queue).to(exchange).with(routingKey));

      stages.add(new PipelineStageTopology(stage, inputQueue, outputQueue, dlqName, routingKey));
    }

    return new PipelineTopology(tenantId, pipelineId, exchangeName, List.copyOf(stages));
  }
}
