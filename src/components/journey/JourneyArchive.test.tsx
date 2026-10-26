import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import JourneyArchive from '@/components/journey/JourneyArchive'
import { MotionProvider } from '@/components/motion/MotionProvider'

const data = dataJson as TravelData

describe('JourneyArchive', () => {
  it('shows newest journeys first and opens a journey', async () => {
    const onOpen = vi.fn()
    render(
      <MotionProvider>
        <JourneyArchive data={data} onOpenJourney={onOpen} onNewJourney={() => undefined} />
      </MotionProvider>,
    )

    const cards = screen.getAllByRole('button', { name: /打开旅程/ })
    expect(cards[0].getAttribute('aria-label')).toContain('成都慢夏')

    await userEvent.click(cards[0])
    expect(onOpen).toHaveBeenCalledWith('j002')
  })

  it('opens the all-journeys drawer grouped by year', async () => {
    render(
      <MotionProvider>
        <JourneyArchive
          data={data}
          onOpenJourney={() => undefined}
          onNewJourney={() => undefined}
        />
      </MotionProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: '全部旅程' }))

    expect(screen.getByRole('dialog', { name: '全部旅程' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '2025' })).toBeTruthy()
    expect(screen.getByText('2 个地点 · 5 张照片')).toBeTruthy()
  })

  it('opens the editor from the empty archive state', async () => {
    const onNewJourney = vi.fn()
    const empty = { ...data, journeys: [], visits: [], trips: [] }
    render(
      <MotionProvider>
        <JourneyArchive
          data={empty}
          onOpenJourney={() => undefined}
          onNewJourney={onNewJourney}
        />
      </MotionProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: '新增第一段旅程' }))

    expect(onNewJourney).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/trips\.json/)).toBeNull()
  })

  it('offers a new-journey action from the full archive', async () => {
    const onNewJourney = vi.fn()
    render(
      <MotionProvider>
        <JourneyArchive
          data={data}
          onOpenJourney={() => undefined}
          onNewJourney={onNewJourney}
        />
      </MotionProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: '全部旅程' }))
    await userEvent.click(screen.getByRole('button', { name: '新增旅程' }))

    expect(onNewJourney).toHaveBeenCalledTimes(1)
  })
})
