import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TransportType, TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'
import {
  buildVehicleRoute,
  sampleVehicleRoute,
  vehicleAltitudeAt,
} from '@/lib/vehicle'
import {
  VEHICLE_STOP_HOLD_MS,
  vehicleDurationForDistance,
} from '@/lib/vehicleTiming'

const tracks = buildTracks(data as TravelData)
const trainTrack = tracks.routes.find((route) => route.type === 'train')!
const flightTrack = tracks.routes.find((route) => route.type === 'flight')!

function routeFor(type: TransportType) {
  const baseAltitude = getTransportMode(type).route.baseAltitude
  return buildVehicleRoute({
    ...trainTrack,
    type,
    legs: trainTrack.legs.map((leg) => ({ ...leg, altitude: baseAltitude })),
  })
}

describe('buildVehicleRoute', () => {
  it('builds ordered legs and preserves every waypoint', () => {
    const route = buildVehicleRoute(trainTrack)

    expect(route.type).toBe('train')
    expect(route.legs).toHaveLength(2)
    expect(route.legs.map((leg) => leg.toName)).toEqual(['嘉兴', '上海'])
    expect(route.points[0]).toEqual(trainTrack.points[0])
    expect(route.points.at(-1)).toEqual(trainTrack.points.at(-1))
    expect(route.legs[0].endProgress).toBe(route.legs[1].startProgress)
    expect(route.legs[1].startMs - route.legs[0].endMs)
      .toBe(VEHICLE_STOP_HOLD_MS)
  })

  it('adds one hold per stop to the registry movement duration', () => {
    const route = buildVehicleRoute(trainTrack)
    const mode = getTransportMode('train')

    expect(route.stopHoldMs).toBe(VEHICLE_STOP_HOLD_MS)
    expect(route.durationMs).toBe(
      route.movementDurationMs + route.stopHoldMs,
    )
    expect(route.movementDurationMs).toBe(
      vehicleDurationForDistance('train', route.distanceKm),
    )
    expect(route.movementDurationMs)
      .toBeGreaterThanOrEqual(mode.motion.minDurationMs)
    expect(route.movementDurationMs)
      .toBeLessThanOrEqual(mode.motion.maxDurationMs)
  })
})

describe('vehicle route sampling', () => {
  it('uses each transport registry base altitude on the ground', () => {
    for (const type of ['train', 'metro', 'ship', 'car'] as const) {
      const route = routeFor(type)
      expect(vehicleAltitudeAt(route, 0.5)).toBe(
        getTransportMode(type).route.baseAltitude,
      )
    }
  })

  it('resets the flight altitude envelope at every leg', () => {
    const route = buildVehicleRoute({
      ...trainTrack,
      type: 'flight',
      legs: trainTrack.legs.map((leg) => ({ ...leg, altitude: 0.2 })),
    })

    for (const leg of route.legs) {
      const middle = (leg.startProgress + leg.endProgress) / 2
      expect(vehicleAltitudeAt(route, middle))
        .toBeGreaterThan(getTransportMode('flight').route.baseAltitude)
      expect(vehicleAltitudeAt(route, leg.endProgress)).toBe(0)
    }
  })

  it('samples endpoints, mid-route points and clamps progress', () => {
    const route = buildVehicleRoute(flightTrack)
    const start = sampleVehicleRoute(route, 0)
    const middle = sampleVehicleRoute(route, 0.5)
    const end = sampleVehicleRoute(route, 1)

    expect([start.lat, start.lng]).toEqual(route.points[0])
    expect([end.lat, end.lng]).toEqual(route.points.at(-1))
    expect(middle.lat).toBeGreaterThan(25)
    expect(middle.lat).toBeLessThan(45)
    expect(sampleVehicleRoute(route, -1).lat).toBe(start.lat)
    expect(sampleVehicleRoute(route, 2).lat).toBe(end.lat)
  })
})
