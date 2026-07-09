package com.pipelineplatform.api.pipeline;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pipelineplatform.api.messaging.PipelineStageTopology;
import com.pipelineplatform.api.messaging.PipelineTopology;
import com.pipelineplatform.api.messaging.PipelineTopologyService;
import com.pipelineplatform.api.messaging.RabbitMessagingConfig;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PipelineRunOrchestratorTest {

  @Mock private PipelineExecutionRepository executionRepository;
  @Mock private PipelineTopologyService topologyService;
  @Mock private RabbitTemplate rabbitTemplate;

  private PipelineRunOrchestrator orchestrator;

  @BeforeEach
  void setUp() {
    orchestrator =
        new PipelineRunOrchestrator(executionRepository, topologyService, rabbitTemplate);
    when(executionRepository.save(any(PipelineExecution.class)))
        .thenAnswer(inv -> inv.getArgument(0));
    when(topologyService.declare(anyString(), anyString(), anyInt()))
        .thenAnswer(
            inv ->
                new PipelineTopology(
                    inv.getArgument(0),
                    inv.getArgument(1),
                    "tenant." + inv.getArgument(0) + ".pipeline." + inv.getArgument(1),
                    List.of(
                        new PipelineStageTopology(
                            1, "q1", "q2", "d1", "stage.1"),
                        new PipelineStageTopology(2, "q2", null, "d2", "stage.2"))));
  }

  @Test
  void start_createsExecution() {
    Pipeline pipeline = activePipeline();
    List<PipelineStep> steps = List.of(step(1), step(2));

    PipelineExecution execution =
        orchestrator.start(pipeline, steps, ExecutionTrigger.MANUAL);

    assertThat(execution.getId()).isNotBlank();
    assertThat(execution.getStatus()).isEqualTo(ExecutionStatus.RUNNING);
    assertThat(execution.getPipelineId()).isEqualTo("p1");
    assertThat(execution.getTenantId()).isEqualTo("tenant-a");
    assertThat(execution.getTrigger()).isEqualTo(ExecutionTrigger.MANUAL);

    verify(topologyService).declare("tenant-a", "p1", 2);
    verify(rabbitTemplate)
        .convertAndSend(eq(RabbitMessagingConfig.STUB_STAGE_WORKER_QUEUE), any(StageMessage.class));
    verify(executionRepository, org.mockito.Mockito.atLeast(2)).save(any(PipelineExecution.class));
  }

  @Test
  void start_rejectsArchived() {
    Pipeline pipeline = activePipeline();
    pipeline.setStatus(PipelineStatus.ARCHIVED);

    assertThatThrownBy(
            () -> orchestrator.start(pipeline, List.of(step(1)), ExecutionTrigger.MANUAL))
        .isInstanceOf(PipelineValidationException.class)
        .hasMessageContaining("archived");

    verify(executionRepository, never()).save(any());
  }

  @Test
  void start_rejectsDraft() {
    Pipeline pipeline = activePipeline();
    pipeline.setStatus(PipelineStatus.DRAFT);

    assertThatThrownBy(
            () -> orchestrator.start(pipeline, List.of(step(1)), ExecutionTrigger.MANUAL))
        .isInstanceOf(PipelineValidationException.class)
        .hasMessageContaining("active");
  }

  @Test
  void start_rejectsEmptySteps() {
    assertThatThrownBy(
            () -> orchestrator.start(activePipeline(), List.of(), ExecutionTrigger.MANUAL))
        .isInstanceOf(PipelineValidationException.class)
        .hasMessageContaining("steps");
  }

  private static Pipeline activePipeline() {
    Pipeline pipeline = new Pipeline();
    pipeline.setId("p1");
    pipeline.setTenantId("tenant-a");
    pipeline.setName("pipe");
    pipeline.setVersion(3);
    pipeline.setStatus(PipelineStatus.ACTIVE);
    pipeline.setVisibility(PipelineVisibility.PRIVATE);
    pipeline.setExecutionMode(PipelineExecutionMode.ASYNC);
    return pipeline;
  }

  private static PipelineStep step(int order) {
    PipelineStep step = new PipelineStep();
    step.setId("s" + order);
    step.setPipelineId("p1");
    step.setPipeletId("plet-" + order);
    step.setStepOrder(order);
    return step;
  }
}
