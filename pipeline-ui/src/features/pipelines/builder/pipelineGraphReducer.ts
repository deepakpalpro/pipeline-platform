export type StepCategory = 'Source' | 'Processor' | 'Destination'

export type PipelineStepNodeData = {
  pipeletId: string
  name: string
  category: StepCategory
  connectorIds: string[]
  serviceIds: string[]
  config: Record<string, unknown>
}

export type PipelineGraphNode = {
  id: string
  position: { x: number; y: number }
  data: PipelineStepNodeData
}

export type PipelineGraphEdge = {
  id: string
  source: string
  target: string
  label?: string
}

export type PipelineGraphState = {
  nodes: PipelineGraphNode[]
  edges: PipelineGraphEdge[]
  selectedNodeId: string | null
  pipelineName: string
}

export type PipelineGraphAction =
  | {
      type: 'ADD_NODE'
      node: PipelineGraphNode
    }
  | {
      type: 'CONNECT'
      source: string
      target: string
      label?: string
    }
  | {
      type: 'UPDATE_STEP'
      nodeId: string
      patch: Partial<PipelineStepNodeData>
    }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'SET_PIPELINE_NAME'; name: string }
  | { type: 'RESET'; state?: PipelineGraphState }

export const initialPipelineGraph: PipelineGraphState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  pipelineName: 'Untitled pipeline',
}

export function pipelineGraphReducer(
  state: PipelineGraphState,
  action: PipelineGraphAction,
): PipelineGraphState {
  switch (action.type) {
    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.node],
        selectedNodeId: action.node.id,
      }
    case 'CONNECT': {
      if (action.source === action.target) {
        return state
      }
      const exists = state.edges.some(
        (e) => e.source === action.source && e.target === action.target,
      )
      if (exists) {
        return state
      }
      const edge: PipelineGraphEdge = {
        id: `e-${action.source}-${action.target}`,
        source: action.source,
        target: action.target,
        label: action.label ?? `q-${action.source}-to-${action.target}`,
      }
      return { ...state, edges: [...state.edges, edge] }
    }
    case 'UPDATE_STEP':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId
            ? { ...n, data: { ...n.data, ...action.patch } }
            : n,
        ),
      }
    case 'REMOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.nodeId),
        edges: state.edges.filter(
          (e) => e.source !== action.nodeId && e.target !== action.nodeId,
        ),
        selectedNodeId:
          state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId }
    case 'SET_PIPELINE_NAME':
      return { ...state, pipelineName: action.name }
    case 'RESET':
      return action.state ?? initialPipelineGraph
    default:
      return state
  }
}

/** Topological order by edges; falls back to insertion order for isolates. */
export function orderedNodeIds(state: PipelineGraphState): string[] {
  const ids = state.nodes.map((n) => n.id)
  const incoming = new Map(ids.map((id) => [id, 0]))
  const adj = new Map(ids.map((id) => [id, [] as string[]]))
  for (const e of state.edges) {
    if (!incoming.has(e.target) || !adj.has(e.source)) {
      continue
    }
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1)
    adj.get(e.source)!.push(e.target)
  }
  const queue = ids.filter((id) => (incoming.get(id) ?? 0) === 0)
  const ordered: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    ordered.push(id)
    for (const next of adj.get(id) ?? []) {
      const nextIn = (incoming.get(next) ?? 1) - 1
      incoming.set(next, nextIn)
      if (nextIn === 0) {
        queue.push(next)
      }
    }
  }
  for (const id of ids) {
    if (!ordered.includes(id)) {
      ordered.push(id)
    }
  }
  return ordered
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

export type ReplaceStepsPayload = {
  steps: PipelineStepPayload[]
}

export function graphToStepsPayload(
  state: PipelineGraphState,
): ReplaceStepsPayload {
  const order = orderedNodeIds(state)
  const byId = new Map(state.nodes.map((n) => [n.id, n]))
  const steps: PipelineStepPayload[] = order.map((id, index) => {
    const node = byId.get(id)!
    const inbound = state.edges.find((e) => e.target === id)
    const outbound = state.edges.find((e) => e.source === id)
    return {
      pipelet_id: node.data.pipeletId,
      step_order: index + 1,
      config: node.data.config,
      connector_ids: node.data.connectorIds,
      service_ids: node.data.serviceIds,
      input_queue: inbound?.label ?? null,
      output_queue: outbound?.label ?? null,
    }
  })
  return { steps }
}
