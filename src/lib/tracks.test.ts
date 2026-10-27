import { describe, expect, it } from 'vitest'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'

const base: TravelData = {
  meta: { owner: 't', homeCity: 'beijing', version: 2 },
  cities: [
    { id: 'beijing', name: '北京', lat: 39.9042, lng: 116.4074, province: '北京', country: '中国' },
    { id: 'shanghai', name: '上海', lat: 31.2304, lng: 121.4737, province: '上海', country: '中国' },
    { id: 'jiaxing', name: '嘉兴', lat: 30.7522, lng: 120.7555, province: '浙江', country: '中国' },
  ],
  journeys: [],
  trips: [],
  visits: [],
}

const withTrips = (trips: TravelData['trips']): TravelData => ({
  ...base,
  trips,
})

describe('buildTracks', () => {
  it('makes one route with full stops and ordered legs', () => {
    const [route] = buildTracks(withTrips([
      {
        id: 't1',
        journeyId: 'j-test',
        date: '2025-05-01',
        type: 'ship',
        from: 'beijing',
        to: 'shanghai',
        waypoints: ['jiaxing'],
        note: '夜航',
      },
    ])).routes

    expect(route.type).toBe('ship')
    expect(route.stops.map((city) => city.id))
      .toEqual(['beijing', 'jiaxing', 'shanghai'])
    expect(route.legs.map((leg) => [leg.from.id, leg.to.id]))
      .toEqual([['beijing', 'jiaxing'], ['jiaxing', 'shanghai']])
    expect(route.label).toBe('2025-05-01 · 北京 → 嘉兴 → 上海 · 夜航')
    expect(route.points[0]).toEqual([39.9042, 116.4074])
    expect(route.points.at(-1)).toEqual([31.2304, 121.4737])
    expect(route.points).toContainEqual([30.7522, 120.7555])
  })

  it.each(['flight', 'train', 'metro', 'ship', 'car'] as const)(
    'uses registry styling for %s',
    (type) => {
      const [route] = buildTracks(withTrips([
        {
          id: 't1',
          journeyId: 'j-test',
          date: '2025-05-01',
          type,
          from: 'beijing',
          to: 'shanghai',
          waypoints: [],
        },
      ])).routes
      const mode = getTransportMode(type)
      expect(route.color).toBe(mode.route.colorHex)
      expect(route.routeShape).toBe(mode.route.shape)
    },
  )

  it('separates each flight leg and repeated surface corridors', () => {
    const flights = buildTracks(withTrips([
      {
        id: 'f1',
        journeyId: 'j-test',
        date: '2025-05-01',
        type: 'flight',
        from: 'beijing',
        to: 'shanghai',
        waypoints: ['jiaxing'],
      },
      {
        id: 'f2',
        journeyId: 'j-test',
        date: '2025-05-02',
        type: 'flight',
        from: 'shanghai',
        to: 'beijing',
        waypoints: ['jiaxing'],
      },
    ])).routes
    expect(flights[0].legs).toHaveLength(2)
    expect(flights[1].legs[0].altitude)
      .toBeGreaterThan(flights[0].legs[1].altitude)

    const surface = buildTracks(withTrips([
      {
        id: 's1',
        journeyId: 'j-test',
        date: '2025-05-01',
        type: 'train',
        from: 'beijing',
        to: 'shanghai',
        waypoints: [],
      },
      {
        id: 's2',
        journeyId: 'j-test',
        date: '2025-05-02',
        type: 'car',
        from: 'shanghai',
        to: 'beijing',
        waypoints: [],
      },
    ])).routes
    expect(surface[0].points[16]).not.toEqual(surface[1].points[16])
  })

  it('skips routes with any missing city', () => {
    expect(buildTracks(withTrips([
      {
        id: 't1',
        journeyId: 'j-test',
        date: '2025-05-01',
        type: 'car',
        from: 'beijing',
        to: 'nowhere',
        waypoints: [],
      },
    ])).routes).toEqual([])
  })
})
