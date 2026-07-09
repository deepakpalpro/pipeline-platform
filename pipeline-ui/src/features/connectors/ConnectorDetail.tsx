import { displayConfigValue } from '../../api/secrets'
import type { TenantConnector } from '../../api/types'

type Props = {
  connector: TenantConnector | null
  emptyLabel?: string
}

export function ConnectorDetail({
  connector,
  emptyLabel = 'Select a connector',
}: Props) {
  if (!connector) {
    return <p className="muted">{emptyLabel}</p>
  }

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
