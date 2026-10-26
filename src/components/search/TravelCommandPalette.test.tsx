import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import TravelCommandPalette from '@/components/search/TravelCommandPalette'

const data = dataJson as TravelData

describe('TravelCommandPalette', () => {
  it('searches across photos and returns the selected target', async () => {
    const user = userEvent.setup()
    const onOpenResult = vi.fn()
    render(
      <TravelCommandPalette
        data={data}
        onOpenResult={onOpenResult}
        onRandomMemory={() => undefined}
        onClose={() => undefined}
      />,
    )

    await user.type(
      screen.getByRole('combobox', { name: '搜索旅程、地点、交通与照片' }),
      '西湖暮色',
    )
    await user.click(screen.getByRole('option', { name: /西湖暮色/ }))

    expect(onOpenResult).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'photo',
      journeyId: 'j001',
      visitId: 'v001',
      photoFile: '02.svg',
    }))
  })

  it('supports arrow navigation and Enter', async () => {
    const user = userEvent.setup()
    const onOpenResult = vi.fn()
    render(
      <TravelCommandPalette
        data={data}
        onOpenResult={onOpenResult}
        onRandomMemory={() => undefined}
        onClose={() => undefined}
      />,
    )

    const input = screen.getByRole('combobox', { name: '搜索旅程、地点、交通与照片' })
    await user.type(input, '成都')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onOpenResult).toHaveBeenCalled()
  })

  it('closes on Escape and exposes random memory', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onRandomMemory = vi.fn()
    render(
      <TravelCommandPalette
        data={data}
        onOpenResult={() => undefined}
        onRandomMemory={onRandomMemory}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: '拾起一段回忆' }))
    expect(onRandomMemory).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
