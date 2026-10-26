import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts'

function Harness({ blocked = false }: { blocked?: boolean }) {
  const [focusMode, setFocusMode] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  useWorkspaceShortcuts({
    blocked,
    onToggleFocus: () => setFocusMode((current) => !current),
    onExitFocus: () => setFocusMode(false),
    onCommandOpen: () => setCommandOpen(true),
  })

  return (
    <>
      <span data-testid="focus">{String(focusMode)}</span>
      <span data-testid="command">{String(commandOpen)}</span>
      <input aria-label="测试输入框" />
    </>
  )
}

describe('useWorkspaceShortcuts', () => {
  it('toggles focus mode with F and opens search with Cmd/Ctrl+K', () => {
    render(<Harness />)

    fireEvent.keyDown(window, { key: 'f' })
    expect(screen.getByTestId('focus').textContent).toBe('true')

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByTestId('command').textContent).toBe('true')
  })

  it('does not toggle focus while typing in a form field', () => {
    render(<Harness />)

    fireEvent.keyDown(screen.getByLabelText('测试输入框'), { key: 'f' })

    expect(screen.getByTestId('focus').textContent).toBe('false')
  })

  it('leaves shortcuts to an open modal layer', () => {
    render(<Harness blocked />)

    fireEvent.keyDown(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(screen.getByTestId('focus').textContent).toBe('false')
    expect(screen.getByTestId('command').textContent).toBe('false')
  })

  it('exits focus mode with Escape', () => {
    render(<Harness />)

    fireEvent.keyDown(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByTestId('focus').textContent).toBe('false')
  })
})
