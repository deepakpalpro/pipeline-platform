package com.pipelineplatform.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServiceTypeService {

  public static final String AUTH_TYPE_ID = "st-auth";
  public static final String STUB_AUTH_VENDOR = "StubAuth";

  private final ServiceTypeRepository serviceTypeRepository;
  private final ObjectMapper objectMapper;

  public ServiceTypeService(ServiceTypeRepository serviceTypeRepository, ObjectMapper objectMapper) {
    this.serviceTypeRepository = serviceTypeRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional(readOnly = true)
  public List<ServiceTypeResponse> listCatalog() {
    return serviceTypeRepository.findAllWithDefaults().stream()
        .map(st -> ServiceTypeResponse.from(st, objectMapper))
        .toList();
  }

  @Transactional(readOnly = true)
  public boolean hasAuthStubVendor() {
    return serviceTypeRepository.findAllWithDefaults().stream()
        .filter(st -> st.getType() == ServiceKind.auth)
        .flatMap(st -> st.getDefaults().stream())
        .anyMatch(d -> STUB_AUTH_VENDOR.equals(d.getVendor()));
  }
}