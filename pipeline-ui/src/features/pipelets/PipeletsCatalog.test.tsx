import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PipeletsCatalogPage } from './PipeletsCatalogPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import type { PipeletCatalogEntry } from './catalogFilter'

const CATALOG: PipeletCatalogEntry[] = [
  {
    id: 'plet-rest-source',
    name: 'REST Source',
    category: 'Source',
    version: '1.0.0',
    runtime: 'Java',
    description: 'HTTP',
  },
  {
    id: 'plet-json-transform',
    name: 'JSON Transform',
    category: 'Processor',
    version: '1.0.0',
    runtime: 'Java',
    description: 'Map',
  },
  {
    id: 'plet-s3-destination',
    name: 'S3 Destination',
    category: 'Destination',
    version: '1.0.0',
    runtime: 'Java',
    description: 'Write',
  },
]

describe('PipeletsCatalog', () => {
  it('renders at least one card by default', () => {
    renderWithProviders(<PipeletsCatalogPage catalog={CATALOG} />)
    expect(screen.getAllByTestId('pipelet-card').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('catalog-count')).toHaveTextContent('Showing 3 of 3')
  })

  it('reduces card count when category filter applied', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PipeletsCatalogPage catalog={CATALOG} />)

    await user.click(screen.getByRole('tab', { name: 'Source' }))
    expect(screen.getAllByTestId('pipelet-card')).toHaveLength(1)
    expect(screen.getByText('REST Source')).toBeInTheDocument()
    expect(screen.getByTestId('catalog-count')).toHaveTextContent('Showing 1 of 3')
  })

  it('shows Register for admin stub session', () => {
    renderWithProviders(<PipeletsCatalogPage catalog={CATALOG} />)
    expect(
      screen.getByRole('button', { name: 'Register Pipelet' }),
    ).toBeInTheDocument()
  })
})
