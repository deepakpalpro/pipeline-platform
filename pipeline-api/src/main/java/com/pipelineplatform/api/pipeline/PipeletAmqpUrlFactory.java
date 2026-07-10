package com.pipelineplatform.api.pipeline;

import org.springframework.boot.autoconfigure.amqp.RabbitProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class PipeletAmqpUrlFactory {

  private final RabbitProperties rabbitProperties;
  private final PipelineOrchestrationProperties orchestrationProperties;

  public PipeletAmqpUrlFactory(
      RabbitProperties rabbitProperties, PipelineOrchestrationProperties orchestrationProperties) {
    this.rabbitProperties = rabbitProperties;
    this.orchestrationProperties = orchestrationProperties;
  }

  public String resolve() {
    if (StringUtils.hasText(orchestrationProperties.getAmqpUrl())) {
      return orchestrationProperties.getAmqpUrl().trim();
    }
    String host = rabbitProperties.getHost() == null ? "localhost" : rabbitProperties.getHost();
    int port = rabbitProperties.getPort();
    String user =
        rabbitProperties.getUsername() == null ? "guest" : rabbitProperties.getUsername();
    String pass =
        rabbitProperties.getPassword() == null ? "guest" : rabbitProperties.getPassword();
    String vhost = rabbitProperties.getVirtualHost();
    if (vhost == null || vhost.isBlank() || "/".equals(vhost)) {
      return "amqp://" + user + ":" + pass + "@" + host + ":" + port + "/";
    }
    String encodedVhost = vhost.startsWith("/") ? vhost.substring(1) : vhost;
    return "amqp://" + user + ":" + pass + "@" + host + ":" + port + "/" + encodedVhost;
  }
}
