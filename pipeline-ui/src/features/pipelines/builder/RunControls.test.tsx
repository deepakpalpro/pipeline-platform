import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RunControls } from './RunControls'

describe('RunControls', () => {
  it('shows Deploy when pipeline is draft', async () => {
    const user = userEvent.setup()
    const onDeploy = vi.fn()
    render(
      <RunControls
        canRun
        status="DRAFT"
        onDryRun={() => undefined}
        onSave={() => undefined}
        onDeploy={onDeploy}
        onRun={() => undefined}
      />,
    )

    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('DRAFT')
    const deploy = screen.getByRole('button', { name: 'Deploy' })
    expect(deploy).toBeEnabled()
    await user.click(deploy)
    expect(onDeploy).toHaveBeenCalledOnce()
  })

  it('disables Deploy when already active', () => {
    render(
      <RunControls
        canRun
        status="ACTIVE"
        onDryRun={() => undefined}
        onSave={() => undefined}
        onDeploy={() => undefined}
        onRun={() => undefined}
      />,
    )

    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('ACTIVE')
    expect(screen.getByRole('button', { name: 'Deployed' })).toBeDisabled()
  })
})
