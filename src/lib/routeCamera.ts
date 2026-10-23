import type { GlobeMethods } from 'react-globe.gl'
import type { VehicleMotionFrame } from '@/lib/vehicleMotion'
import { sampleVehicleRoute, type VehicleRoute } from '@/lib/vehicle'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
}

export interface RouteCameraFraming {
  topRatio: number
  bottomRatio: number
}

type GlobeGeometry = Pick<GlobeMethods, 'getCoords' | 'getGlobeRadius'>

const CAMERA_PROFILE: Record<
  VehicleRoute['type'],
  { altitude: number; northLeadDeg: number }
> = {
  flight: { altitude: 0.62, northLeadDeg: 2.4 },
  train: { altitude: 0.34, northLeadDeg: 2.4 },
}

const asTuple = (value: {
  x: number
  y: number
  z: number
}): [number, number, number] => [value.x, value.y, value.z]

export const smoothstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/**
 * Route-first framing: the camera stays north-up and looks through the globe
 * center. A small northward lead places the vehicle below center, above the
 * timeline, without inheriting the vehicle's heading or roll.
 */
export function buildRouteCameraPose(
  globe: GlobeGeometry,
  route: VehicleRoute,
  motion: VehicleMotionFrame,
  framing: RouteCameraFraming = { topRatio: 0.06, bottomRatio: 0.8 },
): CameraPose {
  const profile = CAMERA_PROFILE[route.type]
  const current = sampleVehicleRoute(route, motion.progress)
  const bottomRatio = Math.max(0.55, Math.min(0.92, framing.bottomRatio))
  const leadOffset = (bottomRatio - 0.8) * 6
  const focusLat = Math.max(
    -82,
    Math.min(82, current.lat + profile.northLeadDeg + leadOffset),
  )
  const position = globe.getCoords(focusLat, current.lng, profile.altitude)
  return {
    position: asTuple(position),
    target: [0, 0, 0],
    up: [0, 1, 0],
  }
}

export function buildDestinationPose(
  globe: GlobeGeometry,
  lat: number,
  lng: number,
  altitude = 1.15,
): CameraPose {
  return {
    position: asTuple(globe.getCoords(lat, lng, altitude)),
    target: [0, 0, 0],
    up: [0, 1, 0],
  }
}

export function interpolatePose(
  from: CameraPose,
  to: CameraPose,
  value: number,
): CameraPose {
  const t = smoothstep(value)
  const mix = (start: number, end: number) => start + (end - start) * t
  return {
    position: [
      mix(from.position[0], to.position[0]),
      mix(from.position[1], to.position[1]),
      mix(from.position[2], to.position[2]),
    ],
    target: [
      mix(from.target[0], to.target[0]),
      mix(from.target[1], to.target[1]),
      mix(from.target[2], to.target[2]),
    ],
    up: [
      mix(from.up[0], to.up[0]),
      mix(from.up[1], to.up[1]),
      mix(from.up[2], to.up[2]),
    ],
  }
}
