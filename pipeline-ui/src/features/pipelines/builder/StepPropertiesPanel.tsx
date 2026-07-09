import { KeyValueEditor } from '../../forms/KeyValueEditor'
import { SearchableSelect } from '../../forms/SearchableSelect'
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
  onRemove?: (nodeId: string) => void
}

export function StepPropertiesPanel({
  node,
  connectors,
  services,
  onChange,
  onRemove,
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

      <SearchableSelect
        label="Connector"
        value={connectorId}
        placeholder="Search connectors…"
        options={connectors.map((c) => ({
          value: c.id,
          label: c.name,
          meta: `${c.connectorTypeId} · ${c.status}`,
        }))}
        onChange={(next) =>
          onChange(node.id, {
            connectorIds: next ? [next] : [],
          })
        }
      />

      <SearchableSelect
        label="Service"
        value={serviceId}
        placeholder="Search services…"
        options={services.map((s) => ({
          value: s.id,
          label: s.name,
          meta: `${s.vendor} · ${s.status}`,
        }))}
        onChange={(next) =>
          onChange(node.id, {
            serviceIds: next ? [next] : [],
          })
        }
      />

      <KeyValueEditor
        title="Deployment configuration"
        entries={node.data.deploymentConfig ?? {}}
        onChange={(deploymentConfig) => onChange(node.id, { deploymentConfig })}
      />
      <KeyValueEditor
        title="Execution configuration"
        entries={node.data.executionConfig ?? node.data.config ?? {}}
        onChange={(executionConfig) =>
          onChange(node.id, { executionConfig, config: executionConfig })
        }
      />
      <p className="muted props-hint">
        Defaults come from the pipelet; edit to override or add keys for this
        step.
      </p>

      {onRemove ? (
        <div className="form-actions props-danger">
          <button
            type="button"
            className="danger"
            aria-label="Remove step"
            onClick={() => onRemove(node.id)}
          >
            Remove step
          </button>
          <p className="muted props-hint">Or press Delete / Backspace</p>
        </div>
      ) : null}
    </aside>
  )
}
