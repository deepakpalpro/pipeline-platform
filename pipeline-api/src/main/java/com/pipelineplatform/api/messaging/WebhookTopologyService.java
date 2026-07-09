package com.pipelineplatform.api.messaging;

import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.stereotype.Service;

/** Declares tenant webhook exchange + connector `.in` / `.dlq` (architecture §11.5). */
@Service
public class WebhookTopologyService {

  private final AmqpAdmin amqpAdmin;

  public WebhookTopologyService(AmqpAdmin amqpAdmin) {
    this.amqpAdmin = amqpAdmin;
  }

  public WebhookTopology declare(String tenantId, String connectorId) {
    String exchangeName = QueueNaming.webhookExchange(tenantId);
    TopicExchange exchange = new TopicExchange(exchangeName, true, false);
    amqpAdmin.declareExchange(exchange);

    String inputQueue = QueueNaming.webhookInputQueue(tenantId, connectorId);
    String dlqName = QueueNaming.webhookDlq(tenantId, connectorId);
    String routingKey = QueueNaming.webhookRoutingKey(connectorId);

    Queue dlq = QueueBuilder.durable(dlqName).build();
    amqpAdmin.declareQueue(dlq);

    Queue queue = QueueBuilder.durable(inputQueue).build();
    amqpAdmin.declareQueue(queue);
    amqpAdmin.declareBinding(BindingBuilder.bind(queue).to(exchange).with(routingKey));

    return new WebhookTopology(tenantId, connectorId, exchangeName, inputQueue, dlqName, routingKey);
  }
}
