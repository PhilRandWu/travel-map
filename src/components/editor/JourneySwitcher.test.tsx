import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { Journey, TravelData } from '@/types'
import JourneySwitcher from '@/components/editor/JourneySwitcher'

const data = dataJson as TravelData
const oldJourney: Journey = {
  id: 'j000',
  title: '京都秋日',
  startDate: '2024-11-02',
  endDate: '2024-11-06',
  theme: 'sage',
  coverPhotos: [],
}
const journeys = [...data.journeys, oldJourney]

describe('JourneySwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('groups journeys by year and filters them by title', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <JourneySwitcher
        journeys={journeys}
        journeyId="j002"
        disabled={false}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /当前旅程：成都慢夏/ }))
    expect(screen.getByText('2025')).toBeTruthy()
    expect(screen.getByText('2024')).toBeTruthy()

    await user.type(screen.getByRole('searchbox', { name: '搜索旅程' }), '江南')
    expect(screen.queryByText('成都慢夏')).toBeNull()
    await user.click(screen.getByRole('button', { name: /选择旅程：江南春行/ }))

    expect(onChange).toHaveBeenCalledWith('j001')
  })

  it('pins a journey and shows it in quick access', async () => {
    const user = userEvent.setup()
    render(
      <JourneySwitcher
        journeys={journeys}
        journeyId="j002"
        disabled={false}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /当前旅程：成都慢夏/ }))
    await user.click(screen.getByRole('button', { name: '将江南春行置顶' }))

    expect(screen.getByText('置顶旅程')).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消置顶江南春行' })).toBeTruthy()
  })

  it('closes the picker on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(
      <JourneySwitcher
        journeys={journeys}
        journeyId="j002"
        disabled={false}
        onChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: /当前旅程：成都慢夏/ })
    await user.click(trigger)
    expect(screen.getByRole('searchbox', { name: '搜索旅程' })).toBeTruthy()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('searchbox', { name: '搜索旅程' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when switching becomes unavailable', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <JourneySwitcher
        journeys={journeys}
        journeyId="j002"
        disabled={false}
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /当前旅程：成都慢夏/ }))
    rerender(
      <JourneySwitcher
        journeys={journeys}
        journeyId="j002"
        disabled
        onChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('searchbox', { name: '搜索旅程' })).toBeNull()
  })
})
