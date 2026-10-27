import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import { buildVehicleRuntimeFrame } from '@/lib/vehicleRuntime'
import {
  VEHICLE_PRE_ROLL_MS,
  vehicleNodeDurationMs,
} from '@/lib/vehicleMotion'

const flightTrack = buildTracks(data as TravelData).routes
  .find((item) => item.type === 'flight')!
const route = buildVehicleRoute(flightTrack)
const playback: VehiclePlayback = {
  key: 1,
  tripId: flightTrack.trip.id,
  type: route.type,
  route,
  label: flightTrack.label,
}

describe('buildVehicleRuntimeFrame', () => {
  it('prepares, moves, holds, returns and completes on one timeline', () => {
    const duration = route.durationMs
    expect(buildVehicleRuntimeFrame(playback, 0, 1).stage).toBe('preparing')
    expect(buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS,
      1,
    ).stage).toBe('moving')
    expect(buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS + duration,
      1,
    ).stage).toBe('holding')
    expect(buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS + duration + 1000,
      1,
    ).stage).toBe('returning')
    expect(buildVehicleRuntimeFrame(
      playback,
      vehicleNodeDurationMs(duration),
      1,
    ).stage).toBe('complete')
  })

  it('keeps the final marker on the destination during settlement', () => {
    const frame = buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS + route.durationMs + 1400,
      2,
    )
    expect(frame.motion.progress).toBe(1)
    expect(frame.motion.phase).toBe('arrived')
    expect(frame.revision).toBe(2)
  })

  it('holds the vehicle at the origin until the camera entry finishes', () => {
    const preparing = buildVehicleRuntimeFrame(playback, 0, 1)
    const ready = buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS - 1,
      1,
    )
    const moving = buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS,
      1,
    )

    expect(preparing.motion.progress).toBe(0)
    expect(ready.motion.progress).toBe(0)
    expect(preparing.entryProgress).toBe(0)
    expect(ready.entryProgress).toBeLessThan(1)
    expect(moving.entryProgress).toBe(1)
    expect(moving.motion.progress).toBe(0)
  })
})
