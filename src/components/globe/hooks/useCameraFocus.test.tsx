import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { describe, expect, it, vi } from 'vitest'
import { useCameraFocus } from '@/components/globe/hooks/useCameraFocus'
import { MotionProvider } from '@/components/motion/MotionProvider'

function wrapper({ children }: { children: ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>
}

describe('useCameraFocus', () => {
  it('does not start point focus while route direction is active', () => {
    const pointOfView = vi.fn(() => ({ lat: 0, lng: 0, altitude: 2.3 }))
    const globeRef = {
      current: { pointOfView } as unknown as GlobeMethods,
    }

    renderHook(() => useCameraFocus({
      globeRef,
      lastInteractRef: { current: -Infinity },
      cameraLockedRef: { current: false },
      litCities: [],
      selectedCityId: null,
      focusPoint: { lat: 28, lng: 108 },
      resetSignal: 0,
      suppressed: true,
    }), { wrapper })

    expect(pointOfView).not.toHaveBeenCalled()
  })
})
