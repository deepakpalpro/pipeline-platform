package com.pipelineplatform.api.pipeline;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

public record PipelineResponse(
    String id,
    String tenantId,
    String name,
    String description,
    PipelineVisibility visibility,
    @JsonProperty("execution_mode") PipelineExecutionMode executionMode,
    int version,
    PipelineStatus status,
    @JsonProperty("created_at") Instant createdAt,
    @JsonProperty("updated_at") Instant updatedAt,
    List<Object> steps) {

  static PipelineResponse from(Pipeline entity) {
    return new PipelineResponse(
        entity.getId(),
        entity.getTenantId(),
        entity.getName(),
        entity.getDescription(),
        entity.getVisibility(),
        entity.getExecutionMode(),
        entity.getVersion(),
        entity.getStatus(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        List.of());
  }
}
