package com.pipelineplatform.api.webhook;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pipelineplatform.api.connector.CreateConnectorRequest;
import com.pipelineplatform.api.connector.TenantConnectorResponse;
import com.pipelineplatform.api.k8s.StubPipeletJobClient;
import com.pipelineplatform.api.messaging.QueueNaming;
import com.pipelineplatform.api.tenant.CreateTenantRequest;
import com.pipelineplatform.api.tenant.TenantContextFilter;
import com.pipelineplatform.api.tenant.TenantResponse;
import com.pipelineplatform.api.tenant.TenantStatus;
import java.net.Socket;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

/** W3-US01: public webhook POST → 202 + message on tenant webhook queue; no Job. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
class WebhookControllerIT {

  @BeforeAll
  static void requireComposeDeps() {
    assumeTrue(
        isPortOpen("127.0.0.1", 3306),
        "Compose MySQL is not reachable on localhost:3306 — run: docker compose up -d mysql");
    assumeTrue(
        isPortOpen("127.0.0.1", 5672),
        "Compose RabbitMQ is not reachable on localhost:5672 — run: docker compose up -d rabbitmq");
  }

  private static boolean isPortOpen(String host, int port) {
    try (Socket socket = new Socket(host, port)) {
      return true;
    } catch (Exception ex) {
      return false;
    }
  }

  @Autowired private TestRestTemplate restTemplate;
  @Autowired private RabbitTemplate rabbitTemplate;
  @Autowired private StubPipeletJobClient stubPipeletJobClient;
  @Autowired private ObjectMapper objectMapper;

  @BeforeEach
  void clearJobs() {
    stubPipeletJobClient.clear();
  }

  @Test
  void shouldReturn202_whenQueuePublishSucceeds() throws Exception {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    TenantResponse tenant = createTenant("Webhook " + suffix, "wh-" + suffix);
    String tenantId = tenant.id();

    TenantConnectorResponse connector = createEventListenerConnector(tenantId, "github-" + suffix);
    String connectorId = connector.id();

    Map<String, Object> payload = Map.of("action", "opened", "number", 42);
    ResponseEntity<WebhookAcceptResponse> response =
        restTemplate.exchange(
            "/api/v1/webhooks/" + tenantId + "/" + connectorId,
            HttpMethod.POST,
            new HttpEntity<>(payload, jsonHeaders()),
            WebhookAcceptResponse.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().accepted()).isTrue();
    assertThat(response.getBody().eventId()).isNotBlank();
    assertThat(response.getBody().queuedTo())
        .isEqualTo(QueueNaming.webhookInputQueue(tenantId, connectorId));

    String queue = QueueNaming.webhookInputQueue(tenantId, connectorId);
    Object received = rabbitTemplate.receiveAndConvert(queue, TimeUnit.SECONDS.toMillis(5));
    assertThat(received).isNotNull();

    JsonNode envelope = objectMapper.valueToTree(received);
    assertThat(envelope.get("event_id").asText()).isEqualTo(response.getBody().eventId());
    assertThat(envelope.get("tenant_id").asText()).isEqualTo(tenantId);
    assertThat(envelope.get("connector_id").asText()).isEqualTo(connectorId);
    assertThat(envelope.get("payload").get("action").asText()).isEqualTo("opened");

    assertThat(stubPipeletJobClient.getCreated()).isEmpty();
  }

  @Test
  void unknownConnector_returns404() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    TenantResponse tenant = createTenant("Webhook 404 " + suffix, "wh404-" + suffix);

    ResponseEntity<String> response =
        restTemplate.exchange(
            "/api/v1/webhooks/" + tenant.id() + "/missing-connector",
            HttpMethod.POST,
            new HttpEntity<>(Map.of("x", 1), jsonHeaders()),
            String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  private TenantConnectorResponse createEventListenerConnector(String tenantId, String name) {
    CreateConnectorRequest request =
        new CreateConnectorRequest(
            "ct-event-listener", name, objectMapper.createObjectNode().put("path_hint", "/hooks"));
    ResponseEntity<TenantConnectorResponse> created =
        restTemplate.exchange(
            "/api/v1/connectors",
            HttpMethod.POST,
            new HttpEntity<>(request, jsonTenantHeaders(tenantId)),
            TenantConnectorResponse.class);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(created.getBody()).isNotNull();
    return created.getBody();
  }

  private TenantResponse createTenant(String name, String slug) {
    ResponseEntity<TenantResponse> created =
        restTemplate.postForEntity(
            "/api/v1/tenants",
            new CreateTenantRequest(name, slug, TenantStatus.active),
            TenantResponse.class);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(created.getBody()).isNotNull();
    return created.getBody();
  }

  private static HttpHeaders jsonHeaders() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    return headers;
  }

  private static HttpHeaders jsonTenantHeaders(String tenantId) {
    HttpHeaders headers = jsonHeaders();
    headers.set(TenantContextFilter.TENANT_ID_HEADER, tenantId);
    return headers;
  }
}
