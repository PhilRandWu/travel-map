import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import JourneyPassport from '@/components/journey/JourneyPassport'

const data = dataJson as TravelData

describe('JourneyPassport', () => {
  it('shows journey title, dates and scoped metrics', () => {
    render(
      <JourneyPassport
        data={data}
        journey={data.journeys[0]}
        onStartReplay={() => undefined}
        onOpenMemory={() => undefined}
        showOtherJourneys={false}
        onShowOtherJourneysChange={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: '江南春行' })).toBeTruthy()
    expect(screen.getByText('2 个地点')).toBeTruthy()
    expect(screen.getByText('5 张照片')).toBeTruthy()
  })

  it('keeps other journeys off by default and exposes an explicit toggle', async () => {
    const onShowOtherJourneysChange = vi.fn()
    render(
      <JourneyPassport
        data={data}
        journey={data.journeys[0]}
        onStartReplay={() => undefined}
        onOpenMemory={() => undefined}
        showOtherJourneys={false}
        onShowOtherJourneysChange={onShowOtherJourneysChange}
      />,
    )

    const toggle = screen.getByRole('switch', { name: '显示其他旅程' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    await userEvent.click(toggle)
    expect(onShowOtherJourneysChange).toHaveBeenCalledWith(true)
  })
})
