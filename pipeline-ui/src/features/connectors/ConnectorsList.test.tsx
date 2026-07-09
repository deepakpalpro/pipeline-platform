import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { ConnectorsPage } from './ConnectorsPage'
import { renderWithProviders } from '../../test/renderWithProviders'

describe('ConnectorsList', () => {
  it('renders fixture connector rows from MSW', async () => {
    renderWithProviders(<ConnectorsPage />, {
      initialEntries: ['/connectors'],
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Orders API/ }),
      ).toBeInTheDocument()
    })
  })
})
