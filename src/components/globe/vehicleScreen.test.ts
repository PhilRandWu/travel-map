import { describe, expect, it } from 'vitest'
import {
  isScreenPointVisible,
  smoothAngle,
} from '@/components/globe/vehicleScreen'

describe('isScreenPointVisible', () => {
  it('accepts points inside and on the viewport edges', () => {
    expect(isScreenPointVisible({ x: 0, y: 0 }, 931, 984)).toBe(true)
    expect(isScreenPointVisible({ x: 931, y: 984 }, 931, 984)).toBe(true)
    expect(isScreenPointVisible({ x: 465, y: 560 }, 931, 984)).toBe(true)
  })

  it('rejects points projected outside the viewport', () => {
    expect(isScreenPointVisible({ x: -1, y: 500 }, 931, 984)).toBe(false)
    expect(isScreenPointVisible({ x: 500, y: -80 }, 931, 984)).toBe(false)
    expect(isScreenPointVisible({ x: 1006, y: 500 }, 931, 984)).toBe(false)
  })
})

describe('smoothAngle', () => {
  it('produces the same turn for the same elapsed time at different frame rates', () => {
    const oneStep = smoothAngle(0, 90, 32)
    const twoSteps = smoothAngle(smoothAngle(0, 90, 16), 90, 16)
    expect(twoSteps).toBeCloseTo(oneStep, 10)
  })

  it('turns toward the shortest side of the angle boundary', () => {
    const result = smoothAngle(170, -170, 80)
    const delta = ((result - 170 + 540) % 360) - 180

    expect(delta).toBeGreaterThan(0)
    expect(delta).toBeLessThan(20)
  })
})
