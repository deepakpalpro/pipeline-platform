package com.pipelineplatform.api.k8s;

/**
 * Creates ephemeral pipelet work units (architecture §10.3 Jobs).
 *
 * <p>Local/default: {@link StubPipeletJobClient}. Optional Kind/cluster impl can replace this bean.
 */
public interface PipeletJobClient {

  PipeletJobHandle create(PipeletJobRequest request);
}
