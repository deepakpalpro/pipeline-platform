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

export type CreatePipelineRequest = {
  name: string
  description?: string
  visibility?: 'PRIVATE' | 'TENANT'
  executionMode?: 'ASYNC' | 'SYNC'
}

export type PipelineStepPayload = {
  pipelet_id: string
  step_order: number
  config: Record<string, unknown>
  connector_ids: string[]
  service_ids: string[]
  input_queue: string | null
  output_queue: string | null
}

export type ReplacePipelineStepsRequest = {
  steps: PipelineStepPayload[]
}

export type PipelineResponse = {
  id: string
  tenantId: string
  name: string
  description?: string | null
  visibility?: string
  execution_mode?: string
  version: number
  status: string
  created_at?: string
  updated_at?: string
  steps?: unknown[]
}

export type PipelineRunResponse = {
  execution_id: string
  status: string
  pipeline_id: string
  started_at?: string
}

export type ExecutionStepStatusDto = {
  step_order: number
  node_id?: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
}

export type PipelineExecutionDetail = {
  id: string
  pipeline_id: string
  tenant_id?: string
  status: string
  started_at?: string
  completed_at?: string | null
  steps?: ExecutionStepStatusDto[]
}

export type DryRunResponse = {
  valid: boolean
  messages: string[]
}

export type QuotaBlockedBody = {
  error: string
  code: string
  message: string
  credit_balance?: number
  breached_dimension?: string
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}
