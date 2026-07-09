import type { PipeletCatalogEntry } from '../../pipelets/catalogFilter'

type Props = {
  items: PipeletCatalogEntry[]
  onAdd: (item: PipeletCatalogEntry) => void
}

export function PipeletPalette({ items, onAdd }: Props) {
  return (
    <aside className="builder-palette" aria-label="Pipelet palette">
      <h2>Palette</h2>
      <ul className="palette-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="palette-item"
              onClick={() => onAdd(item)}
            >
              <span className="list-item-title">{item.name}</span>
              <span className="list-item-meta">
                {item.category} · {item.runtime}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
