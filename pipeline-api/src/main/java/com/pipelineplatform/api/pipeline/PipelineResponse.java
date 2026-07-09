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
    List<PipelineStepResponse> steps) {

  static PipelineResponse from(Pipeline entity) {
    return from(entity, List.of());
  }

  static PipelineResponse from(Pipeline entity, List<PipelineStepResponse> steps) {
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
        steps == null ? List.of() : List.copyOf(steps));
  }
}
