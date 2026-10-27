import { describe, expect, it } from 'vitest'
import {
  FALLBACK_TRANSPORT_MODE,
  TRANSPORT_MODES,
  TRANSPORT_TYPES,
  getTransportMode,
  isTransportType,
} from '@/lib/transportModes'

describe('transport modes', () => {
  it('registers all five modes in display order', () => {
    expect(TRANSPORT_TYPES).toEqual(['flight', 'train', 'metro', 'ship', 'car'])
  })

  it.each(TRANSPORT_TYPES)('%s has a complete visual and motion profile', (type) => {
    const mode = TRANSPORT_MODES[type]
    expect(mode.label).not.toBe('')
    expect(mode.iconPath).toMatch(/^\/vehicle-icons\//)
    expect(mode.route.colorHex).toMatch(/^#[0-9A-F]{6}$/)
    expect(mode.motion.phases).toHaveLength(5)
    expect(mode.motion.phases.reduce((sum, phase) => sum + phase.weight, 0))
      .toBeCloseTo(1)
    expect(mode.motion.minDurationMs).toBeGreaterThan(0)
    expect(mode.motion.maxDurationMs).toBeGreaterThan(mode.motion.minDurationMs)
    expect(mode.camera.altitude).toBeGreaterThan(0)
  })

  it('falls back safely for unknown runtime values', () => {
    expect(isTransportType('metro')).toBe(true)
    expect(isTransportType('rocket')).toBe(false)
    expect(getTransportMode('rocket').label).toBe(FALLBACK_TRANSPORT_MODE.label)
  })
})
