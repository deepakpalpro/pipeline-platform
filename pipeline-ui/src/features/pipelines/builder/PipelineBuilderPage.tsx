import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useReducer, useState } from 'react'
import {
  createPipeline,
  listConnectors,
  listServices,
  replacePipelineSteps,
} from '../../../api/resources'
import { useTenant } from '../../../contexts/TenantContext'
import { PIPELET_FIXTURE } from '../../pipelets/fixture'
import type { PipeletCatalogEntry } from '../../pipelets/catalogFilter'
import { PipeletPalette } from './PipeletPalette'
import { PipelineCanvas } from './PipelineCanvas'
import { StepPropertiesPanel } from './StepPropertiesPanel'
import {
  graphToStepsPayload,
  initialPipelineGraph,
  pipelineGraphReducer,
} from './pipelineGraphReducer'

type Props = {
  catalog?: PipeletCatalogEntry[]
}

export function PipelineBuilderPage({ catalog = PIPELET_FIXTURE }: Props) {
  const { tenantId } = useTenant()
  const [state, dispatch] = useReducer(pipelineGraphReducer, initialPipelineGraph)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [nodeSeq, setNodeSeq] = useState(1)

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
      setSaveMessage(`Saved ${pipeline.name} (${pipeline.id}) v${pipeline.version}`)
    },
    onError: (err: Error) => {
      setSaveMessage(`Save failed: ${err.message}`)
    },
  })

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
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || state.nodes.length === 0}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {saveMessage ? (
        <p role="status" data-testid="save-status">
          {saveMessage}
        </p>
      ) : null}

      <div className="builder-layout">
        <PipeletPalette items={catalog} onAdd={addFromPalette} />
        <PipelineCanvas
          nodes={state.nodes}
          edges={state.edges}
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
