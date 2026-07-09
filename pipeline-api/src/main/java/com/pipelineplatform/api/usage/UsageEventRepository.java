package com.pipelineplatform.api.usage;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsageEventRepository extends JpaRepository<UsageEventEntity, String> {

  Optional<UsageEventEntity> findByIdempotencyKey(String idempotencyKey);

  @Query(
      "select e from UsageEventEntity e where e.tenantId = :tenantId order by e.recordedAt desc")
  List<UsageEventEntity> findByTenantIdOrderByRecordedAtDesc(@Param("tenantId") String tenantId);

  long countByTenantId(String tenantId);
}
