import { useEffect, useState } from 'react'
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
  const [draftKey, setDraftKey] = useState('')
  const [draftValue, setDraftValue] = useState('')

  useEffect(() => {
    setDraftKey('')
    setDraftValue('')
  }, [node?.id])

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
  const configEntries = Object.entries(node.data.config)

  function setConfig(next: Record<string, unknown>) {
    onChange(node!.id, { config: next })
  }

  function updateConfigValue(key: string, value: string) {
    setConfig({ ...node!.data.config, [key]: value })
  }

  function removeConfigKey(key: string) {
    const next = { ...node!.data.config }
    delete next[key]
    setConfig(next)
  }

  function addConfigEntry() {
    const key = draftKey.trim()
    if (!key) {
      return
    }
    setConfig({ ...node!.data.config, [key]: draftValue })
    setDraftKey('')
    setDraftValue('')
  }

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

      <div className="config-editor" aria-label="Step config">
        <h3>Config</h3>
        {configEntries.length === 0 ? (
          <p className="muted">No config keys yet</p>
        ) : (
          <ul className="config-rows">
            {configEntries.map(([key, value]) => (
              <li key={key} className="config-row">
                <span className="config-key">{key}</span>
                <input
                  aria-label={`Config value ${key}`}
                  value={value == null ? '' : String(value)}
                  onChange={(e) => updateConfigValue(key, e.target.value)}
                />
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Remove config ${key}`}
                  onClick={() => removeConfigKey(key)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="config-add">
          <input
            aria-label="Config key"
            placeholder="key"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
          />
          <input
            aria-label="Config value"
            placeholder="value"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
          />
          <button type="button" className="secondary" onClick={addConfigEntry}>
            Add
          </button>
        </div>
      </div>

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
