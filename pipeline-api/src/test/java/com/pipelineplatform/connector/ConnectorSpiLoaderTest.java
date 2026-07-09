package com.pipelineplatform.connector;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.pipelineplatform.api.PipelineApiApplication;
import com.pipelineplatform.connector.rest.RestConnector;
import java.net.Socket;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = PipelineApiApplication.class)
@ActiveProfiles("local")
class ConnectorSpiLoaderTest {

  @BeforeAll
  static void requireComposeMysql() {
    assumeTrue(
        isPortOpen("127.0.0.1", 3306),
        "Compose MySQL is not reachable on localhost:3306 — run: docker compose up -d mysql");
  }

  private static boolean isPortOpen(String host, int port) {
    try (Socket socket = new Socket(host, port)) {
      return true;
    } catch (Exception ex) {
      return false;
    }
  }

  @Autowired private ConnectorRegistry registry;

  @Test
  void loadsRestConnector() {
    assertThat(registry.hasType(RestConnector.TYPE)).isTrue();
    assertThat(registry.findByType(RestConnector.TYPE))
        .isPresent()
        .get()
        .extracting(c -> c.getType(), c -> c.getSpiVersion())
        .containsExactly(RestConnector.TYPE, RestConnector.SPI_VERSION);
  }
}
