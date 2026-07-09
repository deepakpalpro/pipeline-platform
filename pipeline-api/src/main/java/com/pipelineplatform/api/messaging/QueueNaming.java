package com.pipelineplatform.api.messaging;

/**
 * Tenant-prefixed RabbitMQ names shared by pipeline stages (W2) and webhook ingress (W3).
 *
 * <p>Architecture appendix / §6.1 / §8.2 / §11.5:
 *
 * <pre>
 * Exchange: tenant.{tenantId}.pipeline.{pipelineId}
 * Queue:    tenant.{tenantId}.pipeline.{pipelineId}.stage.{n}.in
 * DLQ:      tenant.{tenantId}.pipeline.{pipelineId}.stage.{n}.dlq
 * RK:       stage.{n}
 * </pre>
 */
public final class QueueNaming {

  private QueueNaming() {}

  public static String pipelineExchange(String tenantId, String pipelineId) {
    requireToken(tenantId, "tenantId");
    requireToken(pipelineId, "pipelineId");
    return "tenant." + tenantId + ".pipeline." + pipelineId;
  }

  public static String stageInputQueue(String tenantId, String pipelineId, int stageOrder) {
    requirePositiveStage(stageOrder);
    return pipelineExchange(tenantId, pipelineId) + ".stage." + stageOrder + ".in";
  }

  public static String stageDlq(String tenantId, String pipelineId, int stageOrder) {
    requirePositiveStage(stageOrder);
    return pipelineExchange(tenantId, pipelineId) + ".stage." + stageOrder + ".dlq";
  }

  /** Output of stage N is the input queue of stage N+1 (last stage has no platform output). */
  public static String stageOutputQueue(String tenantId, String pipelineId, int stageOrder) {
    requirePositiveStage(stageOrder);
    return stageInputQueue(tenantId, pipelineId, stageOrder + 1);
  }

  public static String stageRoutingKey(int stageOrder) {
    requirePositiveStage(stageOrder);
    return "stage." + stageOrder;
  }

  /** Dead-letter exchange for a pipeline (architecture §8.2). */
  public static String deadLetterExchange(String tenantId, String pipelineId) {
    return pipelineExchange(tenantId, pipelineId) + ".dlx";
  }

  public static String stageDlqRoutingKey(int stageOrder) {
    requirePositiveStage(stageOrder);
    return "stage." + stageOrder + ".dlq";
  }

  /** W3 webhook exchange — declared here so ingress reuses the same prefix rules. */
  public static String webhookExchange(String tenantId) {
    requireToken(tenantId, "tenantId");
    return "tenant." + tenantId + ".webhook";
  }

  public static String webhookInputQueue(String tenantId, String connectorId) {
    requireToken(tenantId, "tenantId");
    requireToken(connectorId, "connectorId");
    return webhookExchange(tenantId) + "." + connectorId + ".in";
  }

  public static String webhookDlq(String tenantId, String connectorId) {
    requireToken(tenantId, "tenantId");
    requireToken(connectorId, "connectorId");
    return webhookExchange(tenantId) + "." + connectorId + ".dlq";
  }

  private static void requireToken(String value, String name) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(name + " is required");
    }
    if (value.contains(".") || value.contains(" ") || value.contains("/")) {
      throw new IllegalArgumentException(name + " must not contain '.', ' ', or '/'");
    }
  }

  private static void requirePositiveStage(int stageOrder) {
    if (stageOrder < 1) {
      throw new IllegalArgumentException("stageOrder must be >= 1");
    }
  }
}
