import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData, TransportType } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildJourneySceneRoutes } from '@/lib/journeyScene'

const data = dataJson as TravelData
const allTypes: TransportType[] = ['flight', 'train', 'metro', 'ship', 'car']
const dataWithAllTypes: TravelData = {
  ...data,
  trips: allTypes.map((type, index) => ({
    id: `scene-${type}`,
    journeyId: data.journeys[0]?.id ?? 'journey-test',
    date: `2025-05-0${index + 1}`,
    type,
    from: 'beijing',
    to: 'shanghai',
    waypoints: [],
  })),
}

describe('journey scene routes', () => {
  it('creates one drawable route for every transport type', () => {
    const routes = buildJourneySceneRoutes(buildTracks(dataWithAllTypes))

    expect(routes).toHaveLength(5)
    expect(routes.map((route) => route.type)).toEqual(allTypes)
    expect(routes.find((route) => route.type === 'flight')?.dashed).toBe(true)
    expect(routes.find((route) => route.type === 'metro')?.dashed).toBe(true)
    expect(routes.find((route) => route.type === 'ship')?.color).toBe(0x60a5fa)
    expect(routes.find((route) => route.type === 'car')?.color).toBe(0x86efac)
  })

  it('keeps leg endpoints near the ground and lifts flight middles', () => {
    const route = buildJourneySceneRoutes(buildTracks(dataWithAllTypes))
      .find((item) => item.type === 'flight')!

    expect(route.points[0].altitude).toBeCloseTo(0.004)
    expect(route.points.at(-1)?.altitude).toBeCloseTo(0.004)
    expect(route.points[Math.floor(route.points.length / 2)].altitude)
      .toBeGreaterThan(0.01)
  })
})
