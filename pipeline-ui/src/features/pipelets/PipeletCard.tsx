import type { PipeletCatalogEntry } from './catalogFilter'

type Props = {
  pipelet: PipeletCatalogEntry
  onSelect?: (pipelet: PipeletCatalogEntry) => void
}

export function PipeletCard({ pipelet, onSelect }: Props) {
  return (
    <article className="pipelet-card" data-testid="pipelet-card">
      <header className="pipelet-card-header">
        <h3>{pipelet.name}</h3>
        <span className="badge category">{pipelet.category}</span>
      </header>
      <p className="pipelet-card-desc">{pipelet.description}</p>
      <footer className="pipelet-card-meta">
        <span className="badge runtime">{pipelet.runtime}</span>
        <span className="version">v{pipelet.version}</span>
        <code className="pipelet-id">{pipelet.id}</code>
      </footer>
      {onSelect ? (
        <button type="button" className="secondary" onClick={() => onSelect(pipelet)}>
          Details
        </button>
      ) : null}
    </article>
  )
}
