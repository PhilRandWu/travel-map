import { describe, expect, it } from 'vitest'
import { clampZoom, getSwipeDirection } from '@/lib/gesture'

describe('memory gestures', () => {
  it('detects horizontal swipes and ignores vertical motion', () => {
    expect(getSwipeDirection(200, 60, 80, 64)).toBe('next')
    expect(getSwipeDirection(80, 60, 200, 62)).toBe('previous')
    expect(getSwipeDirection(100, 20, 100, 180)).toBeNull()
  })

  it('clamps zoom to 1–3x', () => {
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(2.2)).toBe(2.2)
    expect(clampZoom(4)).toBe(3)
  })
})
