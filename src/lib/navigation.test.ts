import { describe, expect, it } from 'vitest'
import {
  INITIAL_NAVIGATION_STATE,
  navigationReducer,
} from '@/lib/navigation'

describe('travel navigation reducer', () => {
  it('opens a journey and clears selection', () => {
    const next = navigationReducer(
      { ...INITIAL_NAVIGATION_STATE, selection: { kind: 'trip', tripId: 't001' } },
      { type: 'open-journey', journeyId: 'j001' },
    )

    expect(next).toEqual({
      scope: { kind: 'journey', journeyId: 'j001' },
      selection: { kind: 'none' },
      cardCityId: null,
    })
  })

  it('opens a visit chapter and keeps its city context', () => {
    const next = navigationReducer(INITIAL_NAVIGATION_STATE, {
      type: 'open-visit',
      visitId: 'v001',
      cityId: 'hangzhou',
    })

    expect(next.selection).toEqual({ kind: 'visit', visitId: 'v001' })
    expect(next.cardCityId).toBe('hangzhou')
  })

  it('does not keep a place card open for trip selection', () => {
    const next = navigationReducer(INITIAL_NAVIGATION_STATE, {
      type: 'open-trip',
      tripId: 't001',
    })

    expect(next.selection).toEqual({ kind: 'trip', tripId: 't001' })
    expect(next.cardCityId).toBeNull()
  })

  it('returns to archive and clears every lower layer', () => {
    const next = navigationReducer(
      {
        scope: { kind: 'journey', journeyId: 'j001' },
        selection: { kind: 'city', cityId: 'hangzhou' },
        cardCityId: 'hangzhou',
      },
      { type: 'open-archive' },
    )

    expect(next).toEqual(INITIAL_NAVIGATION_STATE)
  })
})
