import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildJourneySceneRoutes } from '@/lib/journeyScene'

const data = dataJson as TravelData

describe('journey scene routes', () => {
  it('creates drawable routes for flights and trains', () => {
    const routes = buildJourneySceneRoutes(buildTracks(data))
    expect(routes.length).toBe(data.trips.length)
    expect(routes.find((route) => route.type === 'flight')?.points.length)
      .toBeGreaterThan(20)
    expect(routes.find((route) => route.type === 'train')?.points.length)
      .toBeGreaterThan(20)
  })

  it('keeps route endpoints near the ground and lifts flight middles', () => {
    const route = buildJourneySceneRoutes(buildTracks(data))
      .find((item) => item.type === 'flight')!
    expect(route.points[0].altitude).toBeCloseTo(0.004)
    expect(route.points.at(-1)?.altitude).toBeCloseTo(0.004)
    expect(route.points[Math.floor(route.points.length / 2)].altitude)
      .toBeGreaterThan(0.01)
  })
})
