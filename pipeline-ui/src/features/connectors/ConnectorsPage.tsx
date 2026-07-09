import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createConnector,
  listConnectorTypes,
  listConnectors,
} from '../../api/resources'
import type { CreateConnectorRequest, TenantConnector } from '../../api/types'
import { useTenant } from '../../contexts/TenantContext'
import { ConnectorDetail } from './ConnectorDetail'
import { ConnectorForm } from './ConnectorForm'

export function ConnectorsPage() {
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const connectorsQuery = useQuery({
    queryKey: ['connectors', tenantId],
    queryFn: () => listConnectors(tenantId),
  })

  const typesQuery = useQuery({
    queryKey: ['connector-types', tenantId],
    queryFn: () => listConnectorTypes(tenantId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateConnectorRequest) =>
      createConnector(tenantId, body),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      setCreating(false)
      setSelectedId(created.id)
    },
  })

  const connectors = connectorsQuery.data ?? []
  const selected: TenantConnector | null =
    connectors.find((c) => c.id === selectedId) ?? connectors[0] ?? null

  return (
    <section className="split-page" aria-label="Connectors">
      <div className="split-list">
        <div className="panel-header">
          <h1>Connectors</h1>
          <button type="button" onClick={() => setCreating(true)}>
            New
          </button>
        </div>
        {connectorsQuery.isLoading ? <p className="muted">Loading…</p> : null}
        {connectorsQuery.isError ? (
          <p role="alert">Failed to load connectors</p>
        ) : null}
        <ul className="entity-list">
          {connectors.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={
                  selected?.id === c.id ? 'list-item active' : 'list-item'
                }
                onClick={() => {
                  setSelectedId(c.id)
                  setCreating(false)
                }}
              >
                <span className="list-item-title">{c.name}</span>
                <span className="list-item-meta">{c.status}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="split-detail">
        {creating ? (
          <ConnectorForm
            connectorTypes={typesQuery.data ?? []}
            onCancel={() => setCreating(false)}
            onSubmit={async (body) => {
              await createMutation.mutateAsync(body)
            }}
          />
        ) : (
          <ConnectorDetail connector={selected} />
        )}
      </div>
    </section>
  )
}
