import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import WaypointEditor from '@/components/editor/WaypointEditor'

const data = tripsJson as TravelData
const beijing = data.cities.find((city) => city.id === 'beijing')!
const hangzhou = data.cities.find((city) => city.id === 'hangzhou')!
const jiaxing = data.cities.find((city) => city.id === 'jiaxing')!
const chengdu = data.cities.find((city) => city.id === 'chengdu')!

describe('WaypointEditor', () => {
  it('adds, reorders and removes waypoints', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[jiaxing, chengdu]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '下移经停 1' }))
    expect(onChange).toHaveBeenLastCalledWith([chengdu, jiaxing])

    rerender(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[jiaxing]}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: '移除经停 1' }))
    expect(onChange).toHaveBeenLastCalledWith([])

    rerender(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[]}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: '+ 添加经停' }))
    expect(onChange).toHaveBeenLastCalledWith([null])
  })

  it('disables adding when four waypoints already exist', () => {
    render(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[jiaxing, null, null, null]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '+ 添加经停' }))
      .toHaveProperty('disabled', true)
  })
})
