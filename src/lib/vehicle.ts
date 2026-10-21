import type { FlightArc, TrainPath } from '@/lib/tracks'
import { greatCirclePoints } from '@/lib/geo'

export type VehicleTrack = FlightArc | TrainPath

export interface VehicleRoute {
  type: 'flight' | 'train'
  points: [number, number][]
  altitude: number
  durationMs: number
}

export const TRAIN_ALTITUDE = 0.004
const FLIGHT_DURATION_MS = 2600
const TRAIN_DURATION_MS = 3600

/** 把一条行程轨迹转成载具可沿用的采样路径；飞机按高空弧线，高铁按贴地折线。 */
export function buildVehicleRoute(track: VehicleTrack): VehicleRoute {
  if ('altitude' in track) {
    return {
      type: 'flight',
      points: greatCirclePoints(
        { lat: track.startLat, lng: track.startLng },
        { lat: track.endLat, lng: track.endLng },
        64,
      ),
      altitude: track.altitude,
      durationMs: FLIGHT_DURATION_MS,
    }
  }

  return {
    type: 'train',
    points: track.points,
    altitude: TRAIN_ALTITUDE,
    durationMs: TRAIN_DURATION_MS,
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
  // 飞机从地面起飞，在航线中点达到弧顶，再落回目的地。
  if (progress <= 0 || progress >= 1) return 0
  return Math.sin(Math.PI * progress) * route.altitude
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
