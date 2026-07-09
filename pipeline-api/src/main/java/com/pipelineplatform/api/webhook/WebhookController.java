package com.pipelineplatform.api.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {

  private final WebhookIngressService webhookIngressService;

  public WebhookController(WebhookIngressService webhookIngressService) {
    this.webhookIngressService = webhookIngressService;
  }

  @PostMapping("/{tenantId}/{connectorId}")
  public ResponseEntity<WebhookAcceptResponse> accept(
      @PathVariable String tenantId,
      @PathVariable String connectorId,
      @RequestBody(required = false) JsonNode body) {
    WebhookAcceptResponse response =
        webhookIngressService.accept(tenantId, connectorId, body == null ? nullNode() : body);
    return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
  }

  private static JsonNode nullNode() {
    return com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
  }
}
