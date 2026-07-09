package com.pipelineplatform.api.webhook;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pipelineplatform.api.connector.TenantConnector;
import com.pipelineplatform.api.connector.TenantConnectorRepository;
import com.pipelineplatform.api.k8s.PipeletJobClient;
import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.messaging.WebhookTopology;
import com.pipelineplatform.api.messaging.WebhookTopologyService;
import com.pipelineplatform.api.tenant.Tenant;
import com.pipelineplatform.api.tenant.TenantRepository;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

@ExtendWith(MockitoExtension.class)
class WebhookIngressServiceTest {

  @Mock private TenantRepository tenantRepository;
  @Mock private TenantConnectorRepository connectorRepository;
  @Mock private WebhookTopologyService webhookTopologyService;
  @Mock private RabbitTemplate rabbitTemplate;
  @Mock private PipeletJobClient pipeletJobClient;
  @Mock private WebhookSignatureVerifier signatureVerifier;
  @Mock private WebhookIdempotencyService idempotencyService;

  private WebhookIngressService service;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @BeforeEach
  void setUp() {
    service =
        new WebhookIngressService(
            tenantRepository,
            connectorRepository,
            webhookTopologyService,
            rabbitTemplate,
            pipeletJobClient,
            signatureVerifier,
            idempotencyService,
            objectMapper);
  }

  @Test
  void shouldPublishToTenantQueue_andReturnAccepted() {
    String tenantId = "T001";
    String connectorId = "conn-github-events";
    Tenant tenant = new Tenant();
    tenant.setId(tenantId);
    TenantConnector connector = new TenantConnector();
    connector.setId(connectorId);
    connector.setTenantId(tenantId);
    connector.setConfig("{\"signing_secret\":\"test-secret\"}");

    when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
    when(connectorRepository.findByIdAndTenantId(connectorId, tenantId))
        .thenReturn(Optional.of(connector));
    when(idempotencyService.extractKey(any(), any())).thenReturn("hash:abc");
    when(idempotencyService.findExistingEventId(tenantId, connectorId, "hash:abc"))
        .thenReturn(Optional.empty());
    when(idempotencyService.claim(eq(tenantId), eq(connectorId), eq("hash:abc"), anyString()))
        .thenAnswer(inv -> inv.getArgument(3));
    when(webhookTopologyService.declare(tenantId, connectorId))
        .thenReturn(
            new WebhookTopology(
                tenantId,
                connectorId,
                QueueNaming.webhookExchange(tenantId),
                QueueNaming.webhookInputQueue(tenantId, connectorId),
                QueueNaming.webhookDlq(tenantId, connectorId),
                QueueNaming.webhookRoutingKey(connectorId)));

    byte[] body = "{\"action\":\"opened\"}".getBytes(StandardCharsets.UTF_8);
    WebhookAcceptResponse response =
        service.accept(tenantId, connectorId, body, "sha256=abc", null);

    assertThat(response.accepted()).isTrue();
    assertThat(response.eventId()).isNotBlank();
    assertThat(response.queuedTo())
        .isEqualTo(QueueNaming.webhookInputQueue(tenantId, connectorId));

    verify(signatureVerifier).verifyOrThrow(eq(tenantId), eq(connector), eq(body), eq("sha256=abc"));

    ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
    verify(rabbitTemplate)
        .convertAndSend(
            eq(QueueNaming.webhookExchange(tenantId)),
            eq(QueueNaming.webhookRoutingKey(connectorId)),
            payloadCaptor.capture());
    @SuppressWarnings("unchecked")
    Map<String, Object> envelope = (Map<String, Object>) payloadCaptor.getValue();
    assertThat(envelope.get("event_id")).isEqualTo(response.eventId());

    verify(pipeletJobClient, never()).create(any());
  }

  @Test
  void unknownConnector_throwsNotFound() {
    when(tenantRepository.findById("T001")).thenReturn(Optional.of(new Tenant()));
    when(connectorRepository.findByIdAndTenantId("missing", "T001")).thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                service.accept(
                    "T001", "missing", "{}".getBytes(StandardCharsets.UTF_8), null, null))
        .isInstanceOf(WebhookTargetNotFoundException.class);

    verify(signatureVerifier, never()).verifyOrThrow(anyString(), any(), any(), any());
    verify(rabbitTemplate, never())
        .convertAndSend(any(String.class), any(String.class), any(Object.class));
  }

  @Test
  void invalidSignature_doesNotPublish() {
    String tenantId = "T001";
    String connectorId = "conn-1";
    TenantConnector connector = new TenantConnector();
    connector.setId(connectorId);
    connector.setTenantId(tenantId);
    connector.setConfig("{\"signing_secret\":\"test-secret\"}");

    when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(new Tenant()));
    when(connectorRepository.findByIdAndTenantId(connectorId, tenantId))
        .thenReturn(Optional.of(connector));
    doThrow(new WebhookSignatureRejectedException("Invalid webhook signature"))
        .when(signatureVerifier)
        .verifyOrThrow(eq(tenantId), eq(connector), any(), any());

    assertThatThrownBy(
            () ->
                service.accept(
                    tenantId,
                    connectorId,
                    "{}".getBytes(StandardCharsets.UTF_8),
                    "sha256=bad",
                    null))
        .isInstanceOf(WebhookSignatureRejectedException.class);

    verify(rabbitTemplate, never())
        .convertAndSend(any(String.class), any(String.class), any(Object.class));
    verify(idempotencyService, never()).claim(anyString(), anyString(), anyString(), anyString());
  }
}
