package com.pipelineplatform.api.k8s;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * In-process Job client: records create requests without talking to Kubernetes.
 *
 * <p>Active when {@code pipeline.k8s.enabled} is false or unset. Swap to {@link
 * Fabric8PipeletJobClient} with {@code pipeline.k8s.enabled=true}.
 */
@Component
@ConditionalOnProperty(
    prefix = "pipeline.k8s",
    name = "enabled",
    havingValue = "false",
    matchIfMissing = true)
public class StubPipeletJobClient implements PipeletJobClient {

  private static final Logger log = LoggerFactory.getLogger(StubPipeletJobClient.class);

  private final List<PipeletJobRequest> created = new CopyOnWriteArrayList<>();

  @Override
  public PipeletJobHandle create(PipeletJobRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("PipeletJobRequest is required");
    }
    created.add(request);
    log.info(
        "Stub pipelet Job create name={} ns={} tenant={} pipeline={} execution={} stage={}/{} pipelet={} ioMode={} inputQueue={} outputQueue={} amqpUrl={}",
        request.jobName(),
        request.namespace(),
        request.tenantId(),
        request.pipelineId(),
        request.executionId(),
        request.stageOrder(),
        request.stageCount(),
        request.pipeletId(),
        request.ioMode(),
        request.inputQueue(),
        request.outputQueue(),
        request.amqpUrl());
    return PipeletJobHandle.stubbed(request);
  }

  public List<PipeletJobRequest> getCreated() {
    return Collections.unmodifiableList(new ArrayList<>(created));
  }

  public void clear() {
    created.clear();
  }
}
