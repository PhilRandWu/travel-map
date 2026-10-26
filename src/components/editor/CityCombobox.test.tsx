import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import CityCombobox from '@/components/editor/CityCombobox'

const data = tripsJson as TravelData

describe('CityCombobox', () => {
  it('autocompletes a city and returns its coordinates', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CityCombobox
        data={data}
        label="到访城市"
        value={null}
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText(/到访城市/)
    await user.click(input)
    await user.type(input, '杭州')
    await user.click(screen.getByRole('option', { name: /杭州/ }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'hangzhou',
      name: '杭州',
      lat: 30.2741,
      lng: 120.1551,
    }))
  })

  it('creates a custom city with typed coordinates', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CityCombobox
        data={data}
        label="到访城市"
        value={null}
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText(/到访城市/)
    await user.click(input)
    await user.type(input, '绍兴')
    await user.click(screen.getByRole('option', { name: /新建城市/ }))
    await user.type(screen.getByLabelText('纬度'), '30.03')
    await user.type(screen.getByLabelText('经度'), '120.58')
    await user.click(screen.getByRole('button', { name: '创建并使用' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: 'city',
      name: '绍兴',
      lat: 30.03,
      lng: 120.58,
    }))
  })

  it('does not select an excluded city with Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CityCombobox
        data={data}
        label="到访城市"
        value={null}
        excludeCityIds={['beijing']}
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText(/到访城市/)
    await user.type(input, '北京')
    await user.keyboard('{Enter}')

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/常居城市，不能创建旅行到访/)).toBeTruthy()
  })
})
