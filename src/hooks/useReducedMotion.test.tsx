import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from '@/hooks/useReducedMotion'

afterEach(() => vi.unstubAllGlobals())

describe('useReducedMotion', () => {
  it('reads the media query and responds to preference changes', () => {
    let matches = true
    const listeners = new Set<() => void>()
    const media = {
      get matches() {
        return matches
      },
      addEventListener: vi.fn((_: string, listener: () => void) => {
        listeners.add(listener)
      }),
      removeEventListener: vi.fn((_: string, listener: () => void) => {
        listeners.delete(listener)
      }),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => media))

    const { result, unmount } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)

    matches = false
    act(() => listeners.forEach((listener) => listener()))
    expect(result.current).toBe(false)

    unmount()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
