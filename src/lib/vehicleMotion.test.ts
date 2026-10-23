import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import {
  buildVehicleRoute,
  TRAIN_ALTITUDE,
  vehicleDurationForDistance,
} from '@/lib/vehicle'
import {
  VEHICLE_ARRIVAL_TOTAL_MS,
  VEHICLE_PRE_ROLL_MS,
  vehicleMotionAt,
} from '@/lib/vehicleMotion'

const travelData = data as TravelData
const { flights, trains } = buildTracks(travelData)
const flightRoute = buildVehicleRoute(flights[0])
const trainRoute = buildVehicleRoute(trains[0])

describe('vehicleDurationForDistance', () => {
  it('keeps main motion between 7 and 9 seconds', () => {
    expect(vehicleDurationForDistance('flight', 0)).toBe(7000)
    expect(vehicleDurationForDistance('flight', 10_000)).toBe(9000)
    expect(vehicleDurationForDistance('train', 0)).toBe(7000)
    expect(vehicleDurationForDistance('train', 4000)).toBe(9000)
    expect(VEHICLE_PRE_ROLL_MS).toBe(650)
    expect(VEHICLE_ARRIVAL_TOTAL_MS).toBe(1900)
  })
})

describe('vehicleMotionAt', () => {
  it.each([
    ['flight', flightRoute],
    ['train', trainRoute],
  ] as const)('advances the %s route uniformly over time', (_, route) => {
    const ratios = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    const progress = ratios.map((ratio) => (
      vehicleMotionAt(route, route.durationMs * ratio).progress
    ))

    for (let index = 1; index < progress.length; index += 1) {
      expect(progress[index] - progress[index - 1]).toBeCloseTo(0.1, 8)
    }
  })

  it('starts and ends on the ground', () => {
    expect(vehicleMotionAt(flightRoute, 0)).toMatchObject({
      progress: 0,
      altitude: 0,
      phase: 'taxi',
    })
    expect(vehicleMotionAt(flightRoute, flightRoute.durationMs)).toMatchObject({
      progress: 1,
      altitude: 0,
      phase: 'arrived',
    })
  })

  it('climbs, cruises and descends in order', () => {
    const duration = flightRoute.durationMs
    const climbStart = vehicleMotionAt(flightRoute, duration * 0.09)
    const climbEnd = vehicleMotionAt(flightRoute, duration * 0.23)
    const cruise = vehicleMotionAt(flightRoute, duration * 0.5)
    const descent = vehicleMotionAt(flightRoute, duration * 0.82)

    expect(climbStart.altitude).toBeLessThan(climbEnd.altitude)
    expect(cruise.altitude).toBeCloseTo(flightRoute.altitude, 8)
    expect(descent.altitude).toBeGreaterThan(0)
    expect(descent.altitude).toBeLessThan(flightRoute.altitude)
  })

  it('aligns aircraft altitude with the phase boundaries', () => {
    const duration = flightRoute.durationMs
    const taxiEnd = 900
    const takeoffEnd = 2300
    const descentStart = duration - 1300 - 1100
    const landingStart = duration - 1100

    expect(vehicleMotionAt(flightRoute, taxiEnd).altitude).toBe(0)
    expect(vehicleMotionAt(flightRoute, takeoffEnd).altitude).toBeCloseTo(
      flightRoute.altitude,
      8,
    )
    expect(vehicleMotionAt(flightRoute, descentStart).altitude).toBeCloseTo(
      flightRoute.altitude,
      8,
    )
    expect(vehicleMotionAt(flightRoute, landingStart).altitude).toBe(0)
  })

  it('keeps trains on the ground at all times', () => {
    for (const ratio of [0, 0.1, 0.5, 0.9, 1]) {
      const frame = vehicleMotionAt(trainRoute, trainRoute.durationMs * ratio)
      expect(frame.altitude).toBe(TRAIN_ALTITUDE)
      expect(frame.pitchDeg).toBe(0)
      expect(frame.rollDeg).toBe(0)
    }
  })

  it('uses continuous bounded aircraft attitude', () => {
    let previousProgress = -1
    for (let index = 0; index <= 100; index += 1) {
      const frame = vehicleMotionAt(
        flightRoute,
        flightRoute.durationMs * index / 100,
      )
      expect(frame.progress).toBeGreaterThanOrEqual(previousProgress)
      expect(Math.abs(frame.pitchDeg)).toBeLessThanOrEqual(12)
      expect(Math.abs(frame.rollDeg)).toBeLessThanOrEqual(12)
      previousProgress = frame.progress
    }
  })
})
