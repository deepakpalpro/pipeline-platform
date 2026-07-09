package com.pipelineplatform.connector.rest;

import static org.assertj.core.api.Assertions.assertThat;

import com.pipelineplatform.connector.spi.ConnectionTestResult;
import com.pipelineplatform.connector.spi.ConnectorConfig;
import com.pipelineplatform.connector.spi.ConnectorContext;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RestConnectorTest {

  @Test
  void getType_isRest() {
    assertThat(new RestConnector().getType()).isEqualTo("rest");
  }

  @Test
  void testConnection_withoutConfig_failsCleanly() {
    RestConnector connector = new RestConnector();

    ConnectionTestResult result = connector.testConnection();

    assertThat(result.success()).isFalse();
    assertThat(result.message()).containsIgnoringCase("not configured");
  }

  @Test
  void testConnection_withBaseUrl_succeedsWithoutHttp() {
    RestConnector connector = new RestConnector();
    connector.configure(
        new ConnectorContext("t1", "c1", null, null, null),
        new ConnectorConfig(Map.of("baseUrl", "http://localhost:8089"), Map.of()));

    ConnectionTestResult result = connector.testConnection();

    assertThat(result.success()).isTrue();
    assertThat(result.message()).contains("W1-US06");
  }
}
