import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import PlaceChapter from '@/components/journey/PlaceChapter'

const data = dataJson as TravelData

describe('PlaceChapter', () => {
  it('shows the active visit collage and opens its memory', async () => {
    const onOpenMemory = vi.fn()
    render(
      <PlaceChapter
        data={data}
        cityId="hangzhou"
        activeVisitId="v001"
        selection={{ kind: 'visit', visitId: 'v001' }}
        onSelectVisit={() => undefined}
        onSelectTrip={() => undefined}
        onOpenMemory={onOpenMemory}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('heading', { name: '杭州' })).toBeTruthy()
    expect(screen.getByAltText('西湖暮色')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: '进入照片回忆' }))
    expect(onOpenMemory).toHaveBeenCalledWith({ kind: 'visit', visitId: 'v001' }, 0)
  })

  it('disables the memory action when the visit has no photos', () => {
    const cloned = structuredClone(data)
    cloned.visits[0].photos = []
    render(
      <PlaceChapter
        data={cloned}
        cityId="hangzhou"
        activeVisitId="v001"
        selection={{ kind: 'city', cityId: 'hangzhou' }}
        onSelectVisit={() => undefined}
        onSelectTrip={() => undefined}
        onOpenMemory={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect((screen.getByRole('button', { name: '暂无照片' }) as HTMLButtonElement).disabled)
      .toBe(true)
  })
})
