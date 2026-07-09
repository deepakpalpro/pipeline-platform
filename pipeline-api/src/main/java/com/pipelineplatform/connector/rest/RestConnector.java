package com.pipelineplatform.connector.rest;

import com.pipelineplatform.connector.spi.ConnectionTestResult;
import com.pipelineplatform.connector.spi.Connector;
import com.pipelineplatform.connector.spi.ConnectorConfig;
import com.pipelineplatform.connector.spi.ConnectorContext;
import com.pipelineplatform.connector.spi.ConnectorRequest;
import com.pipelineplatform.connector.spi.ConnectorResponse;
import org.springframework.stereotype.Component;

/**
 * Built-in REST connector (architecture §9.5). W1-US05 registers the plugin and validates config
 * presence; W1-US06 adds a real HTTP probe against WireMock.
 */
@Component
public class RestConnector implements Connector {

  public static final String TYPE = "rest";
  public static final String SPI_VERSION = "1.0";

  private ConnectorContext context;
  private ConnectorConfig config;

  @Override
  public String getType() {
    return TYPE;
  }

  @Override
  public String getSpiVersion() {
    return SPI_VERSION;
  }

  @Override
  public void configure(ConnectorContext context, ConnectorConfig config) {
    this.context = context;
    this.config = config;
  }

  @Override
  public ConnectionTestResult testConnection() {
    if (config == null || config.properties().isEmpty()) {
      return ConnectionTestResult.failed("Connector is not configured");
    }
    Object baseUrl = config.properties().get("baseUrl");
    if (baseUrl == null || baseUrl.toString().isBlank()) {
      return ConnectionTestResult.failed("Missing required property: baseUrl");
    }
    // HTTP probe deferred to W1-US06 (WireMock).
    return ConnectionTestResult.ok(0, "configured (HTTP probe deferred to W1-US06)");
  }

  @Override
  public ConnectorResponse read(ConnectorRequest request) {
    return ConnectorResponse.failure("read not implemented until W1-US06");
  }

  @Override
  public ConnectorResponse write(ConnectorRequest request) {
    return ConnectorResponse.failure("write not implemented until W1-US06");
  }

  @Override
  public void close() {
    this.context = null;
    this.config = null;
  }
}
