import { describe, expect, it } from 'vitest'
import {
  downgradeMotionLevel,
  normalizeMotionLevel,
  resolveMotionLevel,
} from '@/lib/motion'

describe('motion level selection', () => {
  it('forces calm when reduced motion is enabled', () => {
    expect(resolveMotionLevel('immersive', false, true)).toBe('calm')
  })

  it('uses the lower of user preference and performance cap', () => {
    expect(resolveMotionLevel('immersive', false, false, 'cinematic')).toBe('cinematic')
    expect(resolveMotionLevel('calm', false, false, 'immersive')).toBe('calm')
  })

  it('normalizes persisted values and downgrades one step', () => {
    expect(normalizeMotionLevel('unknown')).toBe('cinematic')
    expect(downgradeMotionLevel('immersive')).toBe('cinematic')
    expect(downgradeMotionLevel('cinematic')).toBe('calm')
    expect(downgradeMotionLevel('calm')).toBe('calm')
  })
})
