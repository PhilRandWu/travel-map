import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TransportType, TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'
import { buildVehicleRoute } from '@/lib/vehicle'
import {
  VEHICLE_ARRIVAL_TOTAL_MS,
  VEHICLE_PRE_ROLL_MS,
  buildVehicleMotionSchedule,
  vehicleMotionAt,
} from '@/lib/vehicleMotion'
import {
  VEHICLE_STOP_HOLD_MS,
  vehicleDurationForDistance,
} from '@/lib/vehicleTiming'

const tracks = buildTracks(data as TravelData)
const trainTrack = tracks.routes.find((route) => route.type === 'train')!
const flightTrack = tracks.routes.find((route) => route.type === 'flight')!
const trainRoute = buildVehicleRoute(trainTrack)
const flightRoute = buildVehicleRoute(flightTrack)

function routeFor(type: TransportType) {
  const baseAltitude = getTransportMode(type).route.baseAltitude
  return buildVehicleRoute({
    ...trainTrack,
    type,
    legs: trainTrack.legs.map((leg) => ({ ...leg, altitude: baseAltitude })),
  })
}

describe('vehicleDurationForDistance', () => {
  it.each([
    ['flight', 0, 5500],
    ['flight', 10_000, 8500],
    ['train', 0, 6000],
    ['train', 4000, 9000],
    ['metro', 0, 4800],
    ['ship', 0, 7500],
    ['car', 0, 5500],
  ] as const)('maps %s at %d km into registry bounds', (type, km, expected) => {
    expect(vehicleDurationForDistance(type, km)).toBe(expected)
  })

  it('keeps the runtime constants unchanged', () => {
    expect(VEHICLE_PRE_ROLL_MS).toBe(650)
    expect(VEHICLE_ARRIVAL_TOTAL_MS).toBe(1900)
  })
})

describe('buildVehicleMotionSchedule', () => {
  it('uses registry phases for every leg and inserts stop holds', () => {
    const schedule = buildVehicleMotionSchedule(trainRoute)
    const mode = getTransportMode('train')

    expect(schedule).toHaveLength(trainRoute.legs.length * 5 + 1)
    expect(schedule.slice(0, 5).map((item) => item.label))
      .toEqual(mode.motion.phases.map((phase) => phase.label))
    const stop = schedule.find((item) => item.phase === 'stopped')!
    expect(stop.label).toBe(`${mode.motion.stopLabel} 嘉兴`)
    expect(stop.endMs - stop.startMs).toBe(VEHICLE_STOP_HOLD_MS)
    expect(stop.startProgress).toBe(stop.endProgress)
  })
})

describe('vehicleMotionAt', () => {
  it('holds a multi-leg route at each waypoint before continuing', () => {
    const stopAt = trainRoute.legs[0].endMs
    const frame = vehicleMotionAt(trainRoute, stopAt + 10)

    expect(frame.phase).toBe('stopped')
    expect(frame.progress).toBeCloseTo(
      trainRoute.legs[0].endProgress,
      8,
    )
    expect(frame.position.lat).toBeCloseTo(
      trainTrack.stops[1].lat,
      8,
    )
  })

  it('resets flight altitude to the ground between legs', () => {
    const route = buildVehicleRoute({
      ...trainTrack,
      type: 'flight',
      legs: trainTrack.legs.map((leg) => ({ ...leg, altitude: 0.2 })),
    })
    const firstLeg = route.legs[0]

    expect(vehicleMotionAt(route, firstLeg.endMs - 1).altitude)
      .toBeLessThan(0.01)
    expect(vehicleMotionAt(route, firstLeg.endMs + 100).altitude)
      .toBe(0)
    expect(vehicleMotionAt(
      route,
      route.legs[1].startMs + route.legs[1].durationMs / 2,
    ).altitude).toBeGreaterThan(0.01)
  })

  it.each(['flight', 'train', 'metro', 'ship', 'car'] as const)(
    'keeps %s timing, attitude and bob inside registry bounds',
    (type) => {
      const mode = getTransportMode(type)
      const route = routeFor(type)
      expect(route.durationMs - route.stopHoldMs)
        .toBeGreaterThanOrEqual(mode.motion.minDurationMs)
      expect(route.durationMs - route.stopHoldMs)
        .toBeLessThanOrEqual(mode.motion.maxDurationMs)

      let previousProgress = -1
      for (let index = 0; index <= 100; index += 1) {
        const frame = vehicleMotionAt(
          route,
          route.durationMs * index / 100,
        )
        expect(frame.progress).toBeGreaterThanOrEqual(previousProgress)
        expect(Math.abs(frame.pitchDeg))
          .toBeLessThanOrEqual(mode.motion.maxPitchDeg)
        expect(Math.abs(frame.rollDeg))
          .toBeLessThanOrEqual(mode.motion.maxRollDeg)
        expect(Number.isFinite(frame.altitude)).toBe(true)
        previousProgress = frame.progress
      }
    },
  )

  it.each(['train', 'metro', 'ship', 'car'] as const)(
    'keeps %s at its registry ground altitude',
    (type) => {
      const route = routeFor(type)
      const mode = getTransportMode(type)
      for (const ratio of [0, 0.1, 0.5, 0.9]) {
        const frame = vehicleMotionAt(route, route.durationMs * ratio)
        expect(frame.altitude).toBeCloseTo(mode.route.baseAltitude + (
          type === 'ship'
            ? Math.sin(
                frame.elapsedMs
                / mode.motion.bobPeriodMs
                * Math.PI * 2,
              ) * mode.motion.bobAmplitude
            : 0
        ), 10)
      }
      expect(vehicleMotionAt(route, route.durationMs).altitude)
        .toBe(mode.route.baseAltitude)
    },
  )

  it('ends at the destination with the registry arrival label', () => {
    const frame = vehicleMotionAt(flightRoute, flightRoute.durationMs)
    expect(frame).toMatchObject({
      progress: 1,
      altitude: 0,
      phase: 'arrived',
      phaseLabel: getTransportMode('flight').motion.arrivalLabel,
    })
  })
})
