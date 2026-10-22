import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData, Visit } from '@/types'
import {
  getHomeCity,
  getOtherJourneyTrips,
  getJourneyVisits,
  groupJourneysByYear,
  scopeTravelData,
  sortJourneysNewestFirst,
  summarizeJourney,
} from '@/lib/journeys'

const data = dataJson as TravelData

describe('journey derivations', () => {
  it('sorts newest journeys first and groups by start year', () => {
    expect(sortJourneysNewestFirst(data.journeys).map((journey) => journey.id))
      .toEqual(['j002', 'j001'])
    expect(groupJourneysByYear(data.journeys)).toEqual([
      { year: 2025, journeys: [data.journeys[1], data.journeys[0]] },
    ])
  })

  it('filters trips and visits through JourneyScope', () => {
    const scoped = scopeTravelData(data, { kind: 'journey', journeyId: 'j001' })

    expect(scoped.trips.map((trip) => trip.id)).toEqual(['t001', 't002', 't003'])
    expect(scoped.visits.map((visit) => visit.id)).toEqual(['v001', 'v002'])
  })

  it('isolates the same city in different journeys', () => {
    const cloned = structuredClone(data)
    const repeated: Visit = {
      ...cloned.visits[0],
      id: 'v-repeat',
      journeyId: 'j002',
      arriveDate: '2025-06-11',
      leaveDate: '2025-06-12',
    }
    cloned.visits.push(repeated)

    expect(getJourneyVisits(cloned, 'j001').map((visit) => visit.id)).toEqual(['v001', 'v002'])
    expect(getJourneyVisits(cloned, 'j002').map((visit) => visit.id)).toEqual(['v003', 'v-repeat'])
  })

  it('summarizes covers, photos and destination cities', () => {
    const summary = summarizeJourney(data, data.journeys[0])

    expect(summary.coverSources).toHaveLength(3)
    expect(summary.photoCount).toBe(5)
    expect(summary.distanceKm).toBeGreaterThan(0)
    expect(summary.destinationCityIds).toEqual(['hangzhou', 'shanghai'])
  })

  it('resolves the home city without creating a destination visit', () => {
    expect(getHomeCity(data)?.name).toBe('北京')
    expect(scopeTravelData(data, { kind: 'archive' }).visits.some(
      (visit) => visit.city === data.meta.homeCity,
    )).toBe(false)
  })

  it('keeps other journeys available only for the opt-in stardust layer', () => {
    expect(getOtherJourneyTrips(data, 'j001').map((trip) => trip.id))
      .toEqual(['t004', 't005'])
    expect(getOtherJourneyTrips(data, 'j002').map((trip) => trip.id))
      .toEqual(['t001', 't002', 't003'])
  })
})
