import type { FlightArc, TrainPath } from '@/lib/tracks'
import { greatCirclePoints, haversineKm } from '@/lib/geo'
import {
  FLIGHT_CRUISE_MIN_MS,
  FLIGHT_FIXED_MS,
  TRAIN_CRUISE_MIN_MS,
  TRAIN_FIXED_MS,
  vehicleAltitudeProfile,
} from '@/lib/vehicleTiming'

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

function resampleByDistance(
  points: [number, number][],
): [number, number][] {
  if (points.length <= 2) return points.map((point) => [...point])

  const lengths = points.slice(1).map((point, index) => haversineKm(
    { lat: points[index][0], lng: points[index][1] },
    { lat: point[0], lng: point[1] },
  ))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  if (total <= 0) return points.map((point) => [...point])

  const intervals = points.length - 1
  const result: [number, number][] = []
  let segmentIndex = 0
  let segmentStartDistance = 0

  for (let index = 0; index <= intervals; index += 1) {
    if (index === 0) {
      result.push([...points[0]])
      continue
    }
    if (index === intervals) {
      result.push([...points.at(-1)!])
      continue
    }

    const targetDistance = total * index / intervals
    while (
      segmentIndex < lengths.length - 1
      && segmentStartDistance + lengths[segmentIndex] < targetDistance
    ) {
      segmentStartDistance += lengths[segmentIndex]
      segmentIndex += 1
    }

    const from = points[segmentIndex]
    const to = points[segmentIndex + 1]
    const segmentProgress = lengths[segmentIndex] <= 0
      ? 0
      : (targetDistance - segmentStartDistance) / lengths[segmentIndex]
    const rawLngDelta = to[1] - from[1]
    const lngDelta = rawLngDelta > 180
      ? rawLngDelta - 360
      : rawLngDelta < -180
        ? rawLngDelta + 360
        : rawLngDelta
    const lng = from[1] + lngDelta * segmentProgress
    result.push([
      from[0] + (to[0] - from[0]) * segmentProgress,
      ((lng + 540) % 360) - 180,
    ])
  }

  return result
}

export function vehicleDurationForDistance(
  type: VehicleRoute['type'],
  distanceKm: number,
): number {
  const flight = type === 'flight'
  const cruiseFloor = flight ? FLIGHT_CRUISE_MIN_MS : TRAIN_CRUISE_MIN_MS
  const fixed = flight ? FLIGHT_FIXED_MS : TRAIN_FIXED_MS
  const distanceStart = flight ? 300 : 100
  const distanceRange = flight ? 9700 : 3900
  const cruise = cruiseFloor
    + Math.max(0, Math.min(1, (distanceKm - distanceStart) / distanceRange))
      * 2000
  return Math.round(cruise + fixed)
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
    points: resampleByDistance(track.points),
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
  return vehicleAltitudeProfile(
    route.type,
    route.altitude,
    route.durationMs,
    progress,
  )
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
