import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import type { ReplayRuntime } from '@/lib/replay'
import { useVehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'
import { vehicleNodeDurationMs } from '@/lib/vehicleMotion'
import { SceneClockProvider } from '@/components/scene/SceneClockProvider'

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

const wrapper = ({ children }: { children: ReactNode }) => (
  <SceneClockProvider>{children}</SceneClockProvider>
)

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
    }), { wrapper })
    const listener = vi.fn()
    const unsubscribe = result.current.subscribe(listener)

    expect(listener).toHaveBeenCalled()
    expect(listener.mock.calls[0][0]).toMatchObject({
      tripId: playback.tripId,
      stage: 'preparing',
      motion: { progress: 0 },
    })
    unsubscribe()
  })

  it('starts one-off playback when replay is idle', () => {
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
    }), { wrapper })
    const listener = vi.fn()
    result.current.subscribe(listener)

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      tripId: playback.tripId,
      stage: 'preparing',
      motion: expect.objectContaining({ progress: 0 }),
    }))
  })

  it('does not replay a trip again when its replay step finishes', () => {
    const globeRef = { current: {} as GlobeMethods }
    const activeReplay: ReplayRuntime = {
      status: 'playing' as const,
      activeIndex: 0,
      seekRevision: 0,
      plan: {
        steps: [{
          node: {
            kind: 'trip' as const,
            date: '2026-01-01',
            refId: playback.tripId,
            cityId: '',
            label: '',
          },
          startMs: 0,
          durationMs: vehicleNodeDurationMs(playback.route.durationMs),
        }],
        totalMs: vehicleNodeDurationMs(playback.route.durationMs),
      },
      getPosition: () => ({
        index: 0,
        elapsedMs: vehicleNodeDurationMs(playback.route.durationMs),
      }),
    }
    const { result, rerender } = renderHook(
      ({ replayRuntime }) => useVehicleRuntime({
        playback,
        replayRuntime,
        pageVisible: true,
        globeRef,
      }),
      { initialProps: { replayRuntime: activeReplay }, wrapper },
    )
    const listener = vi.fn()
    result.current.subscribe(listener)

    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      stage: 'complete',
    }))

    rerender({
      replayRuntime: {
        ...activeReplay,
        status: 'idle' as const,
      },
    })

    expect(listener).toHaveBeenLastCalledWith(null)
  })

  it('starts a new one-off after leaving a replay on the same trip', () => {
    const globeRef = { current: {} as GlobeMethods }
    const idleReplay: ReplayRuntime = {
      status: 'idle',
      activeIndex: -1,
      seekRevision: 0,
      plan: { steps: [], totalMs: 0 },
      getPosition: () => ({ index: 0, elapsedMs: 0 }),
    }
    const activeReplay: ReplayRuntime = {
      ...idleReplay,
      status: 'playing',
      activeIndex: 0,
      plan: {
        steps: [{
          node: {
            kind: 'trip',
            date: '2026-01-01',
            refId: playback.tripId,
            cityId: '',
            label: '',
          },
          startMs: 0,
          durationMs: vehicleNodeDurationMs(playback.route.durationMs),
        }],
        totalMs: vehicleNodeDurationMs(playback.route.durationMs),
      },
    }
    const initialProps: {
      currentPlayback: VehiclePlayback | null
      replayRuntime: ReplayRuntime
    } = {
      currentPlayback: playback,
      replayRuntime: activeReplay,
    }
    const { result, rerender } = renderHook(
      ({ currentPlayback, replayRuntime }: {
        currentPlayback: VehiclePlayback | null
        replayRuntime: ReplayRuntime
      }) => useVehicleRuntime({
        playback: currentPlayback,
        replayRuntime,
        pageVisible: true,
        globeRef,
      }),
      { initialProps, wrapper },
    )
    const listener = vi.fn()
    result.current.subscribe(listener)

    rerender({ currentPlayback: null, replayRuntime: idleReplay })
    rerender({
      currentPlayback: { ...playback, key: 2 },
      replayRuntime: idleReplay,
    })

    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      tripId: playback.tripId,
      stage: 'preparing',
      motion: expect.objectContaining({ progress: 0 }),
    }))
  })

  it('delivers camera listeners before render listeners', () => {
    const globeRef = { current: {} as GlobeMethods }
    const { result, rerender } = renderHook(
      ({ currentPlayback }) => useVehicleRuntime({
        playback: currentPlayback,
        replayRuntime: null,
        pageVisible: true,
        globeRef,
      }),
      { initialProps: { currentPlayback: playback }, wrapper },
    )
    const order: string[] = []
    const cleanupCamera = result.current.subscribe(
      () => order.push('camera'),
      -100,
    )
    const cleanupRender = result.current.subscribe(
      () => order.push('render'),
    )

    order.length = 0
    rerender({ currentPlayback: { ...playback, key: 2 } })
    cleanupCamera()
    cleanupRender()
    expect(order).toEqual(['camera', 'render'])
  })
})
