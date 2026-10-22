import { describe, expect, it } from 'vitest'
import { getRouteFlowWindow, getTrackBreathOpacity } from '@/lib/routeFlow'

describe('route flow window', () => {
  it('centers a short window on the route progress', () => {
    expect(getRouteFlowWindow(100, 0, 0.18)).toEqual({ start: 0, length: 18 })
    expect(getRouteFlowWindow(100, 0.5, 0.18)).toEqual({ start: 41, length: 18 })
    expect(getRouteFlowWindow(100, 1, 0.18)).toEqual({ start: 100, length: 0 })
  })

  it('keeps selected-track breathing slow and bounded', () => {
    expect(getTrackBreathOpacity(0)).toBeCloseTo(0.55)
    expect(getTrackBreathOpacity(2100)).toBeCloseTo(0.77)
    expect(getTrackBreathOpacity(4200)).toBeCloseTo(0.55)
    expect(getTrackBreathOpacity(2100, 'calm')).toBe(0.55)
  })
})
