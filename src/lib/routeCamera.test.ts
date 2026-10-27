import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { GlobeMethods } from 'react-globe.gl'
import {
  buildDestinationPose,
  buildRouteCameraPose,
  interpolatePose,
} from '@/lib/routeCamera'
import { sampleVehicleRoute, type VehicleRoute } from '@/lib/vehicle'
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

const flightPoints: [number, number][] = [[20, 100], [24, 104], [30, 112]]
const flightRoute: VehicleRoute = {
  type: 'flight',
  points: flightPoints,
  legs: [{
    points: flightPoints,
    altitude: 0.18,
    distanceKm: 1200,
    startProgress: 0,
    endProgress: 1,
    startMs: 0,
    endMs: 7600,
    durationMs: 7600,
    toName: '终点',
  }],
  altitude: 0.18,
  distanceKm: 1200,
  movementDurationMs: 7600,
  stopHoldMs: 0,
  durationMs: 7600,
}

const trainRoute: VehicleRoute = {
  ...flightRoute,
  type: 'train',
  altitude: 0.004,
  legs: flightRoute.legs.map((leg) => ({ ...leg, altitude: 0.004 })),
}

function projectedY(
  pose: ReturnType<typeof buildRouteCameraPose>,
  route: VehicleRoute,
  progress: number,
  aspect = 931 / 984,
) {
  const camera = new PerspectiveCamera(50, aspect, 0.1, 10_000)
  camera.position.set(...pose.position)
  camera.up.set(...pose.up)
  camera.lookAt(...pose.target)
  camera.updateMatrixWorld(true)

  const current = sampleVehicleRoute(route, progress)
  const point = fakeGlobe.getCoords(
    current.lat,
    current.lng,
    current.altitude,
  )
  const projected = new Vector3(point.x, point.y, point.z).project(camera)
  return (1 - projected.y) / 2
}

describe('buildRouteCameraPose', () => {
  it('uses a stable north-up route view outside the globe', () => {
    const motion = vehicleMotionAt(flightRoute, flightRoute.durationMs * 0.5)
    const pose = buildRouteCameraPose(fakeGlobe, flightRoute, motion)
    const distance = Math.hypot(...pose.position)

    expect(distance).toBeGreaterThan(RADIUS * 1.2)
    expect(pose.target).toEqual([0, 0, 0])
    expect(pose.up).toEqual([0, 1, 0])
  })

  it.each([
    ['flight', flightRoute],
    ['train', trainRoute],
  ] as const)('keeps the %s marker in the safe vertical band', (_, route) => {
    const progress = 0.5
    const motion = vehicleMotionAt(route, route.durationMs * progress)
    const pose = buildRouteCameraPose(fakeGlobe, route, motion)
    const screenY = projectedY(pose, route, progress)

    expect(screenY).toBeGreaterThan(0.52)
    expect(screenY).toBeLessThan(0.68)
  })

  it('stays finite across the antimeridian', () => {
    const points: [number, number][] = [[0, 179], [0, 180], [0, -179]]
    const datelineRoute: VehicleRoute = {
      ...flightRoute,
      points,
      legs: [{
        ...flightRoute.legs[0],
        points,
      }],
    }
    const pose = buildRouteCameraPose(
      fakeGlobe,
      datelineRoute,
      vehicleMotionAt(datelineRoute, datelineRoute.durationMs * 0.5),
    )
    expect([...pose.position, ...pose.target, ...pose.up].every(Number.isFinite))
      .toBe(true)
  })

  it.each([
    ['1440x900', 1440 / 900, { topRatio: 0.07, bottomRatio: 0.78 }],
    ['1920x1080', 1920 / 1080, { topRatio: 0.06, bottomRatio: 0.81 }],
  ])('keeps the marker framed on %s', (_, aspect, framing) => {
    const route = flightRoute
    const progress = 0.62
    const motion = vehicleMotionAt(route, route.durationMs * progress)
    const pose = buildRouteCameraPose(fakeGlobe, route, motion, framing)
    const screenY = projectedY(pose, route, progress, aspect)

    expect(screenY).toBeGreaterThan(0.52)
    expect(screenY).toBeLessThan(0.68)
  })

  it('interpolates cleanly between overview poses', () => {
    const routePose = buildRouteCameraPose(
      fakeGlobe,
      flightRoute,
      vehicleMotionAt(flightRoute, flightRoute.durationMs * 0.5),
    )
    const destinationPose = buildDestinationPose(fakeGlobe, 30, 112)
    expect(interpolatePose(routePose, destinationPose, 0)).toEqual(routePose)
    expect(interpolatePose(routePose, destinationPose, 1)).toEqual(destinationPose)
  })
})
