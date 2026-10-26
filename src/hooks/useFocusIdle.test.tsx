import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFocusIdle } from '@/hooks/useFocusIdle'

function Harness({ active }: { active: boolean }) {
  const idle = useFocusIdle(active, 1000)
  return <output data-testid="idle">{String(idle)}</output>
}

describe('useFocusIdle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('dims after inactivity and wakes on pointer movement', () => {
    vi.useFakeTimers()
    render(<Harness active />)

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByTestId('idle').textContent).toBe('true')

    fireEvent.pointerMove(window)
    expect(screen.getByTestId('idle').textContent).toBe('false')
  })

  it('never becomes idle outside focus mode', () => {
    vi.useFakeTimers()
    render(<Harness active={false} />)

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByTestId('idle').textContent).toBe('false')
  })
})
