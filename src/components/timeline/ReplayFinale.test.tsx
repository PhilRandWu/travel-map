import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { summarizeJourney } from '@/lib/journeys'
import ReplayFinale from '@/components/timeline/ReplayFinale'

const data = dataJson as TravelData
const journey = data.journeys.find((item) => item.id === 'j001')!

describe('ReplayFinale', () => {
  it('focuses the dialog and closes with Escape', async () => {
    const onClose = vi.fn()
    render(
      <ReplayFinale
        journey={journey}
        summary={summarizeJourney(data, journey)}
        onClose={onClose}
        onReplay={() => undefined}
      />,
    )

    const replay = screen.getByRole('button', { name: '再看一次' })
    await waitFor(() => expect(document.activeElement).toBe(replay))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
