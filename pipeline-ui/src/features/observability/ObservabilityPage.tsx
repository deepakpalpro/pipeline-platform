import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getCompleteness,
  getHeartbeat,
  getLatency,
  listPipelines,
} from '../../api/resources'
import { useTenant } from '../../contexts/TenantContext'
import { CompletenessPanel } from './CompletenessPanel'
import { HeartbeatPanel } from './HeartbeatPanel'
import { LatencyPanel } from './LatencyPanel'
import type { TimeRange } from './types'

type Tab = 'completeness' | 'latency' | 'heartbeat' | 'errors'

const TABS: { id: Tab; label: string }[] = [
  { id: 'completeness', label: 'Completeness' },
  { id: 'latency', label: 'Latency' },
  { id: 'heartbeat', label: 'Heartbeat' },
  { id: 'errors', label: 'Critical Errors' },
]

export function ObservabilityPage() {
  const { tenantId } = useTenant()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('completeness')
  const [range, setRange] = useState<TimeRange>('24h')

  const pipelinesQuery = useQuery({
    queryKey: ['pipelines', tenantId],
    queryFn: () => listPipelines(tenantId),
  })

  const pipelines = (pipelinesQuery.data ?? []).filter(
    (p) => p.status.toUpperCase() !== 'ARCHIVED',
  )
  const pipelineIdFromUrl = searchParams.get('pipelineId') ?? ''
  const selectedId = pipelines.some((p) => p.id === pipelineIdFromUrl)
    ? pipelineIdFromUrl
    : (pipelines[0]?.id ?? '')

  function selectPipeline(id: string) {
    setSearchParams(id ? { pipelineId: id } : {}, { replace: true })
  }

  const completenessQuery = useQuery({
    queryKey: ['obs-completeness', tenantId, selectedId, range],
    queryFn: () => getCompleteness(tenantId, selectedId),
    enabled: Boolean(selectedId) && tab === 'completeness',
  })
  const latencyQuery = useQuery({
    queryKey: ['obs-latency', tenantId, selectedId, range],
    queryFn: () => getLatency(tenantId, selectedId),
    enabled: Boolean(selectedId) && tab === 'latency',
  })
  const heartbeatQuery = useQuery({
    queryKey: ['obs-heartbeat', tenantId, selectedId, range],
    queryFn: () => getHeartbeat(tenantId, selectedId),
    enabled: Boolean(selectedId) && tab === 'heartbeat',
  })

  const selector = useMemo(
    () => (
      <div className="obs-controls">
        <label>
          Pipeline
          <select
            aria-label="Pipeline"
            value={selectedId}
            onChange={(e) => selectPipeline(e.target.value)}
          >
            {pipelines.length === 0 ? (
              <option value="">No pipelines</option>
            ) : null}
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time range
          <select
            aria-label="Time range"
            value={range}
            onChange={(e) => setRange(e.target.value as TimeRange)}
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </label>
      </div>
    ),
    [pipelines, range, selectedId],
  )

  return (
    <section className="obs-page" aria-label="Observability">
      <div className="panel-header">
        <h1>Observability</h1>
      </div>

      <div className="tab-row" role="tablist" aria-label="Observability panels">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selector}

      {tab === 'completeness' ? (
        <CompletenessPanel
          data={completenessQuery.data ?? null}
          loading={completenessQuery.isLoading}
        />
      ) : null}
      {tab === 'latency' ? (
        <LatencyPanel
          data={latencyQuery.data ?? null}
          loading={latencyQuery.isLoading}
        />
      ) : null}
      {tab === 'heartbeat' ? (
        <HeartbeatPanel
          data={heartbeatQuery.data ?? null}
          loading={heartbeatQuery.isLoading}
        />
      ) : null}
      {tab === 'errors' ? (
        <section className="obs-panel" aria-label="Critical errors panel">
          <h2>Critical Errors</h2>
          <p className="muted">Stub — link to W4 errors API in a later polish.</p>
        </section>
      ) : null}
    </section>
  )
}
