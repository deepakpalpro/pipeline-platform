package com.pipelineplatform.api;

import com.pipelineplatform.api.config.IngressProperties;
import com.pipelineplatform.api.config.ObservabilityPortalProperties;
import com.pipelineplatform.api.config.WebhookQueueTriggerProperties;
import com.pipelineplatform.api.config.WebhookRateLimitProperties;
import com.pipelineplatform.api.pipeline.PipelineOrchestrationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = "com.pipelineplatform")
@EnableConfigurationProperties({
  IngressProperties.class,
  ObservabilityPortalProperties.class,
  WebhookQueueTriggerProperties.class,
  WebhookRateLimitProperties.class,
  PipelineOrchestrationProperties.class
})
public class PipelineApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(PipelineApiApplication.class, args);
  }
}
