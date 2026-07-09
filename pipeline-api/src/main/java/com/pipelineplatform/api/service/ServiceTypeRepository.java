package com.pipelineplatform.api.service;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceTypeRepository extends JpaRepository<ServiceType, String> {

  @Query("select distinct st from ServiceType st left join fetch st.defaults order by st.type")
  List<ServiceType> findAllWithDefaults();

  Optional<ServiceType> findByType(ServiceKind type);
}
