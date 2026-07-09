import { apiFetch } from './apiClient'
import type {
  ConnectorType,
  CreateConnectorRequest,
  CreatePipelineRequest,
  CreateTenantServiceRequest,
  DryRunResponse,
  PipelineExecutionDetail,
  PipelineResponse,
  PipelineRunResponse,
  ReplacePipelineStepsRequest,
  ServiceType,
  TenantConnector,
  TenantService,
  UpdateTenantServiceRequest,
} from './types'
import { ApiError } from './types'

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown = null
    const text = await res.text()
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : text || `HTTP ${res.status}`
    throw new ApiError(res.status, body, message)
  }
  return res.json() as Promise<T>
}

export function listConnectors(tenantId: string) {
  return apiFetch('/api/v1/connectors', tenantId).then((r) =>
    readJson<TenantConnector[]>(r),
  )
}

export function getConnector(tenantId: string, id: string) {
  return apiFetch(`/api/v1/connectors/${id}`, tenantId).then((r) =>
    readJson<TenantConnector>(r),
  )
}

export function createConnector(tenantId: string, body: CreateConnectorRequest) {
  return apiFetch('/api/v1/connectors', tenantId, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => readJson<TenantConnector>(r))
}

export function listConnectorTypes(tenantId: string) {
  return apiFetch('/api/v1/connector-types', tenantId).then((r) =>
    readJson<ConnectorType[]>(r),
  )
}

export function listServices(tenantId: string) {
  return apiFetch('/api/v1/services', tenantId).then((r) =>
    readJson<TenantService[]>(r),
  )
}

export function getService(tenantId: string, id: string) {
  return apiFetch(`/api/v1/services/${id}`, tenantId).then((r) =>
    readJson<TenantService>(r),
  )
}

export function createService(tenantId: string, body: CreateTenantServiceRequest) {
  return apiFetch('/api/v1/services', tenantId, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => readJson<TenantService>(r))
}

export function updateService(
  tenantId: string,
  id: string,
  body: UpdateTenantServiceRequest,
) {
  return apiFetch(`/api/v1/services/${id}`, tenantId, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then((r) => readJson<TenantService>(r))
}

export function listServiceTypes(tenantId: string) {
  return apiFetch('/api/v1/service-types', tenantId).then((r) =>
    readJson<ServiceType[]>(r),
  )
}

export function createPipeline(tenantId: string, body: CreatePipelineRequest) {
  return apiFetch('/api/v1/pipelines', tenantId, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => readJson<PipelineResponse>(r))
}

export function replacePipelineSteps(
  tenantId: string,
  pipelineId: string,
  body: ReplacePipelineStepsRequest,
) {
  return apiFetch(`/api/v1/pipelines/${pipelineId}/steps`, tenantId, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then((r) => readJson<PipelineResponse>(r))
}

export function listPipelines(tenantId: string) {
  return apiFetch('/api/v1/pipelines', tenantId).then((r) =>
    readJson<PipelineResponse[]>(r),
  )
}

export function runPipeline(tenantId: string, pipelineId: string) {
  return apiFetch(`/api/v1/pipelines/${pipelineId}/run`, tenantId, {
    method: 'POST',
  }).then((r) => readJson<PipelineRunResponse>(r))
}

export function dryRunPipeline(tenantId: string, pipelineId: string) {
  return apiFetch(`/api/v1/pipelines/${pipelineId}/dry-run`, tenantId, {
    method: 'POST',
  }).then((r) => readJson<DryRunResponse>(r))
}

export function getPipelineExecution(
  tenantId: string,
  pipelineId: string,
  executionId: string,
) {
  return apiFetch(
    `/api/v1/pipelines/${pipelineId}/executions/${executionId}`,
    tenantId,
  ).then((r) => readJson<PipelineExecutionDetail>(r))
}
