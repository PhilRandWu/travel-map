import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PhotoDropzone from '@/components/editor/PhotoDropzone'

const storeLocalPhoto = vi.hoisted(() => vi.fn())

vi.mock('@/lib/localPhotoStore', () => ({ storeLocalPhoto }))

describe('PhotoDropzone', () => {
  beforeEach(() => {
    storeLocalPhoto.mockReset()
  })

  it('keeps the form busy until storage settles and warns on failure', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBusyChange = vi.fn()
    let finishStore: (stored: boolean) => void = () => undefined
    storeLocalPhoto.mockReturnValue(new Promise<boolean>((resolve) => {
      finishStore = resolve
    }))

    render(
      <PhotoDropzone
        visitId="v004"
        photos={[]}
        onChange={onChange}
        onBusyChange={onBusyChange}
      />,
    )
    await user.upload(
      screen.getByLabelText('选择照片'),
      new File(['photo'], '01.svg', { type: 'image/svg+xml' }),
    )

    await waitFor(() => expect(onBusyChange).toHaveBeenCalledWith(true))
    finishStore(false)
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false))

    expect(onChange).toHaveBeenCalledWith([{ file: '01.svg' }])
    expect(screen.getByRole('alert').textContent).toContain('无法写入浏览器照片库')
  })

  it('toggles featured state for a photo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PhotoDropzone
        visitId="v001"
        photos={[{ file: '01.svg', caption: '暮色' }]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '将照片设为精选' }))

    expect(onChange).toHaveBeenCalledWith([
      { file: '01.svg', caption: '暮色', featured: true },
    ])
  })

  it('edits the visual focal point within normalized bounds', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PhotoDropzone
        visitId="v001"
        photos={[{ file: '01.svg', caption: '暮色' }]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '调整照片 1 焦点' }))
    fireEvent.change(screen.getByLabelText('照片 1 水平焦点'), {
      target: { value: '72' },
    })

    expect(onChange).toHaveBeenLastCalledWith([
      {
        file: '01.svg',
        caption: '暮色',
        focalPoint: { x: 0.72, y: 0.5 },
      },
    ])
  })
})
