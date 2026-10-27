import { act, renderHook, waitFor } from '@testing-library/react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { describe, expect, it, vi } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import {
  buildVehicleRuntimeFrame,
  type VehicleRuntimeFrame,
} from '@/lib/vehicleRuntime'
import {
  VEHICLE_PRE_ROLL_MS,
  vehicleNodeDurationMs,
} from '@/lib/vehicleMotion'
import { useVehicleDirectorCamera } from '@/components/globe/hooks/useVehicleDirectorCamera'

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
const framing = { topRatio: 0.06, bottomRatio: 0.8 }

function fakeGlobe() {
  const camera = new PerspectiveCamera()
  const controls = {
    target: new Vector3(),
    enabled: true,
    autoRotate: true,
    update: vi.fn(),
  }
  const globe = {
    getGlobeRadius: () => 100,
    getCoords: (lat: number, lng: number, altitude = 0) => {
      const radius = 100 * (1 + altitude)
      const phi = lat * Math.PI / 180
      const theta = lng * Math.PI / 180
      return {
        x: radius * Math.cos(phi) * Math.cos(theta),
        y: radius * Math.sin(phi),
        z: radius * Math.cos(phi) * Math.sin(theta),
      }
    },
    camera: () => camera,
    controls: () => controls,
  } as unknown as GlobeMethods
  return { globe, camera, controls }
}

describe('useVehicleDirectorCamera', () => {
  it('locks controls, applies the route view and completes the node', async () => {
    const { globe, camera, controls } = fakeGlobe()
    const globeRef = { current: globe }
    let listener: (frame: VehicleRuntimeFrame | null) => void = () => undefined
    const runtime = {
      getFrame: () => null,
      subscribe: vi.fn((
        next: (frame: VehicleRuntimeFrame | null) => void,
        _priority?: number,
      ) => {
        listener = next
        return () => undefined
      }),
    }
    const { result } = renderHook(() => useVehicleDirectorCamera({
      globeRef,
      runtime,
      enabled: true,
      framing,
    }))
    expect(runtime.subscribe.mock.calls[0][1]).toBe(-100)

    await act(async () => {
      listener(buildVehicleRuntimeFrame(playback, 0, 0))
    })
    expect(controls.enabled).toBe(false)
    expect(result.current.locked).toBe(true)
    expect(result.current.status?.label).toBe('准备起飞')
    expect(controls.enabled).toBe(false)
    expect(controls.autoRotate).toBe(false)

    await act(async () => {
      listener(buildVehicleRuntimeFrame(
        playback,
        VEHICLE_PRE_ROLL_MS + route.durationMs / 2,
        0,
      ))
    })
    expect(camera.up.toArray()).toEqual([0, 1, 0])
    expect(camera.matrixWorldInverse.elements.some(Number.isFinite)).toBe(true)

    await act(async () => {
      listener(buildVehicleRuntimeFrame(
        playback,
        vehicleNodeDurationMs(route.durationMs),
        0,
      ))
    })
    await waitFor(() => expect(result.current.locked).toBe(false))
    expect(controls.enabled).toBe(true)
    expect(controls.autoRotate).toBe(true)
  })

  it('restores the exact saved POV when playback stops', () => {
    const { globe, camera, controls } = fakeGlobe()
    const globeRef = { current: globe }
    camera.position.set(12, 34, 56)
    camera.up.set(0, 1, 0)
    camera.lookAt(4, 5, 6)
    controls.target.set(4, 5, 6)
    controls.enabled = false
    controls.autoRotate = true
    const saved = {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      up: camera.up.toArray(),
      target: controls.target.toArray(),
    }
    let listener: (frame: VehicleRuntimeFrame | null) => void = () => undefined
    const runtime = {
      getFrame: () => null,
      subscribe: vi.fn((next: (frame: VehicleRuntimeFrame | null) => void) => {
        listener = next
        return () => undefined
      }),
    }
    renderHook(() => useVehicleDirectorCamera({
      globeRef,
      runtime,
      enabled: true,
      framing,
    }))

    act(() => listener(buildVehicleRuntimeFrame(
      playback,
      VEHICLE_PRE_ROLL_MS + route.durationMs / 2,
      0,
    )))
    act(() => listener(null))

    expect(camera.position.toArray()).toEqual(saved.position)
    expect(camera.quaternion.toArray()).toEqual(saved.quaternion)
    expect(camera.up.toArray()).toEqual(saved.up)
    expect(controls.target.toArray()).toEqual(saved.target)
    expect(controls.enabled).toBe(false)
    expect(controls.autoRotate).toBe(true)
    expect(controls.update).toHaveBeenCalled()
  })

  it('restores the saved POV when the scene unmounts mid-playback', () => {
    const { globe, camera, controls } = fakeGlobe()
    const globeRef = { current: globe }
    camera.position.set(7, 8, 9)
    camera.lookAt(0, 0, 0)
    const savedPosition = camera.position.toArray()
    let listener: (frame: VehicleRuntimeFrame | null) => void = () => undefined
    const runtime = {
      getFrame: () => null,
      subscribe: vi.fn((next: (frame: VehicleRuntimeFrame | null) => void) => {
        listener = next
        return () => undefined
      }),
    }
    const { unmount } = renderHook(() => useVehicleDirectorCamera({
      globeRef,
      runtime,
      enabled: true,
      framing,
    }))

    act(() => listener(buildVehicleRuntimeFrame(playback, 0, 0)))
    unmount()

    expect(camera.position.toArray()).toEqual(savedPosition)
    expect(controls.enabled).toBe(true)
    expect(controls.autoRotate).toBe(true)
  })
})
