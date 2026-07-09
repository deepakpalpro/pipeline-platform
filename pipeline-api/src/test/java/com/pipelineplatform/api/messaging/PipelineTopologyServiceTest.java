package com.pipelineplatform.api.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Exchange;
import org.springframework.amqp.core.Queue;

@ExtendWith(MockitoExtension.class)
class PipelineTopologyServiceTest {

  @Mock private AmqpAdmin amqpAdmin;

  private PipelineTopologyService service;

  @BeforeEach
  void setUp() {
    service = new PipelineTopologyService(amqpAdmin);
    when(amqpAdmin.declareQueue(any(Queue.class))).thenReturn("ok");
  }

  @Test
  void declare_createsExchangeQueuesAndBindings() {
    PipelineTopology topology = service.declare("T001", "pipe1", 2);

    assertThat(topology.exchange()).isEqualTo("tenant.T001.pipeline.pipe1");
    assertThat(topology.stages()).hasSize(2);
    assertThat(topology.stages().get(0).inputQueue())
        .isEqualTo("tenant.T001.pipeline.pipe1.stage.1.in");
    assertThat(topology.stages().get(0).outputQueue())
        .isEqualTo("tenant.T001.pipeline.pipe1.stage.2.in");
    assertThat(topology.stages().get(0).dlq())
        .isEqualTo("tenant.T001.pipeline.pipe1.stage.1.dlq");

    // main exchange + DLX
    verify(amqpAdmin, times(2)).declareExchange(any(Exchange.class));
    // 2 stages × (queue + dlq)
    verify(amqpAdmin, times(4)).declareQueue(any(Queue.class));
    // 2 stages × (queue bind + dlq bind)
    verify(amqpAdmin, times(4)).declareBinding(any(Binding.class));

    ArgumentCaptor<Queue> queueCaptor = ArgumentCaptor.forClass(Queue.class);
    verify(amqpAdmin, times(4)).declareQueue(queueCaptor.capture());
    assertThat(queueCaptor.getAllValues())
        .extracting(Queue::getName)
        .contains(
            "tenant.T001.pipeline.pipe1.stage.1.in",
            "tenant.T001.pipeline.pipe1.stage.1.dlq",
            "tenant.T001.pipeline.pipe1.stage.2.in",
            "tenant.T001.pipeline.pipe1.stage.2.dlq");

    Queue stage1In =
        queueCaptor.getAllValues().stream()
            .filter(q -> q.getName().endsWith(".stage.1.in"))
            .findFirst()
            .orElseThrow();
    assertThat(stage1In.getArguments())
        .containsEntry("x-dead-letter-exchange", "tenant.T001.pipeline.pipe1.dlx")
        .containsEntry("x-dead-letter-routing-key", "stage.1.dlq");
  }
}
