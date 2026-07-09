import { http, HttpResponse } from 'msw'
import { redactConfig } from '../api/secrets'
import type {
  ConnectorType,
  CreateConnectorRequest,
  CreatePipelineRequest,
  CreateTenantServiceRequest,
  PipelineResponse,
  ReplacePipelineStepsRequest,
  ServiceType,
  TenantConnector,
  TenantService,
  UpdateTenantServiceRequest,
} from '../api/types'

function tenantId(request: Request): string {
  return request.headers.get('X-Tenant-Id') ?? 'T001'
}

function nowIso() {
  return new Date().toISOString()
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export const CONNECTOR_TYPES: ConnectorType[] = [
  {
    id: 'ctype-rest',
    type: 'REST',
    displayName: 'REST',
    configSchema: {
      type: 'object',
      required: ['baseUrl'],
      properties: {
        baseUrl: { type: 'string' },
        api_key: { type: 'string' },
      },
    },
    spiClass: 'com.pipelineplatform.connector.rest.RestConnector',
    spiVersion: '1.0',
  },
]

export const SERVICE_TYPES: ServiceType[] = [
  { id: 'stype-auth', type: 'AUTH', displayName: 'Auth' },
  { id: 'stype-storage', type: 'STORAGE', displayName: 'Storage' },
]

/** Mutable fixture store — reset between tests via `resetMockDb()`. */
export const mockDb = {
  connectors: [] as TenantConnector[],
  services: [] as TenantService[],
  pipelines: [] as PipelineResponse[],
  /** Last PUT steps body — asserted by save tests. */
  lastStepsPut: null as ReplacePipelineStepsRequest | null,
}

export function resetMockDb() {
  mockDb.pipelines = []
  mockDb.lastStepsPut = null
  mockDb.connectors = [
    {
      id: 'conn-1',
      tenantId: 'T001',
      connectorTypeId: 'ctype-rest',
      name: 'Orders API',
      config: redactConfig({
        baseUrl: 'https://orders.example.com',
        api_key: 'super-secret-key',
      }),
      status: 'ACTIVE',
      lastTestedAt: null,
      createdAt: '2026-07-01T00:00:00Z',
    },
  ]
  mockDb.services = [
    {
      id: 'svc-1',
      tenantId: 'T001',
      serviceTypeId: 'stype-auth',
      vendor: 'StubAuth',
      name: 'Primary Auth',
      config: redactConfig({
        client_id: 'public-client',
        client_secret: 'raw-secret-must-not-leak',
      }),
      inheritsDefault: false,
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
    },
  ]
}

resetMockDb()

export const connectorHandlers = [
  http.get('/api/v1/connector-types', () =>
    HttpResponse.json(CONNECTOR_TYPES),
  ),

  http.get('/api/v1/connectors', ({ request }) => {
    const tid = tenantId(request)
    return HttpResponse.json(
      mockDb.connectors.filter((c) => c.tenantId === tid),
    )
  }),

  http.get('/api/v1/connectors/:id', ({ params, request }) => {
    const tid = tenantId(request)
    const row = mockDb.connectors.find(
      (c) => c.id === params.id && c.tenantId === tid,
    )
    if (!row) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({
      ...row,
      config: redactConfig(row.config),
    })
  }),

  http.post('/api/v1/connectors', async ({ request }) => {
    const tid = tenantId(request)
    const body = (await request.json()) as CreateConnectorRequest
    if (!body.connectorTypeId || !body.name?.trim()) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 400 })
    }
    const created: TenantConnector = {
      id: id('conn'),
      tenantId: tid,
      connectorTypeId: body.connectorTypeId,
      name: body.name.trim(),
      config: redactConfig(body.config ?? {}),
      status: 'ACTIVE',
      lastTestedAt: null,
      createdAt: nowIso(),
    }
    mockDb.connectors.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),
]

