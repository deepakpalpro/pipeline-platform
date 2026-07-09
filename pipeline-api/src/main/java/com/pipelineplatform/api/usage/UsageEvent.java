package com.pipelineplatform.api.usage;

import java.time.Instant;

/**
 * Usage / billing dimension event (architecture §6.2 / §11.7). Wave 3 emits from webhook ingress;
 * Wave 5 collector persists / aggregates.
 */
public record UsageEvent(
    String dimension,
    double amount,
    String tenantId,
    String connectorId,
    Instant occurredAt) {

  public static final String WEBHOOK_EVENTS = "platform.webhook_events";
  public static final String BYTES_IN = "data.bytes_in";
}
