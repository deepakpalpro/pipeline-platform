package com.pipelineplatform.api.k8s;

import io.fabric8.kubernetes.api.model.Namespace;
import io.fabric8.kubernetes.api.model.NamespaceBuilder;
import io.fabric8.kubernetes.api.model.batch.v1.Job;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Fabric8 {@link PipeletJobClient} for Rancher Desktop / Kind / any kubeconfig cluster.
 *
 * <p>Enable with {@code pipeline.k8s.enabled=true} (and typically {@code
 * pipeline.orchestration.stub-stage-worker=false} for real queue-mode I/O).
 */
@Component
@ConditionalOnProperty(prefix = "pipeline.k8s", name = "enabled", havingValue = "true")
public class Fabric8PipeletJobClient implements PipeletJobClient {

  private static final Logger log = LoggerFactory.getLogger(Fabric8PipeletJobClient.class);

  private final KubernetesClient kubernetesClient;
  private final PipeletK8sProperties properties;

  public Fabric8PipeletJobClient(KubernetesClient kubernetesClient, PipeletK8sProperties properties) {
    this.kubernetesClient = kubernetesClient;
    this.properties = properties;
  }

  @Override
  public PipeletJobHandle create(PipeletJobRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("PipeletJobRequest is required");
    }

    Job job = PipeletJobManifestFactory.build(request, properties);
    String namespace = job.getMetadata().getNamespace();
    String jobName = job.getMetadata().getName();

    ensureNamespace(namespace, request.tenantId());

    try {
      Job existing =
          kubernetesClient.batch().v1().jobs().inNamespace(namespace).withName(jobName).get();
      if (existing != null) {
        log.info(
            "Pipelet Job already exists name={} ns={} — deleting before recreate",
            jobName,
            namespace);
        kubernetesClient.batch().v1().jobs().inNamespace(namespace).withName(jobName).withPropagationPolicy(io.fabric8.kubernetes.api.model.DeletionPropagation.BACKGROUND).delete();
        waitUntilJobGone(namespace, jobName);
      }

      Job created = kubernetesClient.batch().v1().jobs().inNamespace(namespace).resource(job).create();
      log.info(
          "Created pipelet Job name={} ns={} image={} pipelet={} stage={}/{} ioMode={}",
          jobName,
          namespace,
          properties.resolveImage(request.pipeletId()),
          request.pipeletId(),
          request.stageOrder(),
          request.stageCount(),
          request.ioMode());
      return new PipeletJobHandle(jobName, namespace, "created");
    } catch (KubernetesClientException ex) {
      log.error(
          "Failed to create pipelet Job name={} ns={}: {}",
          jobName,
          namespace,
          ex.getMessage());
      throw new IllegalStateException(
          "Failed to create Kubernetes Job " + jobName + " in " + namespace + ": " + ex.getMessage(),
          ex);
    }
  }

  private void waitUntilJobGone(String namespace, String jobName) {
    long deadline = System.currentTimeMillis() + 30_000L;
    while (System.currentTimeMillis() < deadline) {
      Job current =
          kubernetesClient.batch().v1().jobs().inNamespace(namespace).withName(jobName).get();
      if (current == null) {
        return;
      }
      try {
        Thread.sleep(250L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        return;
      }
    }
    throw new IllegalStateException(
        "Timed out waiting for Job deletion: " + namespace + "/" + jobName);
  }

  private void ensureNamespace(String namespace, String tenantId) {
    if (!properties.isCreateNamespace()) {
      return;
    }
    Namespace existing = kubernetesClient.namespaces().withName(namespace).get();
    if (existing != null) {
      return;
    }
    Namespace ns =
        new NamespaceBuilder()
            .withNewMetadata()
            .withName(namespace)
            .addToLabels("pipeline.platform/tenant", tenantId == null ? "" : tenantId)
            .endMetadata()
            .build();
    kubernetesClient.namespaces().resource(ns).create();
    log.info("Created tenant namespace {}", namespace);
  }
}
