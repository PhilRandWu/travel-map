import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildMemoryCollection } from '@/lib/memory'
import MemoryStage from '@/components/memory/MemoryStage'
import { MotionProvider } from '@/components/motion/MotionProvider'

const data = dataJson as TravelData

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

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

  it('clears the chapter transition after StrictMode replays effects', () => {
    vi.useFakeTimers()
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    function Harness() {
      const [index, setIndex] = useState(0)
      return (
        <MemoryStage
          collection={collection}
          mode="all"
          view="stage"
          photoIndex={index}
          onPhotoIndex={setIndex}
          onMode={() => undefined}
          onView={() => undefined}
          onClose={() => undefined}
        />
      )
    }

    render(
      <StrictMode>
        <MotionProvider>
          <Harness />
        </MotionProvider>
      </StrictMode>,
    )

    expect(screen.getByText('CHAPTER TRANSITION')).toBeTruthy()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('CHAPTER TRANSITION')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '下一张' }))
    expect(screen.getByText('西湖暮色')).toBeTruthy()
  })

  it('opens the stage immediately from a constellation card', async () => {
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('CSS', { escape: (value: string) => value.replaceAll('"', '\\"') })
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j002' })
    const onPhotoIndex = vi.fn()
    const onView = vi.fn()

    render(
      <MotionProvider>
        <MemoryStage
          collection={collection}
          mode="all"
          view="constellation"
          photoIndex={0}
          onPhotoIndex={onPhotoIndex}
          onMode={() => undefined}
          onView={onView}
          onClose={() => undefined}
        />
      </MotionProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: '火锅 火锅' }))

    expect(onPhotoIndex).toHaveBeenCalledWith(1)
    expect(onView).toHaveBeenCalledWith('stage')
  })
})
