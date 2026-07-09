package com.pipelineplatform.api.k8s;

/**
 * Request to spawn a pipelet Job for one pipeline stage (architecture §10.3).
 *
 * @param jobName suggested Job metadata name {@code exec-{executionId}-stage-{stageOrder}}
 * @param namespace suggested namespace {@code tenant-{tenantId}}
 */
public record PipeletJobRequest(
    String tenantId,
    String pipelineId,
    String executionId,
    String pipeletId,
    int stageOrder,
    int stageCount,
    String inputQueue,
    String outputQueue,
    String jobName,
    String namespace) {

  public static PipeletJobRequest of(
      String tenantId,
      String pipelineId,
      String executionId,
      String pipeletId,
      int stageOrder,
      int stageCount,
      String inputQueue,
      String outputQueue) {
    String safeExecution = executionId == null ? "unknown" : executionId;
    String safeTenant = tenantId == null ? "unknown" : tenantId;
    return new PipeletJobRequest(
        tenantId,
        pipelineId,
        executionId,
        pipeletId,
        stageOrder,
        stageCount,
        inputQueue,
        outputQueue,
        "exec-" + safeExecution + "-stage-" + stageOrder,
        "tenant-" + safeTenant);
  }
}
