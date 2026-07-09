package com.pipelineplatform.api.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/**
 * Routes poison stage messages to the per-stage DLQ after retries are exhausted (architecture §8.2).
 */
@Service
public class StageDeadLetterService {

  public static final String HEADER_FAILURE_COUNT = "x-pipeline-failure-count";
  public static final String HEADER_ERROR = "x-pipeline-error";

  private final RabbitTemplate rabbitTemplate;

  public StageDeadLetterService(RabbitTemplate rabbitTemplate) {
    this.rabbitTemplate = rabbitTemplate;
  }

  /**
   * Handles a failed stage delivery: republish to the input queue while retries remain, otherwise
   * publish to the stage DLX/DLQ.
   *
   * @return {@code true} if the message was dead-lettered
   */
  public boolean handleFailure(
      String tenantId,
      String pipelineId,
      int stageOrder,
      Object payload,
      int previousFailureCount,
      RetryPolicy policy,
      String errorSummary) {
    int failureCount = previousFailureCount + 1;
    if (policy.shouldRetry(failureCount)) {
      rabbitTemplate.convertAndSend(
          QueueNaming.pipelineExchange(tenantId, pipelineId),
          QueueNaming.stageRoutingKey(stageOrder),
          payload,
          message -> {
            message.getMessageProperties().setHeader(HEADER_FAILURE_COUNT, failureCount);
            message.getMessageProperties().setHeader(HEADER_ERROR, errorSummary);
            return message;
          });
      return false;
    }

    rabbitTemplate.convertAndSend(
        QueueNaming.deadLetterExchange(tenantId, pipelineId),
        QueueNaming.stageDlqRoutingKey(stageOrder),
        payload,
        message -> {
          message.getMessageProperties().setHeader(HEADER_FAILURE_COUNT, failureCount);
          message.getMessageProperties().setHeader(HEADER_ERROR, errorSummary);
          return message;
        });
    return true;
  }
}