export const serviceHandlers = [
  http.get('/api/v1/service-types', () => HttpResponse.json(SERVICE_TYPES)),

  http.get('/api/v1/services', ({ request }) => {
    const tid = tenantId(request)
    return HttpResponse.json(
      mockDb.services
        .filter((s) => s.tenantId === tid)
        .map((s) => ({ ...s, config: redactConfig(s.config) })),
    )
  }),

  http.get('/api/v1/services/:id', ({ params, request }) => {
    const tid = tenantId(request)
    const row = mockDb.services.find(
      (s) => s.id === params.id && s.tenantId === tid,
    )
    if (!row) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({
      ...row,
      config: redactConfig(row.config),
    })
  }),

  http.post('/api/v1/services', async ({ request }) => {
    const tid = tenantId(request)
    const body = (await request.json()) as CreateTenantServiceRequest
    if (!body.serviceTypeId || !body.vendor?.trim() || !body.name?.trim()) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 400 })
    }
    const created: TenantService = {
      id: id('svc'),
      tenantId: tid,
      serviceTypeId: body.serviceTypeId,
      vendor: body.vendor.trim(),
      name: body.name.trim(),
      config: redactConfig(body.tenantConfig ?? {}),
      inheritsDefault: body.inheritsDefault ?? false,
      status: 'ACTIVE',
      createdAt: nowIso(),
    }
    mockDb.services.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('/api/v1/services/:id', async ({ params, request }) => {
    const tid = tenantId(request)
    const idx = mockDb.services.findIndex(
      (s) => s.id === params.id && s.tenantId === tid,
    )
    if (idx < 0) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as UpdateTenantServiceRequest
    const prev = mockDb.services[idx]
    const updated: TenantService = {
      ...prev,
      name: body.name,
      config: body.tenantConfig
        ? redactConfig(body.tenantConfig)
        : prev.config,
      inheritsDefault: body.inheritsDefault ?? prev.inheritsDefault,
      status: body.status ?? prev.status,
    }
    mockDb.services[idx] = updated
    return HttpResponse.json({
      ...updated,
      config: redactConfig(updated.config),
    })
  }),
]

export const pipeletHandlers = [
  http.get('/api/v1/pipelets', async () => {
    const { PIPELET_FIXTURE } = await import('../features/pipelets/fixture')
    return HttpResponse.json(PIPELET_FIXTURE)
  }),

  http.post('/api/v1/pipelets/register', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: `plet-registered-${Date.now()}`, ...(body as object) },
      { status: 201 },
    )
  }),
]

export const pipelineHandlers = [
  http.get('/api/v1/pipelines', ({ request }) => {
    const tid = tenantId(request)
    return HttpResponse.json(
      mockDb.pipelines.filter((p) => p.tenantId === tid),
    )
  }),

  http.post('/api/v1/pipelines', async ({ request }) => {
    const tid = tenantId(request)
    const body = (await request.json()) as CreatePipelineRequest
    if (!body.name?.trim()) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 400 })
    }
    const created: PipelineResponse = {
      id: id('pipe'),
      tenantId: tid,
      name: body.name.trim(),
      description: body.description ?? null,
      visibility: body.visibility ?? 'PRIVATE',
      execution_mode: body.executionMode ?? 'ASYNC',
      version: 1,
      status: 'DRAFT',
      created_at: nowIso(),
      updated_at: nowIso(),
      steps: [],
    }
    mockDb.pipelines.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('/api/v1/pipelines/:id/steps', async ({ params, request }) => {
    const tid = tenantId(request)
    const idx = mockDb.pipelines.findIndex(
      (p) => p.id === params.id && p.tenantId === tid,
    )
    if (idx < 0) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as ReplacePipelineStepsRequest
    mockDb.lastStepsPut = body
    const updated: PipelineResponse = {
      ...mockDb.pipelines[idx],
      version: mockDb.pipelines[idx].version + 1,
      updated_at: nowIso(),
      steps: body.steps,
    }
    mockDb.pipelines[idx] = updated
    return HttpResponse.json(updated)
  }),
]

export const handlers = [
  ...connectorHandlers,
  ...serviceHandlers,
  ...pipeletHandlers,
  ...pipelineHandlers,
]
