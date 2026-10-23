import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SceneClockProvider,
  useSceneClock,
} from '@/components/scene/SceneClockProvider'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SceneClockProvider>{children}</SceneClockProvider>
)

describe('SceneClockProvider', () => {
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrameId = 1

  beforeEach(() => {
    frames.clear()
    nextFrameId = 1
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      const id = nextFrameId++
      frames.set(id, callback)
      return id
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
      frames.delete(id)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('runs subscribers in priority order on one shared frame loop', () => {
    const { result } = renderHook(() => useSceneClock(), { wrapper })
    const calls: string[] = []
    const unsubscribers = [
      result.current.subscribe(() => calls.push('render'), 0),
      result.current.subscribe(() => calls.push('timeline'), -300),
      result.current.subscribe(() => calls.push('camera'), -100),
    ]

    expect(frames.size).toBe(1)
    const [frameId, frame] = [...frames.entries()][0]
    frames.delete(frameId)
    act(() => frame(16))

    expect(calls).toEqual(['timeline', 'camera', 'render'])
    expect(frames.size).toBe(1)

    unsubscribers.forEach((unsubscribe) => unsubscribe())
    expect(frames.size).toBe(0)
  })
})
