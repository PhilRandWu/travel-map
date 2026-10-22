import type { FlightArc, TrainPath } from '@/lib/tracks'
import { greatCirclePoints, haversineKm } from '@/lib/geo'

export type VehicleTrack = FlightArc | TrainPath

export interface VehicleRoute {
  type: 'flight' | 'train'
  points: [number, number][]
  altitude: number
  distanceKm: number
  durationMs: number
}

export interface VehiclePlayback {
  key: number
  tripId: string
  type: VehicleRoute['type']
  route: VehicleRoute
  label: string
}

export const TRAIN_ALTITUDE = 0.004

function pathDistanceKm(points: [number, number][]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const [fromLat, fromLng] = points[index - 1]
    const [toLat, toLng] = points[index]
    total += haversineKm(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    )
  }
  return total
}

export function vehicleDurationForDistance(
  type: VehicleRoute['type'],
  distanceKm: number,
): number {
  if (type === 'flight') {
    const cruise = 2300
      + Math.max(0, Math.min(1, (distanceKm - 300) / 9700)) * 2000
    return Math.round(cruise + 4700)
  }
  const cruise = 2500
    + Math.max(0, Math.min(1, (distanceKm - 100) / 3900)) * 2000
  return Math.round(cruise + 4500)
}

/** 把一条行程轨迹转成载具可沿用的采样路径；飞机按高空弧线，高铁按贴地折线。 */
export function buildVehicleRoute(track: VehicleTrack): VehicleRoute {
  if ('altitude' in track) {
    const distanceKm = haversineKm(
      { lat: track.startLat, lng: track.startLng },
      { lat: track.endLat, lng: track.endLng },
    )
    return {
      type: 'flight',
      points: greatCirclePoints(
        { lat: track.startLat, lng: track.startLng },
        { lat: track.endLat, lng: track.endLng },
        64,
      ),
      altitude: track.altitude,
      distanceKm,
      durationMs: vehicleDurationForDistance('flight', distanceKm),
    }
  }

  const distanceKm = pathDistanceKm(track.points)
  return {
    type: 'train',
    points: track.points,
    altitude: TRAIN_ALTITUDE,
    distanceKm,
    durationMs: vehicleDurationForDistance('train', distanceKm),
  }
}

export interface VehiclePosition {
  lat: number
  lng: number
  altitude: number
}

export function vehicleAltitudeAt(
  route: VehicleRoute,
  progress: number,
): number {
  if (route.type !== 'flight') return route.altitude
  if (progress <= 0.08 || progress >= 0.93) return 0
  if (progress < 0.24) {
    return smoothstep((progress - 0.08) / 0.16) * route.altitude
  }
  if (progress <= 0.78) return route.altitude
  return (1 - smoothstep((progress - 0.78) / 0.15)) * route.altitude
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/** 在路径上取 0–1 进度对应的位置；相邻点按最短经度差插值，避免跨 180° 跳变。 */
export function sampleVehicleRoute(
  route: VehicleRoute,
  progress: number,
): VehiclePosition {
  if (route.points.length === 0) {
    return { lat: 0, lng: 0, altitude: 0 }
  }
  const t = Math.min(1, Math.max(0, progress))
  if (t <= 0) {
    const [lat, lng] = route.points[0]
    return { lat, lng, altitude: vehicleAltitudeAt(route, 0) }
  }
  if (t >= 1) {
    const [lat, lng] = route.points[route.points.length - 1]
    return { lat, lng, altitude: vehicleAltitudeAt(route, 1) }
  }

  const position = t * (route.points.length - 1)
  const index = Math.floor(position)
  const fraction = position - index
  const [fromLat, fromLng] = route.points[index]
  const [toLat, toLng] = route.points[index + 1]
  const rawLngDelta = toLng - fromLng
  const lngDelta = rawLngDelta > 180
    ? rawLngDelta - 360
    : rawLngDelta < -180
      ? rawLngDelta + 360
      : rawLngDelta

  return {
    lat: fromLat + (toLat - fromLat) * fraction,
    lng: fromLng + lngDelta * fraction,
    altitude: vehicleAltitudeAt(route, t),
  }
}
