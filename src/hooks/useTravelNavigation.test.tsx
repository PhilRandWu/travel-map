import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { useTravelNavigation } from '@/hooks/useTravelNavigation'

const data = dataJson as TravelData

function Harness() {
  const { state, actions } = useTravelNavigation(data)
  return (
    <>
      <output data-testid="scope">
        {state.scope.kind === 'journey' ? state.scope.journeyId : 'archive'}
      </output>
      <output data-testid="selection">{state.selection.kind}</output>
      <output data-testid="photo">{state.photo?.file ?? 'none'}</output>
      <button type="button" onClick={() => actions.openJourney('j001')}>
        打开江南
      </button>
      <button type="button" onClick={() => actions.openVisit('v001', 'hangzhou')}>
        打开杭州
      </button>
      <button
        type="button"
        onClick={() => actions.openPhoto('v001', 'hangzhou', '02.svg')}
      >
        打开照片
      </button>
    </>
  )
}

describe('useTravelNavigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('restores a visit photo from the URL hash', () => {
    window.history.replaceState(
      null,
      '',
      '/#journey=j001&city=hangzhou&visit=v001&photo=v001%2F02.svg',
    )
    render(<Harness />)

    expect(screen.getByTestId('scope').textContent).toBe('j001')
    expect(screen.getByTestId('selection').textContent).toBe('visit')
    expect(screen.getByTestId('photo').textContent).toBe('02.svg')
  })

  it('writes navigation changes into browser history', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '打开江南' }))
    await waitFor(() => expect(window.location.hash).toContain('journey=j001'))

    await user.click(screen.getByRole('button', { name: '打开杭州' }))
    await waitFor(() => expect(window.location.hash).toContain('visit=v001'))

    await user.click(screen.getByRole('button', { name: '打开照片' }))
    await waitFor(() => expect(window.location.hash).toContain('photo=v001%2F02.svg'))
  })

  it('follows browser back/forward navigation', async () => {
    render(<Harness />)
    window.history.pushState(null, '', '/#journey=j002&trip=t004')

    fireEvent.popState(window)

    await waitFor(() => expect(screen.getByTestId('scope').textContent).toBe('j002'))
    expect(screen.getByTestId('selection').textContent).toBe('trip')
  })
})
