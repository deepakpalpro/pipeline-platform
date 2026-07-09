package com.pipelineplatform.api.connector;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateConnectorRequest(
    @NotBlank @Size(max = 255) String name,
    JsonNode config,
    ConnectorInstanceStatus status) {}
