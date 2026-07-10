package com.pipelineplatform.api.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.amqp.RabbitProperties;

class PipeletAmqpUrlFactoryTest {

  @Test
  void buildsFromRabbitProperties() {
    RabbitProperties rabbit = new RabbitProperties();
    rabbit.setHost("rabbitmq");
    rabbit.setPort(5672);
    rabbit.setUsername("pipeline");
    rabbit.setPassword("pipeline");
    PipelineOrchestrationProperties orch = new PipelineOrchestrationProperties();
    PipeletAmqpUrlFactory factory = new PipeletAmqpUrlFactory(rabbit, orch);

    assertThat(factory.resolve()).isEqualTo("amqp://pipeline:pipeline@rabbitmq:5672/");
  }

  @Test
  void prefersExplicitOverride() {
    RabbitProperties rabbit = new RabbitProperties();
    PipelineOrchestrationProperties orch = new PipelineOrchestrationProperties();
    orch.setAmqpUrl("amqp://custom@broker:5672/vhost");
    PipeletAmqpUrlFactory factory = new PipeletAmqpUrlFactory(rabbit, orch);

    assertThat(factory.resolve()).isEqualTo("amqp://custom@broker:5672/vhost");
  }
}
