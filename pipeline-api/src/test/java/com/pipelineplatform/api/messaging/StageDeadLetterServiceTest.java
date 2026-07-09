package com.pipelineplatform.api.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

@ExtendWith(MockitoExtension.class)
class StageDeadLetterServiceTest {

  @Mock private RabbitTemplate rabbitTemplate;

  private StageDeadLetterService service;

  @BeforeEach
  void setUp() {
    service = new StageDeadLetterService(rabbitTemplate);
  }

  @Test
  void retriesUntilExhaustedThenDlq() {
    RetryPolicy policy = new RetryPolicy(2, 2.0, 1L, 10L);

    boolean first = service.handleFailure("T1", "P1", 1, "poison", 0, policy, "boom");
    assertThat(first).isFalse();
    verify(rabbitTemplate)
        .convertAndSend(
            eq(QueueNaming.pipelineExchange("T1", "P1")),
            eq("stage.1"),
            eq("poison"),
            any(MessagePostProcessor.class));

    boolean second = service.handleFailure("T1", "P1", 1, "poison", 1, policy, "boom");
    assertThat(second).isTrue();
    verify(rabbitTemplate)
        .convertAndSend(
            eq(QueueNaming.deadLetterExchange("T1", "P1")),
            eq("stage.1.dlq"),
            eq("poison"),
            any(MessagePostProcessor.class));
  }
}
