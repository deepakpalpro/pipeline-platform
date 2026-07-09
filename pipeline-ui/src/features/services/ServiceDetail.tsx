import { useEffect, useState } from 'react'
import { displayConfigValue, isSecretKey, REDACTED } from '../../api/secrets'
import type { TenantService, UpdateTenantServiceRequest } from '../../api/types'
import { KeyValueEditor } from '../forms/KeyValueEditor'

type Props = {
  service: TenantService
  onSave?: (id: string, body: UpdateTenantServiceRequest) => Promise<void> | void
  saving?: boolean
}

function splitServiceConfig(config: Record<string, unknown>) {
  const { client_id: clientId, client_secret: clientSecret, ...extra } = config
  return {
    clientId: clientId == null ? '' : String(clientId),
    clientSecret:
      clientSecret == null ||
      clientSecret === REDACTED ||
      String(clientSecret) === '***'
        ? ''
        : String(clientSecret),
    hadSecret:
      clientSecret != null &&
      String(clientSecret).length > 0,
    extra: Object.fromEntries(
      Object.entries(extra).map(([k, v]) => [
        k,
        isSecretKey(k) && (v === REDACTED || v === '***') ? '' : v,
      ]),
    ),
  }
}

export function ServiceDetail({ service, onSave, saving }: Props) {
  const [name, setName] = useState(service.name)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [hadSecret, setHadSecret] = useState(false)
  const [extra, setExtra] = useState<Record<string, unknown>>({})
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setName(service.name)
    const split = splitServiceConfig(service.config)
    setClientId(split.clientId)
    setClientSecret(split.clientSecret)
    setHadSecret(split.hadSecret)
    setExtra(split.extra)
    setMessage(null)
  }, [service.id, service.name, service.config])

  async function handleSave() {
    if (!onSave) {
      return
    }
    const tenantConfig: Record<string, unknown> = { ...extra }
    if (clientId.trim()) {
      tenantConfig.client_id = clientId.trim()
    }
    if (clientSecret.trim()) {
      tenantConfig.client_secret = clientSecret.trim()
    } else if (hadSecret) {
      // Signal server/MSW to keep existing secret
      tenantConfig.client_secret = REDACTED
    }
    setMessage(null)
    try {
      await onSave(service.id, {
        name: name.trim() || service.name,
        tenantConfig,
      })
      setMessage('Saved')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    }
  }

  if (!onSave) {
    return (
      <article className="entity-detail" aria-label="Service detail">
        <h2>{service.name}</h2>
        <dl>
          <div>
            <dt>ID</dt>
            <dd>{service.id}</dd>
          </div>
          <div>
            <dt>Vendor</dt>
            <dd>{service.vendor}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{service.serviceTypeId}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{service.status}</dd>
          </div>
        </dl>
        <h3>Config</h3>
        <dl className="config-list">
          {Object.entries(service.config).map(([key, value]) => (
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
    <article className="entity-detail entity-form" aria-label="Service detail">
      <h2>Edit service</h2>
      <p className="muted">
        {service.id} · {service.vendor}
      </p>

      <label>
        Name
        <input
          aria-label="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Client ID
        <input
          aria-label="Client ID"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
      </label>
      <label>
        Client secret
        <input
          aria-label="Client secret"
          type="password"
          autoComplete="off"
          placeholder={hadSecret ? '•••••• (leave blank to keep)' : ''}
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </label>

      <KeyValueEditor title="Additional config" entries={extra} onChange={setExtra} />

      <div className="form-actions">
        <button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      {message ? (
        <p role="status" data-testid="service-save-status">
          {message}
        </p>
      ) : null}
    </article>
  )
}
