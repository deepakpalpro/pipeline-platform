import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useReducer, useState } from 'react'
import {
  createPipeline,
  dryRunPipeline,
  listConnectors,
  listServices,
  replacePipelineSteps,
  runPipeline,
} from '../../../api/resources'
import { ApiError, type QuotaBlockedBody } from '../../../api/types'
import { useTenant } from '../../../contexts/TenantContext'
import { PIPELET_FIXTURE } from '../../pipelets/fixture'
import type { PipeletCatalogEntry } from '../../pipelets/catalogFilter'
import { ExecutionOverlaySummary } from './ExecutionOverlaySummary'
import { PipeletPalette } from './PipeletPalette'
import { PipelineCanvas } from './PipelineCanvas'
import { QuotaBlockedAlert } from './QuotaBlockedAlert'
import { RunControls } from './RunControls'
import { StepPropertiesPanel } from './StepPropertiesPanel'
import {
  executionOverlayReducer,
  initialOverlayState,
} from './executionOverlayReducer'
import {
  graphToStepsPayload,
  initialPipelineGraph,
  orderedNodeIds,
  pipelineGraphReducer,
} from './pipelineGraphReducer'
import { useExecutionPoller } from './useExecutionPoller'

type Props = {
  catalog?: PipeletCatalogEntry[]
}

