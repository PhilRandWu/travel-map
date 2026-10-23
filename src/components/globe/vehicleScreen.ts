import type { GlobeMethods } from 'react-globe.gl'
import type { VehiclePosition } from '@/lib/vehicle'

const ANGLE_SMOOTHING_MS = 80

export function isPointVisible(
  globe: GlobeMethods,
  position: VehiclePosition,
): boolean {
  const point = globe.getCoords(position.lat, position.lng, position.altitude)
  const camera = globe.camera().position
  return point.x * camera.x + point.y * camera.y + point.z * camera.z
    >= point.x * point.x + point.y * point.y + point.z * point.z
}

export function screenPoint(
  globe: GlobeMethods,
  position: VehiclePosition,
): { x: number; y: number } {
  return globe.getScreenCoords(
    position.lat,
    position.lng,
    position.altitude,
  )
}

export function isScreenPointVisible(
  point: { x: number; y: number },
  width: number,
  height: number,
): boolean {
  return point.x >= 0
    && point.x <= width
    && point.y >= 0
    && point.y <= height
}

export function smoothAngle(
  current: number,
  target: number,
  deltaMs: number,
): number {
  if (deltaMs <= 0) return current
  const delta = ((target - current + 540) % 360) - 180
  const factor = 1 - Math.exp(-deltaMs / ANGLE_SMOOTHING_MS)
  return current + delta * factor
}
