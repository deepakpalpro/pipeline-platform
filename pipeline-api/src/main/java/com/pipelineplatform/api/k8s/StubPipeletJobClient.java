package com.pipelineplatform.api.k8s;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * In-process Job client for Wave 2: records create requests without talking to Kubernetes.
 *
 * <p>Swap for a Kind/Fabric8 implementation when a cluster is available (see KB W2-US05).
 */
@Component
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
        "Stub pipelet Job create name={} ns={} tenant={} pipeline={} execution={} stage={}/{} pipelet={}",
        request.jobName(),
        request.namespace(),
        request.tenantId(),
        request.pipelineId(),
        request.executionId(),
        request.stageOrder(),
        request.stageCount(),
        request.pipeletId());
    return PipeletJobHandle.stubbed(request);
  }

  public List<PipeletJobRequest> getCreated() {
    return Collections.unmodifiableList(new ArrayList<>(created));
  }

  public void clear() {
    created.clear();
  }
}
