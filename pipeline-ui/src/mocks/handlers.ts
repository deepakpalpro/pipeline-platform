import { http, HttpResponse } from 'msw'
import { isSecretKey, REDACTED, redactConfig } from '../api/secrets'
import seedAuthServices from '../fixtures/seed-auth-services.json'
import seedConnectors from '../fixtures/seed-connectors.json'
import type {
  ConnectorType,
  CreateConnectorRequest,
  CreatePipelineRequest,
  CreateTenantServiceRequest,
  PipelineExecutionDetail,
  PipelineResponse,
  ReplacePipelineStepsRequest,
  ServiceType,
  TenantConnector,
  TenantService,
  UpdateConnectorRequest,
  UpdatePipelineRequest,
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

function mergePreservingSecrets(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    if (
      isSecretKey(key) &&
      (value === REDACTED || value === '***' || value === '••••••') &&
      key in existing
    ) {
      continue
    }
    out[key] = value
  }
  return out
}

function asConnectorResponse(row: TenantConnector): TenantConnector {
  const execution = row.execution_config ?? row.config ?? {}
  const deployment = row.deployment_config ?? {}
  const redactedExecution = redactConfig(execution)
  return {
    ...row,
    config: redactedExecution,
    execution_config: redactedExecution,
    deployment_config: redactConfig(deployment),
  }
}

function asServiceResponse(row: TenantService): TenantService {
  const execution = row.execution_config ?? row.config ?? {}
  const deployment = row.deployment_config ?? {}
  const redactedExecution = redactConfig(execution)
  return {
    ...row,
    config: redactedExecution,
    execution_config: redactedExecution,
    deployment_config: redactConfig(deployment),
  }
}

export const CONNECTOR_TYPES: ConnectorType[] = [
  {
    id: 'ct-rest',
    type: 'REST',
    displayName: 'REST / HTTP',
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
  {
    id: 'ct-event-listener',
    type: 'EVENT_LISTENER',
    displayName: 'Event Listener / Webhook',
    configSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string' },
        secret: { type: 'string' },
      },
    },
    spiClass: 'com.pipelineplatform.connector.spi.Connector',
    spiVersion: '1.0',
  },
  {
    id: 'ct-storage',
    type: 'STORAGE',
    displayName: 'Object Storage (S3)',
    configSchema: {
      type: 'object',
      required: ['bucket'],
      properties: {
        bucket: { type: 'string' },
        region: { type: 'string' },
        prefix: { type: 'string' },
      },
    },
    spiClass: 'com.pipelineplatform.connector.storage.StorageConnector',
    spiVersion: '1.0',
  },
  {
    id: 'ct-message-bus',
    type: 'MESSAGE_BUS',
    displayName: 'Message Bus (SQS)',
    configSchema: {
      type: 'object',
      required: ['queueUrl'],
      properties: {
        queueUrl: { type: 'string' },
        region: { type: 'string' },
      },
    },
    spiClass: 'com.pipelineplatform.connector.messagebus.MessageBusConnector',
    spiVersion: '1.0',
  },
]

export const SERVICE_TYPES: ServiceType[] = [
  {
    id: 'st-auth',
    type: 'AUTH',
    displayName: 'Authentication',
    defaults: [
      { id: 'sd-auth-stub', vendor: 'StubAuth' },
      { id: 'sd-auth-oauth', vendor: 'OAuth' },
      { id: 'sd-auth-oidc', vendor: 'OIDC' },
      { id: 'sd-auth-keycloak', vendor: 'Keycloak' },
      { id: 'sd-auth-aad', vendor: 'AAD' },
      { id: 'sd-auth-cognito', vendor: 'AWSCognito' },
      { id: 'sd-auth-azure-mi', vendor: 'AzureMI' },
      { id: 'sd-auth-cert', vendor: 'CertBased' },
      { id: 'sd-auth-jwt', vendor: 'JWT' },
    ],
  },
]

/** Mutable fixture store — reset between tests via `resetMockDb()`. */
export const mockDb = {
  connectors: [] as TenantConnector[],
  services: [] as TenantService[],
  pipelines: [] as PipelineResponse[],
  /** Last PUT steps body — asserted by save tests. */
  lastStepsPut: null as ReplacePipelineStepsRequest | null,
  executions: {} as Record<string, PipelineExecutionDetail>,
  executionPollCount: {} as Record<string, number>,
  /** When true, POST .../run returns 402. */
  blockRunsWith402: false,
}

