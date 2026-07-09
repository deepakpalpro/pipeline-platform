package com.pipelineplatform.api.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * Emits pipelet runtime metrics (architecture §7.1). Wave 4 labels are low-cardinality: {@code
 * tenant_id}, {@code pipeline_id}, {@code pipelet_id}. {@code execution_id} is intentionally
 * omitted from these series to avoid unbounded Prometheus cardinality.
 */
@Component
public class PipeletMetricsEmitter {

  public static final String RECORDS_IN = "pipelet_records_in_total";
  public static final String RECORDS_OUT = "pipelet_records_out_total";
  public static final String PROCESSING_DURATION = "pipelet_processing_duration_seconds";

  public static final String TAG_TENANT = "tenant_id";
  public static final String TAG_PIPELINE = "pipeline_id";
  public static final String TAG_PIPELET = "pipelet_id";

  private final MeterRegistry meterRegistry;

  public PipeletMetricsEmitter(MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
  }

  public void recordIn(String tenantId, String pipelineId, String pipeletId, long count) {
    if (count <= 0) {
      return;
    }
    counter(RECORDS_IN, tenantId, pipelineId, pipeletId).increment(count);
  }

  public void recordOut(String tenantId, String pipelineId, String pipeletId, long count) {
    if (count <= 0) {
      return;
    }
    counter(RECORDS_OUT, tenantId, pipelineId, pipeletId).increment(count);
  }

  public void recordProcessing(
      String tenantId, String pipelineId, String pipeletId, Duration duration) {
    if (duration == null || duration.isNegative()) {
      return;
    }
    timer(tenantId, pipelineId, pipeletId).record(duration);
  }

  /**
   * Convenience for stub/local processing: one batch with matching in/out and a measured duration.
   */
  public void recordBatch(
      String tenantId,
      String pipelineId,
      String pipeletId,
      long recordsIn,
      long recordsOut,
      Duration duration) {
    recordIn(tenantId, pipelineId, pipeletId, recordsIn);
    recordOut(tenantId, pipelineId, pipeletId, recordsOut);
    recordProcessing(tenantId, pipelineId, pipeletId, duration);
  }

  private Counter counter(String name, String tenantId, String pipelineId, String pipeletId) {
    return Counter.builder(name)
        .tag(TAG_TENANT, nullToUnknown(tenantId))
        .tag(TAG_PIPELINE, nullToUnknown(pipelineId))
        .tag(TAG_PIPELET, nullToUnknown(pipeletId))
        .register(meterRegistry);
  }

  private Timer timer(String tenantId, String pipelineId, String pipeletId) {
    return Timer.builder(PROCESSING_DURATION)
        .tag(TAG_TENANT, nullToUnknown(tenantId))
        .tag(TAG_PIPELINE, nullToUnknown(pipelineId))
        .tag(TAG_PIPELET, nullToUnknown(pipeletId))
        .register(meterRegistry);
  }

  private static String nullToUnknown(String value) {
    return value == null || value.isBlank() ? "unknown" : value;
  }
}
