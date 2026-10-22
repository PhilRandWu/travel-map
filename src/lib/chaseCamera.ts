import { Matrix4, Quaternion, Vector3 } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import type { VehicleMotionFrame } from '@/lib/vehicleMotion'
import { sampleVehicleRoute, type VehicleRoute } from '@/lib/vehicle'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
}

type GlobeGeometry = Pick<GlobeMethods, 'getCoords' | 'getGlobeRadius'>

const asVector = (value: { x: number; y: number; z: number }) => (
  new Vector3(value.x, value.y, value.z)
)

const asTuple = (value: Vector3): [number, number, number] => (
  [value.x, value.y, value.z]
)

export function buildChaseCameraPose(
  globe: GlobeGeometry,
  route: VehicleRoute,
  motion: VehicleMotionFrame,
): CameraPose {
  const radius = globe.getGlobeRadius()
  const current = sampleVehicleRoute(route, motion.progress)
  const before = sampleVehicleRoute(route, Math.max(0, motion.progress - 0.004))
  const after = sampleVehicleRoute(route, Math.min(1, motion.progress + 0.004))
  const vehicle = asVector(globe.getCoords(
    current.lat,
    current.lng,
    current.altitude,
  ))
  const behind = asVector(globe.getCoords(
    before.lat,
    before.lng,
    before.altitude,
  ))
  const ahead = asVector(globe.getCoords(
    after.lat,
    after.lng,
    after.altitude,
  ))
  const tangent = ahead.clone().sub(behind)
  if (tangent.lengthSq() < 1e-8) tangent.copy(ahead).sub(vehicle)
  tangent.normalize()

  const localUp = vehicle.clone().normalize()
  const altitudeFactor = route.type === 'train' || route.altitude <= 0
    ? 0
    : Math.max(0, Math.min(1, current.altitude / route.altitude))
  const backDistance = (0.045 + (0.070 - 0.045) * altitudeFactor) * radius
  const aboveDistance = (0.018 + (0.030 - 0.018) * altitudeFactor) * radius
  const forwardDistance = (0.080 + (0.140 - 0.080) * altitudeFactor) * radius

  const position = vehicle.clone()
    .addScaledVector(tangent, -backDistance)
    .addScaledVector(localUp, aboveDistance)
  const minimumRadius = radius * 1.012
  if (position.length() < minimumRadius) position.setLength(minimumRadius)

  const target = vehicle.clone()
    .addScaledVector(tangent, forwardDistance)
    .addScaledVector(localUp, radius * 0.006)

  const cameraUp = localUp.clone()
    .addScaledVector(tangent, -localUp.dot(tangent))
    .normalize()
  return {
    position: asTuple(position),
    target: asTuple(target),
    up: asTuple(cameraUp),
  }
}

export function buildOverviewPose(
  globe: GlobeGeometry,
  lat: number,
  lng: number,
  altitude = 1.35,
): CameraPose {
  const position = asVector(globe.getCoords(lat, lng, altitude))
  return {
    position: asTuple(position),
    target: [0, 0, 0],
    up: [0, 1, 0],
  }
}

export function poseQuaternion(
  pose: CameraPose,
): [number, number, number, number] {
  const matrix = new Matrix4().lookAt(
    new Vector3(...pose.position),
    new Vector3(...pose.target),
    new Vector3(...pose.up),
  )
  const quaternion = new Quaternion().setFromRotationMatrix(matrix)
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}
