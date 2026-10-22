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
    expect(VEHICLE_ARRIVAL_TOTAL_MS).toBe(1900)
  })
})

describe('vehicleMotionAt', () => {
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
