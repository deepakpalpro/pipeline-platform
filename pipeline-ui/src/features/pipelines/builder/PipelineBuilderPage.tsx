import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createPipeline,
  dryRunPipeline,
  getPipeline,
  listConnectors,
  listServices,
  replacePipelineSteps,
  runPipeline,
  updatePipeline,
} from '../../../api/resources'
import { ApiError, type QuotaBlockedBody } from '../../../api/types'
import { useTenant } from '../../../contexts/TenantContext'
import { KeyValueEditor } from '../../forms/KeyValueEditor'
import { mergeExtendConfig } from '../../forms/mergeExtendConfig'
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
  stepsToGraph,
  type StepCategory,
} from './pipelineGraphReducer'
import { useExecutionPoller } from './useExecutionPoller'

type Props = {
  catalog?: PipeletCatalogEntry[]
}

export function PipelineBuilderPage({ catalog = PIPELET_FIXTURE }: Props) {
  const { pipelineId: routePipelineId } = useParams<{ pipelineId?: string }>()
  const isNew = !routePipelineId || routePipelineId === 'new'
  const navigate = useNavigate()
  const location = useLocation()
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(pipelineGraphReducer, initialPipelineGraph)
  const [overlay, overlayDispatch] = useReducer(
    executionOverlayReducer,
    initialOverlayState,
  )
  const [saveMessage, setSaveMessage] = useState<string | null>(() => {
    const flash = (location.state as { saveMessage?: string } | null)?.saveMessage
    return flash ?? null
  })
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null)
  const [pipelineId, setPipelineId] = useState<string | null>(
    isNew ? null : routePipelineId,
  )
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<{
    code: string
    message: string
  } | null>(null)
  const [nodeSeq, setNodeSeq] = useState(1)
  const [running, setRunning] = useState(false)
  const [hydratedId, setHydratedId] = useState<string | null>(null)

  const catalogById = useMemo(() => {
    const map = new Map(catalog.map((c) => [c.id, c]))
    return map
  }, [catalog])

  useEffect(() => {
    const flash = (location.state as { saveMessage?: string } | null)?.saveMessage
    if (flash) {
      setSaveMessage(flash)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  const pipelineQuery = useQuery({
    queryKey: ['pipeline', tenantId, routePipelineId],
    queryFn: () => getPipeline(tenantId, routePipelineId!),
    enabled: !isNew && Boolean(routePipelineId),
  })

  useEffect(() => {
    if (isNew) {
      if (hydratedId !== null) {
        dispatch({ type: 'RESET' })
        setPipelineId(null)
        setHydratedId(null)
        setNodeSeq(1)
        setSaveMessage(null)
        overlayDispatch({ type: 'RESET' })
      }
      return
    }
    const pipeline = pipelineQuery.data
    if (!pipeline || hydratedId === pipeline.id) {
      return
    }
    const graph = stepsToGraph(
      pipeline.name,
      pipeline.steps ?? [],
      (pipeletId) => {
        const entry = catalogById.get(pipeletId)
        return {
          name: entry?.name ?? pipeletId,
          category: (entry?.category as StepCategory) ?? 'Processor',
          deploymentConfiguration: entry?.deploymentConfiguration,
          executionConfiguration: entry?.executionConfiguration,
        }
      },
      pipeline.deployment_config ?? {},
      pipeline.execution_config ?? {},
    )
    dispatch({ type: 'RESET', state: graph })
    setPipelineId(pipeline.id)
    setNodeSeq((pipeline.steps?.length ?? 0) + 1)
    setHydratedId(pipeline.id)
    overlayDispatch({ type: 'RESET' })
  }, [isNew, pipelineQuery.data, hydratedId, catalogById])

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
      if (pipelineId) {
        await updatePipeline(tenantId, pipelineId, {
          name: state.pipelineName,
          deployment_config: state.deploymentConfig,
          execution_config: state.executionConfig,
        })
        const stepsBody = graphToStepsPayload(state)
        return replacePipelineSteps(tenantId, pipelineId, stepsBody)
      }
      const created = await createPipeline(tenantId, {
        name: state.pipelineName,
        executionMode: 'ASYNC',
        visibility: 'PRIVATE',
        deployment_config: state.deploymentConfig,
        execution_config: state.executionConfig,
      })
      const stepsBody = graphToStepsPayload(state)
      return replacePipelineSteps(tenantId, created.id, stepsBody)
    },
    onSuccess: (pipeline) => {
      const msg = `Saved ${pipeline.name} (${pipeline.id}) v${pipeline.version}`
      setPipelineId(pipeline.id)
      setHydratedId(pipeline.id)
      setSaveMessage(msg)
      void queryClient.invalidateQueries({ queryKey: ['pipelines', tenantId] })
      void queryClient.invalidateQueries({
        queryKey: ['pipeline', tenantId, pipeline.id],
      })
      if (isNew || routePipelineId !== pipeline.id) {
        navigate(`/pipelines/${pipeline.id}`, {
          replace: true,
          state: { saveMessage: msg },
        })
      }
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
    const deploymentConfig = mergeExtendConfig(
      item.deploymentConfiguration,
      {},
    )
    const executionConfig = mergeExtendConfig(item.executionConfiguration, {})
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
          config: executionConfig,
          deploymentConfig,
          executionConfig,
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

  if (!isNew && pipelineQuery.isLoading && hydratedId === null) {
    return (
      <section className="builder-page" aria-label="Pipeline builder">
        <p className="muted">Loading pipeline…</p>
        {saveMessage ? (
          <p role="status" data-testid="save-status">
            {saveMessage}
          </p>
        ) : null}
      </section>
    )
  }

  if (!isNew && pipelineQuery.isError) {
    return (
      <section className="builder-page" aria-label="Pipeline builder">
        <p role="alert">Failed to load pipeline</p>
        <Link to="/pipelines">Back to list</Link>
      </section>
    )
  }

  return (
    <section className="builder-page" aria-label="Pipeline builder">
      <div className="panel-header">
        <div className="builder-title-row">
          <Link className="back-link" to="/pipelines">
            ← Pipelines
          </Link>
          <h1>{isNew ? 'New pipeline' : 'Edit pipeline'}</h1>
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

      <div className="builder-deployment" aria-label="Pipeline configuration">
        <KeyValueEditor
          title="Deployment configuration"
          entries={state.deploymentConfig}
          onChange={(deploymentConfig) =>
            dispatch({ type: 'SET_DEPLOYMENT_CONFIG', deploymentConfig })
          }
        />
        <KeyValueEditor
          title="Execution configuration"
          entries={state.executionConfig}
          onChange={(executionConfig) =>
            dispatch({ type: 'SET_EXECUTION_CONFIG', executionConfig })
          }
        />
        <p className="muted props-hint">
          Pipeline-level defaults. Steps inherit pipelet defaults and can
          override or extend both maps. Examples: cloud, region, accessKey /
          batchSize, parallelism.
        </p>
      </div>

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
          selectedNodeId={state.selectedNodeId}
          onSelect={(nodeId) => dispatch({ type: 'SELECT_NODE', nodeId })}
          onConnect={(source, target) =>
            dispatch({ type: 'CONNECT', source, target })
          }
          onRemove={(nodeId) => dispatch({ type: 'REMOVE_NODE', nodeId })}
        />
        <StepPropertiesPanel
          node={selected}
          connectors={connectorsQuery.data ?? []}
          services={servicesQuery.data ?? []}
          onChange={(nodeId, patch) =>
            dispatch({ type: 'UPDATE_STEP', nodeId, patch })
          }
          onRemove={(nodeId) => dispatch({ type: 'REMOVE_NODE', nodeId })}
        />
      </div>
    </section>
  )
}
