import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { GlobeMethods } from 'react-globe.gl'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import { useVehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'

const { flights } = buildTracks(data as TravelData)
const route = buildVehicleRoute(flights[0])
const playback: VehiclePlayback = {
  key: 1,
  tripId: flights[0].trip.id,
  type: route.type,
  route,
  label: flights[0].label,
}

describe('useVehicleRuntime', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('publishes the current frame to late subscribers', () => {
    const globeRef = { current: {} as GlobeMethods }
    const { result } = renderHook(() => useVehicleRuntime({
      playback,
      replayRuntime: null,
      pageVisible: true,
      globeRef,
    }))
    const listener = vi.fn()
    const unsubscribe = result.current.subscribe(listener)

    expect(listener).toHaveBeenCalled()
    expect(listener.mock.calls[0][0]).toMatchObject({
      tripId: playback.tripId,
      stage: 'moving',
      motion: { progress: 0 },
    })
    unsubscribe()
  })

  it('does not start one-off playback when replay is idle', () => {
    const globeRef = { current: {} as GlobeMethods }
    const replayRuntime = {
      status: 'idle' as const,
      activeIndex: -1,
      seekRevision: 0,
      plan: { steps: [], totalMs: 0 },
      getPosition: () => ({ index: 0, elapsedMs: 0 }),
    }
    const { result } = renderHook(() => useVehicleRuntime({
      playback,
      replayRuntime,
      pageVisible: true,
      globeRef,
    }))
    const listener = vi.fn()
    result.current.subscribe(listener)

    expect(listener).toHaveBeenCalledWith(null)
  })
})
