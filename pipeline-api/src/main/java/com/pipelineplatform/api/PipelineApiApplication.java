package com.pipelineplatform.api;

import com.pipelineplatform.api.config.IngressProperties;
import com.pipelineplatform.api.config.WebhookQueueTriggerProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = "com.pipelineplatform")
@EnableConfigurationProperties({IngressProperties.class, WebhookQueueTriggerProperties.class})
public class PipelineApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(PipelineApiApplication.class, args);
  }
}
