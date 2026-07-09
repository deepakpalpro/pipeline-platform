package com.pipelineplatform.api.connector;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record TenantConnectorResponse(
    String id,
    String tenantId,
    String connectorTypeId,
    String name,
    JsonNode config,
    ConnectorInstanceStatus status,
    Instant lastTestedAt,
    Instant createdAt) {}
