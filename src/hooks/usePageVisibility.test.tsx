import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { usePageVisibility } from '@/components/motion/usePageVisibility'

const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden')

afterEach(() => {
  if (originalHidden) {
    Object.defineProperty(document, 'hidden', originalHidden)
  }
})

describe('usePageVisibility', () => {
  it('tracks document visibility changes', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    const { result } = renderHook(() => usePageVisibility())
    expect(result.current).toBe(false)

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(result.current).toBe(true)
  })
})
