package com.pipelineplatform.api.pipeline;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

/** Stage handoff payload published on RabbitMQ between pipeline stages. */
public record StageMessage(
    @JsonProperty("execution_id") String executionId,
    @JsonProperty("pipeline_id") String pipelineId,
    @JsonProperty("tenant_id") String tenantId,
    @JsonProperty("stage_order") int stageOrder,
    @JsonProperty("stage_count") int stageCount,
    String payload) {}
