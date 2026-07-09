import { useEffect, useState } from 'react'
import { displayConfigValue, isSecretKey, REDACTED } from '../../api/secrets'
import type { TenantConnector, UpdateConnectorRequest } from '../../api/types'
import { KeyValueEditor } from '../forms/KeyValueEditor'

type Props = {
  connector: TenantConnector | null
  emptyLabel?: string
  onSave?: (id: string, body: UpdateConnectorRequest) => Promise<void> | void
  saving?: boolean
}

function splitConnectorConfig(config: Record<string, unknown>) {
  const { baseUrl, api_key: apiKey, ...extra } = config
  return {
    baseUrl: baseUrl == null ? '' : String(baseUrl),
    apiKey:
      apiKey == null || apiKey === REDACTED || String(apiKey) === '***'
        ? ''
        : String(apiKey),
    hadApiKey: apiKey != null && String(apiKey).length > 0,
    extra: Object.fromEntries(
      Object.entries(extra).map(([k, v]) => [
        k,
        isSecretKey(k) && (v === REDACTED || v === '***') ? '' : v,
      ]),
    ),
  }
}

export function ConnectorDetail({
  connector,
  emptyLabel = 'Select a connector',
  onSave,
  saving,
}: Props) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hadApiKey, setHadApiKey] = useState(false)
  const [extra, setExtra] = useState<Record<string, unknown>>({})
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!connector) {
      return
    }
    setName(connector.name)
    const split = splitConnectorConfig(connector.config)
    setBaseUrl(split.baseUrl)
    setApiKey(split.apiKey)
    setHadApiKey(split.hadApiKey)
    setExtra(split.extra)
    setMessage(null)
  }, [connector])

  if (!connector) {
    return <p className="muted">{emptyLabel}</p>
  }

  async function handleSave() {
    if (!onSave || !connector) {
      return
    }
    const config: Record<string, unknown> = { ...extra }
    if (baseUrl.trim()) {
      config.baseUrl = baseUrl.trim()
    }
    if (apiKey.trim()) {
      config.api_key = apiKey.trim()
    } else if (hadApiKey && connector.config.api_key != null) {
      config.api_key = connector.config.api_key
    }
    setMessage(null)
    try {
      await onSave(connector.id, {
        name: name.trim() || connector.name,
        config,
      })
      setMessage('Saved')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    }
  }

  if (!onSave) {
    return (
      <article className="entity-detail" aria-label="Connector detail">
        <h2>{connector.name}</h2>
        <dl>
          <div>
            <dt>ID</dt>
            <dd>{connector.id}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{connector.connectorTypeId}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{connector.status}</dd>
          </div>
        </dl>
        <h3>Config</h3>
        <dl className="config-list">
          {Object.entries(connector.config).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd data-testid={`config-${key}`}>
                {displayConfigValue(key, value)}
              </dd>
            </div>
          ))}
        </dl>
      </article>
    )
  }

  return (
    <article className="entity-detail entity-form" aria-label="Connector detail">
      <h2>Edit connector</h2>
      <p className="muted">{connector.id}</p>

      <label>
        Name
        <input
          aria-label="Connector name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Base URL
        <input
          aria-label="Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </label>
      <label>
        API key
        <input
          aria-label="API key"
          type="password"
          autoComplete="off"
          placeholder={hadApiKey ? '•••••• (leave blank to keep)' : ''}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>

      <KeyValueEditor title="Additional config" entries={extra} onChange={setExtra} />

      <div className="form-actions">
        <button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      {message ? (
        <p role="status" data-testid="connector-save-status">
          {message}
        </p>
      ) : null}
    </article>
  )
}
