import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAdaptiveMotion } from '@/components/motion/useAdaptiveMotion'
import { SceneClockProvider } from '@/components/scene/SceneClockProvider'

afterEach(() => vi.restoreAllMocks())

const wrapper = ({ children }: { children: ReactNode }) => (
  <SceneClockProvider>{children}</SceneClockProvider>
)

describe('useAdaptiveMotion', () => {
  it('lowers one level after a low-fps window', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const { result } = renderHook(
      () => useAdaptiveMotion('immersive'),
      { wrapper },
    )
    act(() => result.current.recordWindow(40, 2000))
    expect(result.current.cap).toBe('cinematic')
  })
})
