import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import DataArchivePanel from '@/components/editor/DataArchivePanel'

const clone = (): TravelData => JSON.parse(JSON.stringify(tripsJson)) as TravelData

describe('DataArchivePanel', () => {
  it('imports a valid JSON backup after confirmation', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const imported = clone()
    imported.journeys[0].title = '导入后的旅程'

    render(
      <DataArchivePanel data={clone()} storageError={null} onChange={onChange} />,
    )

    await user.upload(
      screen.getByLabelText('导入旅行 JSON'),
      new File([JSON.stringify(imported)], 'backup.json', { type: 'application/json' }),
    )
    expect(await screen.findByText(/覆盖当前 2 段旅程/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '确认导入' }))

    expect(onChange).toHaveBeenCalledOnce()
    expect((onChange.mock.calls[0][0] as TravelData).journeys[0].title)
      .toBe('导入后的旅程')
  })

  it('keeps the current data when JSON is invalid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DataArchivePanel data={clone()} storageError={null} onChange={onChange} />,
    )
    await user.upload(
      screen.getByLabelText('导入旅行 JSON'),
      new File(['{'], 'broken.json', { type: 'application/json' }),
    )

    expect(await screen.findByText(/JSON 无法解析/)).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows automatic save failures', () => {
    render(
      <DataArchivePanel
        data={clone()}
        storageError="浏览器本地存储空间不足"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('本地存储空间不足')
  })
})
