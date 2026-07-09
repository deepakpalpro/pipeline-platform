package com.pipelineplatform.api.pipeline;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record PipelineStepResponse(
    String id,
    @JsonProperty("pipelet_id") String pipeletId,
    @JsonProperty("step_order") int stepOrder,
    JsonNode config,
    @JsonProperty("connector_ids") List<String> connectorIds,
    @JsonProperty("service_ids") List<String> serviceIds,
    @JsonProperty("input_queue") String inputQueue,
    @JsonProperty("output_queue") String outputQueue,
    @JsonProperty("resource_limits") JsonNode resourceLimits) {}
