import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { OverlayNodeState } from './executionOverlayReducer'
import type { PipelineGraphEdge, PipelineGraphNode } from './pipelineGraphReducer'

function StepNode({ data, selected }: NodeProps) {
  const d = data as PipelineGraphNode['data'] & {
    overlay?: OverlayNodeState
  }
  const overlay = d.overlay ?? 'idle'
  return (
    <div
      className={
        selected
          ? `rf-step selected overlay-${overlay}`
          : `rf-step overlay-${overlay}`
      }
      data-overlay={overlay}
    >
      <Handle type="target" position={Position.Left} />
      <strong>{d.name}</strong>
      <span className="rf-step-cat">{d.category}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { step: StepNode }

type Props = {
  nodes: PipelineGraphNode[]
  edges: PipelineGraphEdge[]
  overlayByNodeId?: Record<string, OverlayNodeState>
  onSelect: (nodeId: string | null) => void
  onConnect: (source: string, target: string) => void
}

export function PipelineCanvas({
  nodes,
  edges,
  overlayByNodeId = {},
  onSelect,
  onConnect,
}: Props) {
  const rfNodes: Node[] = nodes.map((n) => ({
    id: n.id,
    type: 'step',
    position: n.position,
    data: { ...n.data, overlay: overlayByNodeId[n.id] ?? 'idle' },
  }))

  const rfEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed },
  }))

  return (
    <div className="builder-canvas" aria-label="Pipeline canvas">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onConnect={(connection) => {
          if (connection.source && connection.target) {
            onConnect(connection.source, connection.target)
          }
        }}
        nodesDraggable={false}
        nodesConnectable
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
