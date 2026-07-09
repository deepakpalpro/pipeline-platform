export type PipeletCategory = 'Source' | 'Processor' | 'Destination'

export type PipeletRuntime = 'Java' | 'Python' | 'Binary'

export type PipeletCatalogEntry = {
  id: string
  name: string
  category: PipeletCategory
  version: string
  runtime: PipeletRuntime | string
  description: string
  configSchemaPreview?: Record<string, unknown>
}

export type CatalogFilterInput = {
  category?: PipeletCategory | 'All'
  search?: string
}

export function catalogFilter(
  items: PipeletCatalogEntry[],
  input: CatalogFilterInput = {},
): PipeletCatalogEntry[] {
  const category = input.category ?? 'All'
  const search = (input.search ?? '').trim().toLowerCase()

  return items.filter((item) => {
    if (category !== 'All' && item.category !== category) {
      return false
    }
    if (!search) {
      return true
    }
    return (
      item.name.toLowerCase().includes(search) ||
      item.id.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    )
  })
}
