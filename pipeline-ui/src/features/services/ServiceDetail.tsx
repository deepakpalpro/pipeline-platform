import { displayConfigValue } from '../../api/secrets'
import type { TenantService } from '../../api/types'

type Props = {
  service: TenantService
}

export function ServiceDetail({ service }: Props) {
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
