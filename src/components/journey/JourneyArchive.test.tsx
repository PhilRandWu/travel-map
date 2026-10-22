import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import JourneyArchive from '@/components/journey/JourneyArchive'

const data = dataJson as TravelData

describe('JourneyArchive', () => {
  it('shows newest journeys first and opens a journey', async () => {
    const onOpen = vi.fn()
    render(<JourneyArchive data={data} onOpenJourney={onOpen} />)

    const cards = screen.getAllByRole('button', { name: /打开旅程/ })
    expect(cards[0].getAttribute('aria-label')).toContain('成都慢夏')

    await userEvent.click(cards[0])
    expect(onOpen).toHaveBeenCalledWith('j002')
  })

  it('opens the all-journeys drawer grouped by year', async () => {
    render(<JourneyArchive data={data} onOpenJourney={() => undefined} />)

    await userEvent.click(screen.getByRole('button', { name: '全部旅程' }))

    expect(screen.getByRole('dialog', { name: '全部旅程' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '2025' })).toBeTruthy()
  })
})
