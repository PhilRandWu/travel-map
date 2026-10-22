import { act, renderHook } from '@testing-library/react'
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
import { useVehicleChaseCamera } from '@/components/globe/hooks/useVehicleChaseCamera'

const { flights } = buildTracks(data as TravelData)
const route = buildVehicleRoute(flights[0])
const playback: VehiclePlayback = {
  key: 1,
  tripId: flights[0].trip.id,
  type: route.type,
  route,
  label: flights[0].label,
}

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

describe('useVehicleChaseCamera', () => {
  it('locks controls while moving and restores them on completion', () => {
    const { globe, controls } = fakeGlobe()
    const globeRef = { current: globe }
    let listener: (frame: VehicleRuntimeFrame | null) => void = () => undefined
    const runtime = {
      getFrame: () => null,
      subscribe: vi.fn((next: (frame: VehicleRuntimeFrame | null) => void) => {
        listener = next
        return () => undefined
      }),
    }
    const { result } = renderHook(() => useVehicleChaseCamera({
      globeRef,
      runtime,
      enabled: true,
    }))

    expect(runtime.subscribe).toHaveBeenCalled()
    act(() => {
      listener(buildVehicleRuntimeFrame(playback, 0, 0))
    })
    expect(result.current.locked).toBe(true)
    expect(controls.enabled).toBe(false)
    expect(controls.autoRotate).toBe(false)

    act(() => {
      listener(buildVehicleRuntimeFrame(
        playback,
        route.durationMs + 1900,
        0,
      ))
    })
    expect(result.current.locked).toBe(false)
    expect(controls.enabled).toBe(true)
    expect(controls.autoRotate).toBe(true)
  })
})
