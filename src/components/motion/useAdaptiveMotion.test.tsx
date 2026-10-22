import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAdaptiveMotion } from '@/components/motion/useAdaptiveMotion'

afterEach(() => vi.restoreAllMocks())

describe('useAdaptiveMotion', () => {
  it('lowers one level after a low-fps window', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const { result } = renderHook(() => useAdaptiveMotion('immersive'))
    act(() => result.current.recordWindow(40, 2000))
    expect(result.current.cap).toBe('cinematic')
  })
})
