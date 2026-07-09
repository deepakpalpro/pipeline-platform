package com.pipelineplatform.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.pipelineplatform")
public class PipelineApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(PipelineApiApplication.class, args);
  }
}
