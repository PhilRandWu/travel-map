import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildMemoryCollection } from '@/lib/memory'
import MemoryStage from '@/components/memory/MemoryStage'
import { MotionProvider } from '@/components/motion/MotionProvider'

const data = dataJson as TravelData

describe('MemoryStage', () => {
  it('switches photos and closes with Escape', async () => {
    const collection = buildMemoryCollection(data, { kind: 'visit', visitId: 'v001' })
    const onClose = vi.fn()
    function Harness() {
      const [index, setIndex] = useState(0)
      return (
        <>
          <button type="button" onClick={() => undefined}>照片入口</button>
          {index < 100 && (
            <MemoryStage
              collection={collection}
              mode="all"
              view="stage"
              photoIndex={index}
              onPhotoIndex={setIndex}
              onMode={() => undefined}
              onView={() => undefined}
              onClose={onClose}
            />
          )}
        </>
      )
    }
    render(
      <MotionProvider>
        <Harness />
      </MotionProvider>,
    )
    await waitFor(() => expect(screen.getByRole('dialog', { name: /照片回忆/ })).toBeTruthy())
    await userEvent.click(screen.getByRole('button', { name: '下一张' }))
    expect(screen.getByText('西湖暮色')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
