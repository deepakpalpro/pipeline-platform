package com.pipelineplatform.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class TenantFixturesTest {

  @Test
  void loadsT001Placeholder() throws Exception {
    Path fixture =
        Path.of("src/test/resources/fixtures/tenants/t001.json");
    String json = Files.readString(fixture, StandardCharsets.UTF_8);
    assertThat(json).contains("\"id\": \"T001\"");
    assertThat(json).contains("\"slug\": \"demo\"");
  }
}