export function resetMockDb() {
  mockDb.pipelines = [
    {
      id: 'pipe-demo',
      tenantId: 'T001',
      name: 'threeStage',
      description: 'Demo pipeline',
      visibility: 'PRIVATE',
      execution_mode: 'ASYNC',
      version: 1,
      status: 'ACTIVE',
      deployment_config: {
        cloud: 'aws',
        region: 'us-east-1',
        accessKey: 'AKIA••••',
      },
      execution_config: { timeoutMs: 30000 },
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      steps: [
        {
          id: 'step-1',
          pipelet_id: 'plet-rest-source',
          step_order: 1,
          config: {},
          deployment_config: { cloud: 'aws', region: 'us-east-1' },
          execution_config: {},
          connector_ids: ['conn-plet-rest-source'],
          service_ids: [],
          input_queue: null,
          output_queue: 'q-stage-1',
        },
        {
          id: 'step-2',
          pipelet_id: 'plet-json-transform',
          step_order: 2,
          config: { mode: 'flatten' },
          deployment_config: { cloud: 'aws', region: 'us-east-1' },
          execution_config: { mode: 'flatten' },
          connector_ids: [],
          service_ids: [],
          input_queue: 'q-stage-1',
          output_queue: 'q-stage-2',
        },
        {
          id: 'step-3',
          pipelet_id: 'plet-s3-destination',
          step_order: 3,
          config: {},
          deployment_config: { cloud: 'aws', region: 'us-east-1' },
          execution_config: {},
          connector_ids: [],
          service_ids: ['svc-auth-oauth'],
          input_queue: 'q-stage-2',
          output_queue: null,
        },
      ],
    },
    {
      id: 'pipe-draft',
      tenantId: 'T001',
      name: 'draftOnly',
      description: null,
      visibility: 'PRIVATE',
      execution_mode: 'ASYNC',
      version: 1,
      status: 'DRAFT',
      deployment_config: {},
      execution_config: {},
      created_at: '2026-07-02T00:00:00Z',
      updated_at: '2026-07-02T00:00:00Z',
      steps: [],
    },
  ]
  mockDb.lastStepsPut = null
  mockDb.executions = {}
  mockDb.executionPollCount = {}
  mockDb.blockRunsWith402 = false
  mockDb.connectors = [
    {
      id: 'conn-1',
      tenantId: 'T001',
      connectorTypeId: 'ct-rest',
      name: 'Orders API',
      config: {
        baseUrl: 'https://orders.example.com',
        api_key: 'super-secret-key',
      },
      deployment_config: { cloud: 'aws', region: 'us-east-1' },
      execution_config: {
        baseUrl: 'https://orders.example.com',
        api_key: 'super-secret-key',
      },
      status: 'ACTIVE',
      lastTestedAt: null,
      createdAt: '2026-07-01T00:00:00Z',
    },
    ...(seedConnectors as TenantConnector[]),
  ]
  mockDb.services = [
    {
      id: 'svc-1',
      tenantId: 'T001',
      serviceTypeId: 'st-auth',
      vendor: 'StubAuth',
      name: 'Primary Auth',
      config: {
        client_id: 'public-client',
        client_secret: 'raw-secret-must-not-leak',
      },
      deployment_config: { cloud: 'aws', region: 'us-east-1' },
      execution_config: {
        client_id: 'public-client',
        client_secret: 'raw-secret-must-not-leak',
      },
      inheritsDefault: false,
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
    },
    ...(seedAuthServices as TenantService[]),
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
      mockDb.connectors
        .filter((c) => c.tenantId === tid)
        .map(asConnectorResponse),
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
    return HttpResponse.json(asConnectorResponse(row))
  }),

  http.post('/api/v1/connectors', async ({ request }) => {
    const tid = tenantId(request)
    const body = (await request.json()) as CreateConnectorRequest
    if (!body.connectorTypeId || !body.name?.trim()) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 400 })
    }
    const execution = {
      ...(body.execution_config ?? body.config ?? {}),
    }
    const created: TenantConnector = {
      id: id('conn'),
      tenantId: tid,
      connectorTypeId: body.connectorTypeId,
      name: body.name.trim(),
      config: execution,
      deployment_config: { ...(body.deployment_config ?? {}) },
      execution_config: execution,
      status: 'ACTIVE',
      lastTestedAt: null,
      createdAt: nowIso(),
    }
    mockDb.connectors.push(created)
    return HttpResponse.json(asConnectorResponse(created), { status: 201 })
  }),

  http.put('/api/v1/connectors/:id', async ({ params, request }) => {
    const tid = tenantId(request)
    const idx = mockDb.connectors.findIndex(
      (c) => c.id === params.id && c.tenantId === tid,
    )
    if (idx < 0) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as UpdateConnectorRequest
    const prev = mockDb.connectors[idx]
    const incomingExecution = body.execution_config ?? body.config
    const execution = incomingExecution
      ? mergePreservingSecrets(
          prev.execution_config ?? prev.config,
          incomingExecution,
        )
      : (prev.execution_config ?? prev.config)
    const deployment =
      body.deployment_config != null
        ? mergePreservingSecrets(
            prev.deployment_config ?? {},
            body.deployment_config,
          )
        : (prev.deployment_config ?? {})
    const updated: TenantConnector = {
      ...prev,
      name: body.name,
      config: execution,
      execution_config: execution,
      deployment_config: deployment,
      status: body.status ?? prev.status,
    }
    mockDb.connectors[idx] = updated
    return HttpResponse.json(asConnectorResponse(updated))
  }),
]

