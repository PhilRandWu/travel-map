import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import TravelEditor from '@/components/editor/TravelEditor'

const { pruneStoredPhotos } = vi.hoisted(() => ({
  pruneStoredPhotos: vi.fn(),
}))

vi.mock('@/lib/localPhotoStore', () => ({
  pruneStoredPhotos,
}))

const clone = (): TravelData => JSON.parse(JSON.stringify(tripsJson)) as TravelData

describe('TravelEditor', () => {
  it('defaults to the newest journey when opened from the archive', () => {
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /当前旅程：成都慢夏/ })).toBeTruthy()
  })

  it('adds a visit through the drawer form', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        initialJourneyId="j001"
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '+ 新增到访' }))
    const cityInput = screen.getByLabelText(/到访城市/)
    await user.click(cityInput)
    await user.type(cityInput, '苏州')
    await user.click(screen.getByRole('option', { name: /苏州/ }))
    await user.click(screen.getByRole('button', { name: '保存到访' }))

    expect(onChange).toHaveBeenCalledOnce()
    const next = onChange.mock.calls[0][0] as TravelData
    const added = next.visits.find((visit) => visit.id === 'v004')
    expect(added).toMatchObject({
      journeyId: 'j001',
      city: 'suzhou',
      arriveDate: '2025-05-01',
      leaveDate: '2025-05-01',
    })
    expect(next.cities.some((city) => city.id === 'suzhou')).toBe(true)
  })

  it('creates a journey through the drawer form', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '+ 新增旅程' }))
    const title = screen.getByLabelText(/旅程标题/)
    await user.clear(title)
    await user.type(title, '2026 京都秋日')
    await user.click(screen.getByRole('button', { name: '保存旅程' }))

    expect(onChange).toHaveBeenCalledOnce()
    const next = onChange.mock.calls[0][0] as TravelData
    expect(next.journeys).toHaveLength(3)
    expect(next.journeys.find((journey) => journey.id === 'j003')?.title)
      .toBe('2026 京都秋日')
  })

  it('updates the current journey title', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: '编辑旅程' }))
    const title = screen.getByLabelText(/旅程标题/)
    await user.clear(title)
    await user.type(title, '成都新夏')
    await user.click(screen.getByRole('button', { name: '保存旅程' }))

    const next = onChange.mock.calls[0][0] as TravelData
    expect(next.journeys.find((journey) => journey.id === 'j002')?.title)
      .toBe('成都新夏')
  })

  it('closes the journey picker before closing the editor on Escape', async () => {
    const user = userEvent.setup()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /当前旅程：成都慢夏/ }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('searchbox', { name: '搜索旅程' })).toBeNull()
    expect(screen.getByRole('dialog', { name: '旅行档案编辑器' })).toBeTruthy()
  })

  it('keeps dirty form content when Escape is cancelled', async () => {
    const user = userEvent.setup()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '编辑旅程' }))
    const title = screen.getByLabelText(/旅程标题/)
    await user.clear(title)
    await user.type(title, '未保存的旅程')
    await user.keyboard('{Escape}')

    expect(screen.getByText('有未保存的修改')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '继续编辑' }))

    expect((screen.getByLabelText(/旅程标题/) as HTMLInputElement).value)
      .toBe('未保存的旅程')
  })

  it('confirms before closing a dirty editor', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={vi.fn()}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: '+ 新增旅程' }))
    await user.type(screen.getByLabelText(/旅程标题/), ' 2')
    await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '放弃修改' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(pruneStoredPhotos).toHaveBeenCalledOnce()
  })

  it('duplicates the current journey settings', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '复制设置' }))

    const next = onChange.mock.calls[0][0] as TravelData
    expect(next.journeys).toHaveLength(3)
    expect(next.journeys.find((journey) => journey.id === 'j003')?.coverPhotos)
      .toEqual([])
    expect(screen.getByText('旅程设置已复制')).toBeTruthy()
  })

  it('deletes a journey only after confirmation', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '删除旅程' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/将同时移除/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '确认删除' }))

    const next = onChange.mock.calls[0][0] as TravelData
    expect(next.journeys.some((journey) => journey.id === 'j002')).toBe(false)
  })

  it('blocks saving a home-city visit with a visible error', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        initialJourneyId="j001"
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '+ 新增到访' }))
    const cityInput = screen.getByLabelText(/到访城市/)
    await user.type(cityInput, '北京')

    expect(screen.getByText(/常居城市，不能创建旅行到访/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存到访' })).toHaveProperty('disabled', true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('creates a ship trip with a waypoint and preserves it when changing modes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TravelEditor
        data={clone()}
        storageError={null}
        initialJourneyId="j001"
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /行程/ }))
    await user.click(screen.getByRole('button', { name: '+ 新增行程' }))
    await user.click(screen.getByRole('button', { name: '轮船' }))
    await user.click(screen.getByRole('button', { name: '+ 添加经停' }))
    await user.type(screen.getByLabelText(/出发城市/), '北京')
    await user.click(screen.getByRole('option', { name: /北京/ }))
    await user.type(screen.getByRole('combobox', { name: '经停 1' }), '嘉兴')
    await user.click(screen.getByRole('option', { name: /嘉兴/ }))
    await user.type(screen.getByLabelText(/到达城市/), '杭州')
    await user.click(screen.getByRole('option', { name: /杭州/ }))
    await user.click(screen.getByRole('button', { name: '汽车' }))
    await user.click(screen.getByRole('button', { name: '保存行程' }))

    expect(onChange).toHaveBeenCalledOnce()
    const next = onChange.mock.calls[0][0] as TravelData
    expect(next.trips.find((trip) => trip.id === 't006')).toMatchObject({
      type: 'car',
      from: 'beijing',
      to: 'hangzhou',
      waypoints: ['jiaxing'],
    })
  })
})
