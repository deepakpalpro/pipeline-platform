export type ConnectorInstanceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR'

export type TenantConnector = {
  id: string
  tenantId: string
  connectorTypeId: string
  name: string
  config: Record<string, unknown>
  status: ConnectorInstanceStatus
  lastTestedAt: string | null
  createdAt: string
}

export type CreateConnectorRequest = {
  connectorTypeId: string
  name: string
  config: Record<string, unknown>
}

export type ConnectorType = {
  id: string
  type: string
  displayName: string
  configSchema: Record<string, unknown> | null
  spiClass: string
  spiVersion: string
}

export type ServiceInstanceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR'

export type TenantService = {
  id: string
  tenantId: string
  serviceTypeId: string
  vendor: string
  name: string
  config: Record<string, unknown>
  inheritsDefault: boolean
  status: ServiceInstanceStatus
  createdAt: string
}

export type CreateTenantServiceRequest = {
  serviceTypeId: string
  vendor: string
  name: string
  tenantConfig: Record<string, unknown>
  inheritsDefault?: boolean
}

export type UpdateTenantServiceRequest = {
  name: string
  tenantConfig?: Record<string, unknown>
  inheritsDefault?: boolean
  status?: ServiceInstanceStatus
}

export type ServiceType = {
  id: string
  type: string
  displayName: string
}