export const serviceHandlers = [
  http.get('/api/v1/service-types', () => HttpResponse.json(SERVICE_TYPES)),

  http.get('/api/v1/services', ({ request }) => {
    const tid = tenantId(request)
    return HttpResponse.json(
      mockDb.services
        .filter((s) => s.tenantId === tid)
        .map(asServiceResponse),
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
    return HttpResponse.json(asServiceResponse(row))
  }),

  http.post('/api/v1/services', async ({ request }) => {
    const tid = tenantId(request)
    const body = (await request.json()) as CreateTenantServiceRequest
    if (!body.serviceTypeId || !body.vendor?.trim() || !body.name?.trim()) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 400 })
    }
    const execution = {
      ...(body.execution_config ?? body.tenantConfig ?? {}),
    }
    const created: TenantService = {
      id: id('svc'),
      tenantId: tid,
      serviceTypeId: body.serviceTypeId,
      vendor: body.vendor.trim(),
      name: body.name.trim(),
      config: execution,
      deployment_config: { ...(body.deployment_config ?? {}) },
      execution_config: execution,
      inheritsDefault: body.inheritsDefault ?? false,
      status: 'ACTIVE',
      createdAt: nowIso(),
    }
    mockDb.services.push(created)
    return HttpResponse.json(asServiceResponse(created), { status: 201 })
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
    const incomingExecution = body.execution_config ?? body.tenantConfig
    const execution = incomingExecution
      ? mergePreservingSecrets(
          prev.execution_config ?? prev.config,
          incomingExecution,
        )
      : (prev.execution_config ?? prev.config)
    const deployment =
      body.deployment_config != null
        ? mergePreservingSecrets(
            prev.deployment_config ?? {},
            body.deployment_config,
          )
        : (prev.deployment_config ?? {})
    const updated: TenantService = {
      ...prev,
      name: body.name,
      config: execution,
      execution_config: execution,
      deployment_config: deployment,
      inheritsDefault: body.inheritsDefault ?? prev.inheritsDefault,
      status: body.status ?? prev.status,
    }
    mockDb.services[idx] = updated
    return HttpResponse.json(asServiceResponse(updated))
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
      mockDb.pipelines
        .filter(
          (p) => p.tenantId === tid && p.status.toUpperCase() !== 'ARCHIVED',
        )
        .map((p) => ({
          ...p,
          deployment_config: redactConfig(
            (p.deployment_config as Record<string, unknown>) ?? {},
          ),
          execution_config: redactConfig(
            (p.execution_config as Record<string, unknown>) ?? {},
          ),
        })),
    )
  }),

  http.get('/api/v1/pipelines/:id', ({ params, request }) => {
    const tid = tenantId(request)
    const pipe = mockDb.pipelines.find(
      (p) => p.id === params.id && p.tenantId === tid,
    )
    if (!pipe) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({
      ...pipe,
      deployment_config: redactConfig(
        (pipe.deployment_config as Record<string, unknown>) ?? {},
      ),
      execution_config: redactConfig(
        (pipe.execution_config as Record<string, unknown>) ?? {},
      ),
    })
  }),

  http.delete('/api/v1/pipelines/:id', ({ params, request }) => {
    const tid = tenantId(request)
    const idx = mockDb.pipelines.findIndex(
      (p) => p.id === params.id && p.tenantId === tid,
    )
    if (idx < 0) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const archived: PipelineResponse = {
      ...mockDb.pipelines[idx],
      status: 'ARCHIVED',
      version: mockDb.pipelines[idx].version + 1,
      updated_at: nowIso(),
    }
    mockDb.pipelines[idx] = archived
    return HttpResponse.json(archived)
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
      deployment_config: redactConfig(body.deployment_config ?? {}),
      execution_config: redactConfig(body.execution_config ?? {}),
      created_at: nowIso(),
      updated_at: nowIso(),
      steps: [],
    }
    mockDb.pipelines.push({
      ...created,
      deployment_config: { ...(body.deployment_config ?? {}) },
      execution_config: { ...(body.execution_config ?? {}) },
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('/api/v1/pipelines/:id', async ({ params, request }) => {
    const tid = tenantId(request)
    const idx = mockDb.pipelines.findIndex(
      (p) => p.id === params.id && p.tenantId === tid,
    )
    if (idx < 0) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const body = (await request.json()) as UpdatePipelineRequest
    const existing = mockDb.pipelines[idx]
    const mergedDeployment =
      body.deployment_config != null
        ? mergePreservingSecrets(
            (existing.deployment_config as Record<string, unknown>) ?? {},
            body.deployment_config,
          )
        : ((existing.deployment_config as Record<string, unknown>) ?? {})
    const mergedExecution =
      body.execution_config != null
        ? mergePreservingSecrets(
            (existing.execution_config as Record<string, unknown>) ?? {},
            body.execution_config,
          )
        : ((existing.execution_config as Record<string, unknown>) ?? {})
    const updated: PipelineResponse = {
      ...existing,
      name: body.name?.trim() || existing.name,
      description:
        body.description !== undefined ? body.description : existing.description,
      version: existing.version + 1,
      updated_at: nowIso(),
      deployment_config: mergedDeployment,
      execution_config: mergedExecution,
    }
    mockDb.pipelines[idx] = updated
    return HttpResponse.json({
      ...updated,
      deployment_config: redactConfig(mergedDeployment),
      execution_config: redactConfig(mergedExecution),
    })
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
    const steps = body.steps.map((s) => {
      const execution = s.execution_config ?? s.config ?? {}
      return {
        ...s,
        config: execution,
        execution_config: execution,
        deployment_config: s.deployment_config ?? {},
      }
    })
    const updated: PipelineResponse = {
      ...mockDb.pipelines[idx],
      version: mockDb.pipelines[idx].version + 1,
      updated_at: nowIso(),
      steps,
      status: 'ACTIVE',
    }
    mockDb.pipelines[idx] = updated
    return HttpResponse.json(updated)
  }),

  http.post('/api/v1/pipelines/:id/dry-run', ({ params, request }) => {
    const tid = tenantId(request)
    const pipe = mockDb.pipelines.find(
      (p) => p.id === params.id && p.tenantId === tid,
    )
    if (!pipe) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({
      valid: true,
      messages: ['Dry-run OK (stub)'],
    })
  }),

  http.post('/api/v1/pipelines/:id/run', ({ params, request }) => {
    const tid = tenantId(request)
    const pipe = mockDb.pipelines.find(
      (p) => p.id === params.id && p.tenantId === tid,
    )
    if (!pipe) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    if (mockDb.blockRunsWith402) {
      return HttpResponse.json(
        {
          error: 'payment_required',
          code: 'NO_CREDIT',
          message: 'Credit balance is zero; top up to run pipelines.',
          credit_balance: 0,
        },
        { status: 402 },
      )
    }
    const executionId = id('exec')
    mockDb.executions[executionId] = {
      id: executionId,
      pipeline_id: pipe.id,
      tenant_id: tid,
      status: 'RUNNING',
      started_at: nowIso(),
      completed_at: null,
      steps: [
        { step_order: 1, status: 'RUNNING' },
        { step_order: 2, status: 'PENDING' },
        { step_order: 3, status: 'PENDING' },
      ],
    }
    mockDb.executionPollCount[executionId] = 0
    return HttpResponse.json(
      {
        execution_id: executionId,
        status: 'RUNNING',
        pipeline_id: pipe.id,
        started_at: nowIso(),
      },
      { status: 202 },
    )
  }),

  http.get('/api/v1/pipelines/:id/executions/:executionId', ({ params }) => {
    const executionId = String(params.executionId)
    const current = mockDb.executions[executionId]
    if (!current) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const count = (mockDb.executionPollCount[executionId] ?? 0) + 1
    mockDb.executionPollCount[executionId] = count
    if (count >= 2) {
      mockDb.executions[executionId] = {
        ...current,
        status: 'COMPLETED',
        completed_at: nowIso(),
        steps: [
          { step_order: 1, status: 'COMPLETED' },
          { step_order: 2, status: 'COMPLETED' },
          { step_order: 3, status: 'COMPLETED' },
        ],
      }
    } else if (count === 1) {
      mockDb.executions[executionId] = {
        ...current,
        status: 'RUNNING',
        steps: [
          { step_order: 1, status: 'COMPLETED' },
          { step_order: 2, status: 'RUNNING' },
          { step_order: 3, status: 'PENDING' },
        ],
      }
    }
    return HttpResponse.json(mockDb.executions[executionId])
  }),
]

export const observabilityHandlers = [
  http.get('/api/v1/observability/pipelines/:id/completeness', ({ params, request }) => {
    const tid = tenantId(request)
    return HttpResponse.json({
      pipeline_id: params.id,
      tenant_id: tid,
      execution_id: 'exec-fixture',
      records_in: 1000,
      records_out: 980,
      completeness_pct: 98,
      completeness_ratio: 0.98,
    })
  }),

  http.get('/api/v1/observability/pipelines/:id/latency', ({ params, request }) => {
    const tid = tenantId(request)
    return HttpResponse.json({
      pipeline_id: params.id,
      tenant_id: tid,
      sample_count: 42,
      mean_ms: 48.5,
      max_ms: 210,
      p50_ms: 40,
      p95_ms: 120,
      p99_ms: 180,
    })
  }),

  http.get('/api/v1/observability/pipelines/:id/heartbeat', ({ params, request }) => {
    const tid = tenantId(request)
    return HttpResponse.json({
      pipeline_id: params.id,
      tenant_id: tid,
      last_heartbeat_epoch_seconds: Math.floor(Date.now() / 1000) - 30,
      stale: false,
    })
  }),
]

function requireMatchingTenant(request: Request, pathId: string) {
  const tid = tenantId(request)
  if (tid !== pathId) {
    return HttpResponse.json({ message: 'Not found' }, { status: 404 })
  }
  return null
}

export const billingHandlers = [
  http.get('/api/v1/tenants/:id/usage', ({ params, request }) => {
    const denied = requireMatchingTenant(request, String(params.id))
    if (denied) {
      return denied
    }
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
    )
    return HttpResponse.json({
      tenant_id: params.id,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      dimensions: {
        'platform.pipeline_runs': { quantity: 12, cost: 0.12 },
        'data.records_processed': { quantity: 125000, cost: 1.25 },
        'compute.vcpu_seconds': { quantity: 840, cost: 4.2 },
      },
      total_cost: 5.57,
      credit_balance: 94.43,
    })
  }),

  http.get('/api/v1/tenants/:id/usage/events', ({ params, request }) => {
    const denied = requireMatchingTenant(request, String(params.id))
    if (denied) {
      return denied
    }
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '0')
    const size = Number(url.searchParams.get('size') ?? '20')
    const items = Array.from({ length: Math.min(size, 5) }, (_, i) => ({
      id: `ue-${page}-${i}`,
      dimension: i % 2 === 0 ? 'platform.pipeline_runs' : 'data.records_processed',
      quantity: i % 2 === 0 ? 1 : 100,
      unit: i % 2 === 0 ? 'runs' : 'records',
      execution_id: `exec-${i}`,
      pipeline_id: 'pipe-demo',
      pipelet_id: null,
      connector_id: null,
      recorded_at: nowIso(),
      idempotency_key: `idem-${page}-${i}`,
    }))
    return HttpResponse.json({
      tenant_id: params.id,
      items,
      page,
      size,
      total_elements: 12,
      total_pages: 3,
    })
  }),

  http.get('/api/v1/tenants/:id/quota', ({ params, request }) => {
    const denied = requireMatchingTenant(request, String(params.id))
    if (denied) {
      return denied
    }
    return HttpResponse.json({
      tenant_id: params.id,
      decision: 'ALLOW',
      message: 'Within soft and hard limits',
      allowed: true,
      credit_balance: 94.43,
      breached_dimension: null,
      soft_limit: null,
      hard_limit: null,
      current_usage: null,
      dimensions: {
        'platform.pipeline_runs': { soft: 1000, hard: 5000, usage: 12 },
        'data.records_processed': { soft: 1_000_000, hard: 5_000_000, usage: 125000 },
      },
    })
  }),

  http.get('/api/v1/tenants/:id/billing/periods', ({ params, request }) => {
    const denied = requireMatchingTenant(request, String(params.id))
    if (denied) {
      return denied
    }
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const lastDay = new Date(Date.UTC(y, now.getUTCMonth() + 1, 0)).getUTCDate()
    return HttpResponse.json({
      tenant_id: params.id,
      periods: [
        {
          id: `bp-${y}-${m}`,
          period_start: `${y}-${m}-01`,
          period_end: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
          total_cost: 5.57,
          status: 'open',
        },
      ],
    })
  }),
]

export const handlers = [
  ...connectorHandlers,
  ...serviceHandlers,
  ...pipeletHandlers,
  ...pipelineHandlers,
  ...observabilityHandlers,
  ...billingHandlers,
]
