import { useState, type FormEvent } from 'react'
import type { CreateTenantServiceRequest, ServiceType } from '../../api/types'
import { validateServiceForm, type FieldErrors } from '../forms/validation'

type Props = {
  serviceTypes: ServiceType[]
  onSubmit: (body: CreateTenantServiceRequest) => Promise<void> | void
  onCancel?: () => void
}

export function ServiceForm({ serviceTypes, onSubmit, onCancel }: Props) {
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?.id ?? '')
  const [vendor, setVendor] = useState('')
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = validateServiceForm({ serviceTypeId, vendor, name })
    setErrors(next)
    if (Object.keys(next).length > 0) {
      return
    }
    setSubmitting(true)
    try {
      const tenantConfig: Record<string, unknown> = {}
      if (clientId.trim()) {
        tenantConfig.client_id = clientId.trim()
      }
      if (clientSecret.trim()) {
        tenantConfig.client_secret = clientSecret.trim()
      }
      await onSubmit({
        serviceTypeId,
        vendor: vendor.trim(),
        name: name.trim(),
        tenantConfig,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit} noValidate>
      <h2>Create service</h2>

      <label>
        Type
        <select
          aria-label="Service type"
          value={serviceTypeId}
          onChange={(e) => setServiceTypeId(e.target.value)}
        >
          <option value="">Select type</option>
          {serviceTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
            </option>
          ))}
        </select>
        {errors.serviceTypeId ? (
          <span role="alert" className="field-error">
            {errors.serviceTypeId}
          </span>
        ) : null}
      </label>

      <label>
        Vendor
        <input
          aria-label="Vendor"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="e.g. StubAuth"
        />
        {errors.vendor ? (
          <span role="alert" className="field-error">
            {errors.vendor}
          </span>
        ) : null}
      </label>

      <label>
        Name
        <input
          aria-label="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name ? (
          <span role="alert" className="field-error">
            {errors.name}
          </span>
        ) : null}
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
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Create'}
        </button>
        {onCancel ? (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
