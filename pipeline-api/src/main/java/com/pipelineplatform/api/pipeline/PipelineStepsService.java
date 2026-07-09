package com.pipelineplatform.api.pipeline;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pipelineplatform.api.tenant.TenantContext;
import com.pipelineplatform.api.tenant.TenantContextRequiredException;
import com.pipelineplatform.api.tenant.TenantFilters;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PipelineStepsService {

  private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

  private final PipelineRepository pipelineRepository;
  private final PipelineStepRepository pipelineStepRepository;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;

  public PipelineStepsService(
      PipelineRepository pipelineRepository,
      PipelineStepRepository pipelineStepRepository,
      EntityManager entityManager,
      ObjectMapper objectMapper) {
    this.pipelineRepository = pipelineRepository;
    this.pipelineStepRepository = pipelineStepRepository;
    this.entityManager = entityManager;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public PipelineResponse replace(String pipelineId, ReplacePipelineStepsRequest request) {
    String tenantId = requireTenantId();
    enableTenantFilter(tenantId);

    Pipeline pipeline =
        pipelineRepository
            .findFilteredById(pipelineId)
            .orElseThrow(() -> new PipelineNotFoundException(pipelineId));

    List<PipelineStepRequest> steps = request.steps();
    validateStepOrders(steps);

    pipelineStepRepository.deleteByPipelineId(pipelineId);

    List<PipelineStepRequest> ordered =
        steps.stream()
            .sorted(java.util.Comparator.comparingInt(PipelineStepRequest::stepOrder))
            .toList();

    List<PipelineStep> saved = new ArrayList<>();
    for (PipelineStepRequest stepRequest : ordered) {
      PipelineStep step = new PipelineStep();
      step.setId(UUID.randomUUID().toString());
      step.setPipelineId(pipelineId);
      step.setPipeletId(stepRequest.pipeletId().trim());
      step.setStepOrder(stepRequest.stepOrder());
      step.setConfig(writeJson(stepRequest.config()));
      step.setConnectorIds(writeStringList(stepRequest.connectorIds()));
      step.setServiceIds(writeStringList(stepRequest.serviceIds()));
      step.setInputQueue(blankToNull(stepRequest.inputQueue()));
      step.setOutputQueue(blankToNull(stepRequest.outputQueue()));
      step.setResourceLimits(writeJson(stepRequest.resourceLimits()));
      saved.add(pipelineStepRepository.save(step));
    }

    pipeline.setVersion(pipeline.getVersion() + 1);
    pipelineRepository.save(pipeline);

    return PipelineResponse.from(pipeline, toResponses(saved));
  }

  List<PipelineStepResponse> loadSteps(String pipelineId) {
    return toResponses(pipelineStepRepository.findByPipelineIdOrdered(pipelineId));
  }

  private void validateStepOrders(List<PipelineStepRequest> steps) {
    Set<Integer> seen = new HashSet<>();
    for (PipelineStepRequest step : steps) {
      if (!seen.add(step.stepOrder())) {
        throw new PipelineValidationException("Duplicate step_order: " + step.stepOrder());
      }
    }
  }

  private List<PipelineStepResponse> toResponses(List<PipelineStep> steps) {
    return steps.stream().map(this::toResponse).toList();
  }

  private PipelineStepResponse toResponse(PipelineStep step) {
    return new PipelineStepResponse(
        step.getId(),
        step.getPipeletId(),
        step.getStepOrder(),
        readJson(step.getConfig()),
        readStringList(step.getConnectorIds()),
        readStringList(step.getServiceIds()),
        step.getInputQueue(),
        step.getOutputQueue(),
        readJson(step.getResourceLimits()));
  }

  private String writeJson(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(node);
    } catch (JsonProcessingException ex) {
      throw new PipelineValidationException("Invalid JSON payload");
    }
  }

  private String writeStringList(List<String> values) {
    List<String> safe = values == null ? List.of() : values;
    try {
      return objectMapper.writeValueAsString(safe);
    } catch (JsonProcessingException ex) {
      throw new PipelineValidationException("Invalid id list payload");
    }
  }

  private JsonNode readJson(String json) {
    if (json == null || json.isBlank()) {
      return null;
    }
    try {
      return objectMapper.readTree(json);
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Corrupt JSON in pipeline_steps", ex);
    }
  }

  private List<String> readStringList(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(json, STRING_LIST);
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Corrupt JSON array in pipeline_steps", ex);
    }
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private static String requireTenantId() {
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new TenantContextRequiredException();
    }
    return tenantId;
  }

  private void enableTenantFilter(String tenantId) {
    Session session = entityManager.unwrap(Session.class);
    var filter = session.getEnabledFilter(TenantFilters.NAME);
    if (filter == null) {
      filter = session.enableFilter(TenantFilters.NAME);
    }
    filter.setParameter(TenantFilters.PARAM_TENANT_ID, tenantId);
  }
}
