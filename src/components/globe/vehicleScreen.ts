import type { GlobeMethods } from 'react-globe.gl'
import type { VehiclePosition } from '@/lib/vehicle'

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
