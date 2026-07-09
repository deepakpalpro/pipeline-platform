import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createService,
  getService,
  listServiceTypes,
  listServices,
} from '../../api/resources'
import type { CreateTenantServiceRequest } from '../../api/types'
import { useTenant } from '../../contexts/TenantContext'
import { ServiceDetail } from './ServiceDetail'
import { ServiceForm } from './ServiceForm'

export function ServicesPage() {
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const servicesQuery = useQuery({
    queryKey: ['services', tenantId],
    queryFn: () => listServices(tenantId),
  })

  const typesQuery = useQuery({
    queryKey: ['service-types', tenantId],
    queryFn: () => listServiceTypes(tenantId),
  })

  const detailQuery = useQuery({
    queryKey: ['services', tenantId, detailId],
    queryFn: () => getService(tenantId, detailId!),
    enabled: Boolean(detailId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateTenantServiceRequest) =>
      createService(tenantId, body),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['services', tenantId] })
      setCreating(false)
      setDetailId(created.id)
    },
  })

  const services = servicesQuery.data ?? []

  return (
    <section className="table-page" aria-label="Services">
      <div className="panel-header">
        <h1>Services</h1>
        <button type="button" onClick={() => setCreating(true)}>
          New
        </button>
      </div>

      {creating ? (
        <ServiceForm
          serviceTypes={typesQuery.data ?? []}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await createMutation.mutateAsync(body)
          }}
        />
      ) : null}

      {servicesQuery.isLoading ? <p className="muted">Loading…</p> : null}
      {servicesQuery.isError ? (
        <p role="alert">Failed to load services</p>
      ) : null}

      <table className="entity-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Vendor</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setDetailId(s.id)}
                >
                  {s.name}
                </button>
              </td>
              <td>{s.vendor}</td>
              <td>{s.serviceTypeId}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detailId && detailQuery.data ? (
        <div className="detail-panel">
          <ServiceDetail service={detailQuery.data} />
          <button type="button" className="secondary" onClick={() => setDetailId(null)}>
            Close
          </button>
        </div>
      ) : null}
    </section>
  )
}
