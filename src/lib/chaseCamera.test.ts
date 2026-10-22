import { describe, expect, it } from 'vitest'
import type { GlobeMethods } from 'react-globe.gl'
import { buildChaseCameraPose, buildOverviewPose } from '@/lib/chaseCamera'
import type { VehicleRoute } from '@/lib/vehicle'
import { vehicleMotionAt } from '@/lib/vehicleMotion'

const RADIUS = 100
const fakeGlobe = {
  getGlobeRadius: () => RADIUS,
  getCoords: (lat: number, lng: number, altitude = 0) => {
    const radius = RADIUS * (1 + altitude)
    const phi = lat * Math.PI / 180
    const theta = lng * Math.PI / 180
    return {
      x: radius * Math.cos(phi) * Math.cos(theta),
      y: radius * Math.sin(phi),
      z: radius * Math.cos(phi) * Math.sin(theta),
    }
  },
} as Pick<GlobeMethods, 'getGlobeRadius' | 'getCoords'>

const route: VehicleRoute = {
  type: 'flight',
  points: [[20, 100], [24, 104], [30, 112]],
  altitude: 0.18,
  distanceKm: 1200,
  durationMs: 7600,
}

describe('buildChaseCameraPose', () => {
  it('places the camera outside the globe and aims in front of the vehicle', () => {
    const motion = vehicleMotionAt(route, route.durationMs * 0.5)
    const pose = buildChaseCameraPose(fakeGlobe, route, motion)
    const distance = Math.hypot(...pose.position)
    expect(distance).toBeGreaterThan(RADIUS * 1.012)
    expect(pose.target).not.toEqual(pose.position)
    expect(pose.up.every(Number.isFinite)).toBe(true)
  })

  it('builds a finite destination overview pose', () => {
    const pose = buildOverviewPose(fakeGlobe, 30, 112)
    expect(pose.position.every(Number.isFinite)).toBe(true)
    expect(pose.target).toEqual([0, 0, 0])
  })

  it('stays continuous across the antimeridian', () => {
    const datelineRoute: VehicleRoute = {
      ...route,
      points: [[0, 179], [0, 180], [0, -179]],
    }
    const pose = buildChaseCameraPose(
      fakeGlobe,
      datelineRoute,
      vehicleMotionAt(datelineRoute, datelineRoute.durationMs * 0.5),
    )
    expect([
      ...pose.position,
      ...pose.target,
      ...pose.up,
    ].every(Number.isFinite)).toBe(true)
  })
})
