import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { StepPropertiesPanel } from './StepPropertiesPanel'
import type { PipelineGraphNode } from './pipelineGraphReducer'

const node: PipelineGraphNode = {
  id: 'n2',
  position: { x: 0, y: 0 },
  data: {
    pipeletId: 'plet-json-transform',
    name: 'JSON Transform',
    category: 'Processor',
    connectorIds: [],
    serviceIds: [],
    config: {},
  },
}

describe('StepPropertiesPanel', () => {
  it('removes the selected step when Remove step is clicked', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    renderWithProviders(
      <StepPropertiesPanel
        node={node}
        connectors={[]}
        services={[]}
        onChange={() => undefined}
        onRemove={onRemove}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove step' }))
    expect(onRemove).toHaveBeenCalledWith('n2')
  })

  it('adds a config key/value via the config editor', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <StepPropertiesPanel
        node={node}
        connectors={[]}
        services={[]}
        onChange={onChange}
      />,
    )

    await user.type(screen.getByLabelText('Config key'), 'mapping')
    await user.type(screen.getByLabelText('Config value'), 'a=1')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onChange).toHaveBeenCalledWith('n2', {
      config: { mapping: 'a=1' },
    })
  })
})
