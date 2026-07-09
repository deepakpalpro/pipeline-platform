package com.pipelineplatform.api.connector;

public enum ConnectorKind {
  rest,
  grpc,
  event_listener,
  message_bus,
  db,
  storage
}
