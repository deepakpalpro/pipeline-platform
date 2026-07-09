import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ServiceForm } from './ServiceForm'
import { renderWithProviders } from '../../test/renderWithProviders'

const types = [{ id: 'stype-auth', type: 'AUTH', displayName: 'Auth' }]

describe('ServiceForm', () => {
  it('blocks submit without vendor', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithProviders(
      <ServiceForm serviceTypes={types} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText('Service name'), 'Auth A')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByText('Vendor is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits when vendor and name are set', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <ServiceForm serviceTypes={types} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText('Vendor'), 'StubAuth')
    await user.type(screen.getByLabelText('Service name'), 'Auth A')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledWith({
      serviceTypeId: 'stype-auth',
      vendor: 'StubAuth',
      name: 'Auth A',
      tenantConfig: {},
    })
  })
})
