import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TransportTypePicker from '@/components/editor/TransportTypePicker'

describe('TransportTypePicker', () => {
  it('renders five accessible choices and reports a change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TransportTypePicker value="flight" onChange={onChange} />)

    expect(screen.getAllByRole('button')).toHaveLength(5)
    expect(screen.getByRole('button', { name: '飞机' }).getAttribute('aria-pressed'))
      .toBe('true')

    await user.click(screen.getByRole('button', { name: '轮船' }))
    expect(onChange).toHaveBeenCalledWith('ship')
  })
})
