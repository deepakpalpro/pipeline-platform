package com.pipelineplatform.api.pipeline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePipelineRequest(
    @NotBlank @Size(max = 255) String name,
    String description,
    PipelineVisibility visibility,
    PipelineExecutionMode executionMode) {}
