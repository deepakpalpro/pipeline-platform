import { apiFetch } from './apiClient'
import type {
  ConnectorType,
  CreateConnectorRequest,
  CreateTenantServiceRequest,
  ServiceType,
  TenantConnector,
  TenantService,
  UpdateTenantServiceRequest,
} from './types'

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
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
