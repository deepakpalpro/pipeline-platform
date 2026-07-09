import type { TenantConnector, TenantService } from '../../../api/types'
import type { PipelineGraphNode } from './pipelineGraphReducer'

type Props = {
  node: PipelineGraphNode | null
  connectors: TenantConnector[]
  services: TenantService[]
  onChange: (
    nodeId: string,
    patch: Partial<PipelineGraphNode['data']>,
  ) => void
}

export function StepPropertiesPanel({
  node,
  connectors,
  services,
  onChange,
}: Props) {
  if (!node) {
    return (
      <aside className="builder-props" aria-label="Step properties">
        <h2>Properties</h2>
        <p className="muted">Select a step on the canvas</p>
      </aside>
    )
  }

  const connectorId = node.data.connectorIds[0] ?? ''
  const serviceId = node.data.serviceIds[0] ?? ''

  return (
    <aside className="builder-props" aria-label="Step properties">
      <h2>Properties</h2>
      <p className="props-title">{node.data.name}</p>
      <p className="muted">{node.data.pipeletId}</p>

      <label>
        Connector
        <select
          aria-label="Step connector"
          value={connectorId}
          onChange={(e) =>
            onChange(node.id, {
              connectorIds: e.target.value ? [e.target.value] : [],
            })
          }
        >
          <option value="">None</option>
          {connectors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Service
        <select
          aria-label="Step service"
          value={serviceId}
          onChange={(e) =>
            onChange(node.id, {
              serviceIds: e.target.value ? [e.target.value] : [],
            })
          }
        >
          <option value="">None</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </aside>
  )
}
