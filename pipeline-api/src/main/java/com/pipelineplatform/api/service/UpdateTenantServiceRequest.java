package com.pipelineplatform.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateTenantServiceRequest(
    @NotBlank @Size(max = 255) String name,
    JsonNode tenantConfig,
    Boolean inheritsDefault,
    ServiceInstanceStatus status) {}
