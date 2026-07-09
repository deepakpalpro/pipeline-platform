package com.pipelineplatform.api.k8s;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PipeletJobClientTest {

  private StubPipeletJobClient client;

  @BeforeEach
  void setUp() {
    client = new StubPipeletJobClient();
  }

  @Test
  void stub_recordsCreate() {
    PipeletJobRequest request =
        PipeletJobRequest.of(
            "T001",
            "pipe-abc",
            "exec-1",
            "plet-rest-source",
            1,
            3,
            "tenant.T001.pipeline.pipe-abc.stage.1.in",
            "tenant.T001.pipeline.pipe-abc.stage.2.in");

    PipeletJobHandle handle = client.create(request);

    assertThat(handle.jobName()).isEqualTo("exec-exec-1-stage-1");
    assertThat(handle.namespace()).isEqualTo("tenant-T001");
    assertThat(handle.status()).isEqualTo("stubbed");
    assertThat(client.getCreated()).hasSize(1);
    PipeletJobRequest recorded = client.getCreated().get(0);
    assertThat(recorded.tenantId()).isEqualTo("T001");
    assertThat(recorded.pipelineId()).isEqualTo("pipe-abc");
    assertThat(recorded.executionId()).isEqualTo("exec-1");
    assertThat(recorded.pipeletId()).isEqualTo("plet-rest-source");
    assertThat(recorded.stageOrder()).isEqualTo(1);
    assertThat(recorded.inputQueue()).contains("T001").endsWith(".stage.1.in");
  }

  @Test
  void stub_rejectsNullRequest() {
    assertThatThrownBy(() -> client.create(null)).isInstanceOf(IllegalArgumentException.class);
  }
}
