import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import { buildVehicleRuntimeFrame } from '@/lib/vehicleRuntime'

const { flights } = buildTracks(data as TravelData)
const route = buildVehicleRoute(flights[0])
const playback: VehiclePlayback = {
  key: 1,
  tripId: flights[0].trip.id,
  type: route.type,
  route,
  label: flights[0].label,
}

describe('buildVehicleRuntimeFrame', () => {
  it('moves, holds, returns and completes on one timeline', () => {
    expect(buildVehicleRuntimeFrame(playback, 0, 1).stage).toBe('moving')
    expect(buildVehicleRuntimeFrame(
      playback,
      route.durationMs,
      1,
    ).stage).toBe('holding')
    expect(buildVehicleRuntimeFrame(
      playback,
      route.durationMs + 1000,
      1,
    ).stage).toBe('returning')
    expect(buildVehicleRuntimeFrame(
      playback,
      route.durationMs + 1900,
      1,
    ).stage).toBe('complete')
  })

  it('keeps the final marker on the destination during settlement', () => {
    const frame = buildVehicleRuntimeFrame(
      playback,
      route.durationMs + 1400,
      2,
    )
    expect(frame.motion.progress).toBe(1)
    expect(frame.motion.phase).toBe('arrived')
    expect(frame.revision).toBe(2)
  })
})
