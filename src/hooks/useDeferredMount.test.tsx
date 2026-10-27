import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDeferredMount } from '@/hooks/useDeferredMount'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDeferredMount', () => {
  it('defers mounting until the first animation frame', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return 17
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const { result } = renderHook(() => useDeferredMount())

    expect(result.current).toBe(false)
    act(() => frames[0](0))
    expect(result.current).toBe(true)
  })
})
