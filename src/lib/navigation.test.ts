import { describe, expect, it } from 'vitest'
import {
  INITIAL_NAVIGATION_STATE,
  navigationReducer,
  parseNavigationHash,
  sanitizeNavigationState,
  serializeNavigationHash,
} from '@/lib/navigation'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'

const data = dataJson as TravelData

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
      photo: null,
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
    expect(next.photo).toBeNull()
  })

  it('does not keep a place card open for trip selection', () => {
    const next = navigationReducer(INITIAL_NAVIGATION_STATE, {
      type: 'open-trip',
      tripId: 't001',
    })

    expect(next.selection).toEqual({ kind: 'trip', tripId: 't001' })
    expect(next.cardCityId).toBeNull()
    expect(next.photo).toBeNull()
  })

  it('returns to archive and clears every lower layer', () => {
    const next = navigationReducer(
      {
        scope: { kind: 'journey', journeyId: 'j001' },
        selection: { kind: 'city', cityId: 'hangzhou' },
        cardCityId: 'hangzhou',
        photo: null,
      },
      { type: 'open-archive' },
    )

    expect(next).toEqual(INITIAL_NAVIGATION_STATE)
  })

  it('serializes and restores a visit photo deep link', () => {
    const state = {
      scope: { kind: 'journey' as const, journeyId: 'j001' },
      selection: { kind: 'visit' as const, visitId: 'v001' },
      cardCityId: 'hangzhou',
      photo: { visitId: 'v001', file: '02.svg' },
    }
    const hash = serializeNavigationHash(state)

    expect(parseNavigationHash(hash)).toEqual(state)
    expect(hash).toContain('journey=j001')
    expect(hash).toContain('visit=v001')
    expect(hash).toContain('photo=v001')
  })

  it('parses trip links without leaving a place chapter open', () => {
    const state = parseNavigationHash('#journey=j001&trip=t002')

    expect(state.selection).toEqual({ kind: 'trip', tripId: 't002' })
    expect(state.cardCityId).toBeNull()
  })

  it('drops links that no longer exist in the current archive', () => {
    const state = sanitizeNavigationState({
      scope: { kind: 'journey', journeyId: 'missing' },
      selection: { kind: 'visit', visitId: 'v001' },
      cardCityId: 'hangzhou',
      photo: { visitId: 'v001', file: '02.svg' },
    }, data)

    expect(state).toEqual(INITIAL_NAVIGATION_STATE)
  })
})