export function PipelineBuilderPage({ catalog = PIPELET_FIXTURE }: Props) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(pipelineGraphReducer, initialPipelineGraph)
  const [overlay, overlayDispatch] = useReducer(
    executionOverlayReducer,
    initialOverlayState,
  )
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null)
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<{
    code: string
    message: string
  } | null>(null)
  const [nodeSeq, setNodeSeq] = useState(1)
  const [running, setRunning] = useState(false)

  const connectorsQuery = useQuery({
    queryKey: ['connectors', tenantId],
    queryFn: () => listConnectors(tenantId),
  })
  const servicesQuery = useQuery({
    queryKey: ['services', tenantId],
    queryFn: () => listServices(tenantId),
  })

  const selected = useMemo(
    () => state.nodes.find((n) => n.id === state.selectedNodeId) ?? null,
    [state.nodes, state.selectedNodeId],
  )

  const nodeIdsInOrder = useMemo(() => orderedNodeIds(state), [state])

  const { execution } = useExecutionPoller({
    tenantId,
    pipelineId,
    executionId,
    enabled: Boolean(executionId),
    intervalMs: 50,
    maxAttempts: 10,
  })

  useEffect(() => {
    if (!execution) {
      return
    }
    if (execution.steps?.length) {
      overlayDispatch({
        type: 'APPLY_STEPS',
        nodeIdsInOrder,
        steps: execution.steps,
        executionStatus: execution.status,
      })
    } else {
      overlayDispatch({
        type: 'APPLY_OVERALL',
        nodeIdsInOrder,
        executionStatus: execution.status,
      })
    }
    const terminal = ['COMPLETED', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(
      execution.status.toUpperCase(),
    )
    if (terminal) {
      setRunning(false)
    }
  }, [execution, nodeIdsInOrder])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const created = await createPipeline(tenantId, {
        name: state.pipelineName,
        executionMode: 'ASYNC',
        visibility: 'PRIVATE',
      })
      const stepsBody = graphToStepsPayload(state)
      return replacePipelineSteps(tenantId, created.id, stepsBody)
    },
    onSuccess: (pipeline) => {
      setPipelineId(pipeline.id)
      setSaveMessage(`Saved ${pipeline.name} (${pipeline.id}) v${pipeline.version}`)
    },
    onError: (err: Error) => {
      setSaveMessage(`Save failed: ${err.message}`)
    },
  })

  async function ensureSaved(): Promise<string> {
    if (pipelineId) {
      return pipelineId
    }
    const pipeline = await saveMutation.mutateAsync()
    return pipeline.id
  }

  async function handleDryRun() {
    setQuotaInfo(null)
    try {
      const id = await ensureSaved()
      const result = await dryRunPipeline(tenantId, id)
      setDryRunMessage(
        result.valid
          ? result.messages.join('; ') || 'Dry-run OK'
          : `Invalid: ${result.messages.join('; ')}`,
      )
    } catch (err) {
      setDryRunMessage(err instanceof Error ? err.message : 'Dry-run failed')
    }
  }

  async function handleRun() {
    setQuotaInfo(null)
    setDryRunMessage(null)
    overlayDispatch({ type: 'RESET' })
    setRunning(true)
    try {
      const id = await ensureSaved()
      const run = await runPipeline(tenantId, id)
      setPipelineId(id)
      setExecutionId(run.execution_id)
    } catch (err) {
      setRunning(false)
      if (err instanceof ApiError && err.status === 402) {
        const body = err.body as QuotaBlockedBody
        setQuotaInfo({
          code: body?.code ?? 'HARD_BLOCK',
          message:
            body?.message ??
            'Pipeline run blocked by quota or credit limits.',
        })
        return
      }
      setSaveMessage(err instanceof Error ? err.message : 'Run failed')
    }
  }

  function addFromPalette(item: PipeletCatalogEntry) {
    const id = `n${nodeSeq}`
    setNodeSeq((n) => n + 1)
    dispatch({
      type: 'ADD_NODE',
      node: {
        id,
        position: { x: 40 + (nodeSeq - 1) * 220, y: 120 },
        data: {
          pipeletId: item.id,
          name: item.name,
          category: item.category,
          connectorIds: [],
          serviceIds: [],
          config: {},
        },
      },
    })
    if (state.nodes.length > 0) {
      const prev = state.nodes[state.nodes.length - 1]
      dispatch({
        type: 'CONNECT',
        source: prev.id,
        target: id,
        label: `q-stage-${state.nodes.length}`,
      })
    }
  }

  return (
    <section className="builder-page" aria-label="Pipeline builder">
      <div className="panel-header">
        <div className="builder-title-row">
          <h1>Pipelines</h1>
          <label className="inline-field">
            <span className="sr-only">Pipeline name</span>
            <input
              aria-label="Pipeline name"
              value={state.pipelineName}
              onChange={(e) =>
                dispatch({ type: 'SET_PIPELINE_NAME', name: e.target.value })
              }
            />
          </label>
        </div>
        <RunControls
          canRun={state.nodes.length > 0}
          saving={saveMutation.isPending}
          running={running}
          onDryRun={() => {
            void handleDryRun()
          }}
          onSave={() => saveMutation.mutate()}
          onRun={() => {
            void handleRun()
          }}
        />
      </div>

      <QuotaBlockedAlert
        info={quotaInfo}
        onDismiss={() => setQuotaInfo(null)}
      />

      {saveMessage ? (
        <p role="status" data-testid="save-status">
          {saveMessage}
        </p>
      ) : null}
      {dryRunMessage ? (
        <p role="status" data-testid="dry-run-status">
          {dryRunMessage}
        </p>
      ) : null}

      <ExecutionOverlaySummary
        byNodeId={overlay.byNodeId}
        nodeIds={nodeIdsInOrder}
      />

      <div className="builder-layout">
        <PipeletPalette items={catalog} onAdd={addFromPalette} />
        <PipelineCanvas
          nodes={state.nodes}
          edges={state.edges}
          overlayByNodeId={overlay.byNodeId}
          onSelect={(nodeId) => dispatch({ type: 'SELECT_NODE', nodeId })}
          onConnect={(source, target) =>
            dispatch({ type: 'CONNECT', source, target })
          }
        />
        <StepPropertiesPanel
          node={selected}
          connectors={connectorsQuery.data ?? []}
          services={servicesQuery.data ?? []}
          onChange={(nodeId, patch) =>
            dispatch({ type: 'UPDATE_STEP', nodeId, patch })
          }
        />
      </div>
    </section>
  )
}
