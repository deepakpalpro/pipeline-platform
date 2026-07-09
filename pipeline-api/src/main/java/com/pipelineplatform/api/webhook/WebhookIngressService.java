package com.pipelineplatform.api.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.pipelineplatform.api.connector.TenantConnector;
import com.pipelineplatform.api.connector.TenantConnectorRepository;
import com.pipelineplatform.api.k8s.PipeletJobClient;
import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.messaging.WebhookTopology;
import com.pipelineplatform.api.messaging.WebhookTopologyService;
import com.pipelineplatform.api.tenant.TenantRepository;
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

  public WebhookIngressService(
      TenantRepository tenantRepository,
      TenantConnectorRepository connectorRepository,
      WebhookTopologyService webhookTopologyService,
      RabbitTemplate rabbitTemplate,
      PipeletJobClient pipeletJobClient) {
    this.tenantRepository = tenantRepository;
    this.connectorRepository = connectorRepository;
    this.webhookTopologyService = webhookTopologyService;
    this.rabbitTemplate = rabbitTemplate;
    this.pipeletJobClient = pipeletJobClient;
  }

  /**
   * Accept an external webhook: validate tenant+connector, declare topology, publish, return 202
   * payload. Must not start a pipelet Job (W3-US06).
   */
  @Transactional(readOnly = true)
  public WebhookAcceptResponse accept(String tenantId, String connectorId, JsonNode body) {
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

    WebhookTopology topology =
        webhookTopologyService.declare(connector.getTenantId(), connector.getId());

    String eventId = UUID.randomUUID().toString();
    Map<String, Object> envelope = new LinkedHashMap<>();
    envelope.put("event_id", eventId);
    envelope.put("tenant_id", tenantId);
    envelope.put("connector_id", connectorId);
    envelope.put("payload", body);

    rabbitTemplate.convertAndSend(topology.exchange(), topology.routingKey(), envelope);

    // Explicit non-use: US01 must not cold-start processing Jobs.
    if (pipeletJobClient == null) {
      throw new IllegalStateException("PipeletJobClient bean required");
    }

    return new WebhookAcceptResponse(
        true, eventId, QueueNaming.webhookInputQueue(tenantId, connectorId));
  }
}
