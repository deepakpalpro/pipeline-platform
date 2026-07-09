package com.pipelineplatform.api.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pipelineplatform.api.connector.TenantConnector;
import com.pipelineplatform.api.connector.TenantConnectorRepository;
import com.pipelineplatform.api.k8s.PipeletJobClient;
import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.messaging.WebhookTopology;
import com.pipelineplatform.api.messaging.WebhookTopologyService;
import com.pipelineplatform.api.tenant.TenantRepository;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WebhookIngressService {

  private final TenantRepository tenantRepository;
  private final TenantConnectorRepository connectorRepository;
  private final WebhookTopologyService webhookTopologyService;
  private final RabbitTemplate rabbitTemplate;
  private final PipeletJobClient pipeletJobClient;
  private final WebhookSignatureVerifier signatureVerifier;
  private final ObjectMapper objectMapper;

  public WebhookIngressService(
      TenantRepository tenantRepository,
      TenantConnectorRepository connectorRepository,
      WebhookTopologyService webhookTopologyService,
      RabbitTemplate rabbitTemplate,
      PipeletJobClient pipeletJobClient,
      WebhookSignatureVerifier signatureVerifier,
      ObjectMapper objectMapper) {
    this.tenantRepository = tenantRepository;
    this.connectorRepository = connectorRepository;
    this.webhookTopologyService = webhookTopologyService;
    this.rabbitTemplate = rabbitTemplate;
    this.pipeletJobClient = pipeletJobClient;
    this.signatureVerifier = signatureVerifier;
    this.objectMapper = objectMapper;
  }

  /**
   * Accept an external webhook: validate tenant+connector, verify HMAC on raw body, declare
   * topology, publish, return 202. Must not start a pipelet Job (W3-US06).
   */
  @Transactional(readOnly = true)
  public WebhookAcceptResponse accept(
      String tenantId, String connectorId, byte[] rawBody, String signatureHeaderValue) {
    if (tenantId == null || tenantId.isBlank() || connectorId == null || connectorId.isBlank()) {
      throw new WebhookTargetNotFoundException(tenantId, connectorId);
    }

    tenantRepository
        .findById(tenantId)
        .orElseThrow(() -> new WebhookTargetNotFoundException(tenantId, connectorId));

    TenantConnector connector =
        connectorRepository
            .findByIdAndTenantId(connectorId, tenantId)
            .orElseThrow(() -> new WebhookTargetNotFoundException(tenantId, connectorId));

    byte[] bodyBytes = rawBody == null ? new byte[0] : rawBody;
    signatureVerifier.verifyOrThrow(tenantId, connector, bodyBytes, signatureHeaderValue);

    JsonNode body = parseBody(bodyBytes);

    WebhookTopology topology =
        webhookTopologyService.declare(connector.getTenantId(), connector.getId());

    String eventId = UUID.randomUUID().toString();
    Map<String, Object> envelope = new LinkedHashMap<>();
    envelope.put("event_id", eventId);
    envelope.put("tenant_id", tenantId);
    envelope.put("connector_id", connectorId);
    envelope.put("payload", body);

    rabbitTemplate.convertAndSend(topology.exchange(), topology.routingKey(), envelope);

    if (pipeletJobClient == null) {
      throw new IllegalStateException("PipeletJobClient bean required");
    }

    return new WebhookAcceptResponse(
        true, eventId, QueueNaming.webhookInputQueue(tenantId, connectorId));
  }

  private JsonNode parseBody(byte[] bodyBytes) {
    if (bodyBytes.length == 0) {
      return objectMapper.createObjectNode();
    }
    try {
      return objectMapper.readTree(bodyBytes);
    } catch (Exception ex) {
      // Non-JSON payloads still queue as UTF-8 text for processors.
      return objectMapper.getNodeFactory().textNode(new String(bodyBytes, StandardCharsets.UTF_8));
    }
  }
}
