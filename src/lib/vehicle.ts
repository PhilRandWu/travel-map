import type { TransportType } from '@/types'
import type { TransportRoute } from '@/lib/tracks'
import { greatCirclePoints, haversineKm } from '@/lib/geo'
import { getTransportMode } from '@/lib/transportModes'
import {
  VEHICLE_STOP_HOLD_MS,
  legAltitudeEnvelope,
  vehicleDurationForDistance,
} from '@/lib/vehicleTiming'

export { vehicleDurationForDistance }

export interface VehicleRouteLeg {
  points: [number, number][]
  altitude: number
  distanceKm: number
  startProgress: number
  endProgress: number
  startMs: number
  endMs: number
  durationMs: number
  toName: string
}

export interface VehicleRoute {
  type: TransportType
  points: [number, number][]
  legs: VehicleRouteLeg[]
  altitude: number
  distanceKm: number
  movementDurationMs: number
  stopHoldMs: number
  durationMs: number
}

export interface VehiclePlayback {
  key: number
  tripId: string
  type: TransportType
  route: VehicleRoute
  label: string
}

function pathDistanceKm(points: [number, number][]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    total += haversineKm(
      { lat: previous[0], lng: previous[1] },
      { lat: current[0], lng: current[1] },
    )
  }
  return total
}

function resampleByDistance(
  points: [number, number][],
): [number, number][] {
  if (points.length <= 2) return points.map((point) => [...point])

  const distances = points.slice(1).map((point, index) => haversineKm(
    { lat: points[index][0], lng: points[index][1] },
    { lat: point[0], lng: point[1] },
  ))
  const total = distances.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return points.map((point) => [...point])

  const result: [number, number][] = [[...points[0]]]
  let segment = 0
  let covered = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const target = total * index / (points.length - 1)
    while (
      segment < distances.length - 1
      && covered + distances[segment] < target
    ) {
      covered += distances[segment]
      segment += 1
    }
    const from = points[segment]
    const to = points[segment + 1]
    const progress = distances[segment] <= 0
      ? 0
      : (target - covered) / distances[segment]
    const rawLngDelta = to[1] - from[1]
    const lngDelta = rawLngDelta > 180
      ? rawLngDelta - 360
      : rawLngDelta < -180
        ? rawLngDelta + 360
        : rawLngDelta
    result.push([
      from[0] + (to[0] - from[0]) * progress,
      ((from[1] + lngDelta * progress + 540) % 360) - 180,
    ])
  }
  result.push([...points.at(-1)!])
  return result
}

function allocateLegDurations(
  totalMs: number,
  distances: number[],
): number[] {
  if (distances.length === 1) return [totalMs]

  const floor = Math.min(
    900,
    Math.floor(totalMs / (distances.length * 2)),
  )
  const flex = totalMs - floor * distances.length
  const weights = distances.map((distance) => Math.max(0.001, distance))
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  const durations = weights.map((weight) => (
    floor + Math.floor(flex * weight / weightTotal)
  ))
  const remaining = totalMs
    - durations.reduce((sum, value) => sum + value, 0)
  durations[durations.length - 1] += remaining
  return durations
}

interface RawVehicleLeg {
  points: [number, number][]
  altitude: number
  distanceKm: number
  toName: string
}

export function buildVehicleRoute(track: TransportRoute): VehicleRoute {
  const mode = getTransportMode(track.type)
  const rawLegs: RawVehicleLeg[] = track.legs.map((leg) => {
    const points = mode.route.shape === 'arc'
      ? greatCirclePoints(leg.from, leg.to, 64)
      : resampleByDistance(leg.points)
    return {
      points,
      altitude: leg.altitude,
      distanceKm: pathDistanceKm(points),
      toName: leg.to.name,
    }
  })

  const distanceKm = rawLegs.reduce((sum, leg) => sum + leg.distanceKm, 0)
  const movementDurationMs = vehicleDurationForDistance(
    track.type,
    distanceKm,
  )
  const legDurations = allocateLegDurations(
    movementDurationMs,
    rawLegs.map((leg) => leg.distanceKm),
  )
  const stopHoldMs = (rawLegs.length - 1) * VEHICLE_STOP_HOLD_MS
  const points: [number, number][] = []
  let distanceCursor = 0
  let elapsedCursor = 0

  const legs = rawLegs.map((leg, index): VehicleRouteLeg => {
    const startProgress = distanceKm <= 0 ? 0 : distanceCursor / distanceKm
    distanceCursor += leg.distanceKm
    const endProgress = distanceKm <= 0 ? 1 : distanceCursor / distanceKm
    if (index > 0) elapsedCursor += VEHICLE_STOP_HOLD_MS
    const startMs = elapsedCursor
    const durationMs = legDurations[index]
    elapsedCursor += durationMs
    points.push(...(points.length === 0 ? leg.points : leg.points.slice(1)))
    return {
      ...leg,
      startProgress,
      endProgress,
      startMs,
      endMs: startMs + durationMs,
      durationMs,
    }
  })

  return {
    type: track.type,
    points,
    legs,
    altitude: Math.max(...legs.map((leg) => leg.altitude)),
    distanceKm,
    movementDurationMs,
    stopHoldMs,
    durationMs: movementDurationMs + stopHoldMs,
  }
}

export interface VehiclePosition {
  lat: number
  lng: number
  altitude: number
}

function samplePath(
  points: [number, number][],
  progress: number,
): [number, number] {
  if (points.length === 0) return [0, 0]
  const t = Math.max(0, Math.min(1, progress))
  if (t <= 0) return points[0]
  if (t >= 1) return points.at(-1)!

  const index = Math.floor(t * (points.length - 1))
  const fraction = t * (points.length - 1) - index
  const from = points[index]
  const to = points[index + 1]
  const rawLngDelta = to[1] - from[1]
  const lngDelta = rawLngDelta > 180
    ? rawLngDelta - 360
    : rawLngDelta < -180
      ? rawLngDelta + 360
      : rawLngDelta
  return [
    from[0] + (to[0] - from[0]) * fraction,
    ((from[1] + lngDelta * fraction + 540) % 360) - 180,
  ]
}

function legAtProgress(
  route: VehicleRoute,
  progress: number,
): VehicleRouteLeg | undefined {
  const t = Math.max(0, Math.min(1, progress))
  return route.legs.find((leg, index) => (
    index === route.legs.length - 1
    || (t >= leg.startProgress && t < leg.endProgress)
  )) ?? route.legs.at(-1)
}

export function vehicleAltitudeAt(
  route: VehicleRoute,
  progress: number,
): number {
  const leg = legAtProgress(route, progress)
  if (!leg) return 0
  const span = Math.max(1e-9, leg.endProgress - leg.startProgress)
  const local = (
    Math.max(0, Math.min(1, progress)) - leg.startProgress
  ) / span
  return getTransportMode(route.type).route.shape === 'arc'
    ? legAltitudeEnvelope(route.type, local, leg.altitude)
    : leg.altitude
}

export function sampleVehicleRoute(
  route: VehicleRoute,
  progress: number,
): VehiclePosition {
  const t = Math.max(0, Math.min(1, progress))
  const leg = legAtProgress(route, t)
  if (!leg) return { lat: 0, lng: 0, altitude: 0 }
  const span = Math.max(1e-9, leg.endProgress - leg.startProgress)
  const local = (t - leg.startProgress) / span
  const [lat, lng] = samplePath(leg.points, local)
  return { lat, lng, altitude: vehicleAltitudeAt(route, t) }
}
