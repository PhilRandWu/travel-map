import type { City, TransportType, TravelData, Trip } from '@/types'
import { resolveCities } from '@/lib/cities'
import { compareDate } from '@/lib/date'
import { flightArcAltitude, greatCirclePoints, haversineKm } from '@/lib/geo'
import { getTransportMode } from '@/lib/transportModes'
import {
  appendSegment,
  corridorKey,
  laneOffsetDegrees,
  offsetSurfaceSegment,
} from '@/lib/trackGeometry'

export interface TransportRouteLeg {
  from: City
  to: City
  points: [number, number][]
  altitude: number
  midLat: number
  midLng: number
}

export interface TransportRoute {
  trip: Trip
  type: TransportType
  routeShape: 'arc' | 'surface'
  color: string
  stops: City[]
  legs: TransportRouteLeg[]
  points: [number, number][]
  altitude: number
  label: string
  midLat: number
  midLng: number
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

/**
 * Task 4/5 完成迁移前，保留旧展示层所需的结构。
 * 新代码只能读取 routes，flights/trains 将在载具迁移后删除。
 */
export interface FlightArc {
  trip: Trip
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  altitude: number
  midLat: number
  midLng: number
  label: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface TrainPath {
  trip: Trip
  points: [number, number][]
  midLat: number
  midLng: number
  label: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface Tracks {
  routes: TransportRoute[]
  /** @deprecated 旧轨迹图层兼容字段，Task 5 迁移后删除。 */
  flights: FlightArc[]
  /** @deprecated 旧地面轨迹兼容字段，Task 5 迁移后删除。 */
  trains: TrainPath[]
}

function toFlightArc(route: TransportRoute): FlightArc {
  return {
    trip: route.trip,
    startLat: route.fromLat,
    startLng: route.fromLng,
    endLat: route.toLat,
    endLng: route.toLng,
    altitude: route.altitude,
    midLat: route.midLat,
    midLng: route.midLng,
    label: route.label,
    fromLat: route.fromLat,
    fromLng: route.fromLng,
    toLat: route.toLat,
    toLng: route.toLng,
  }
}

function toSurfacePath(route: TransportRoute): TrainPath {
  return {
    trip: route.trip,
    points: route.points,
    midLat: route.midLat,
    midLng: route.midLng,
    label: route.label,
    fromLat: route.fromLat,
    fromLng: route.fromLng,
    toLat: route.toLat,
    toLng: route.toLng,
  }
}

export function buildTracks(data: TravelData): Tracks {
  const cityMap = resolveCities(data)
  const corridorCounts = new Map<string, number>()
  const routes: TransportRoute[] = []

  const trips = [...data.trips].sort((a, b) => (
    compareDate(a.date, b.date) || a.id.localeCompare(b.id)
  ))
  for (const trip of trips) {
    const ids = [trip.from, ...trip.waypoints, trip.to]
    const stops = ids.map((id) => cityMap.get(id))
    if (stops.some((city) => !city)) continue

    const cities = stops as City[]
    const mode = getTransportMode(trip.type)
    const legs: TransportRouteLeg[] = []

    for (let index = 1; index < cities.length; index += 1) {
      const from = cities[index - 1]
      const to = cities[index]
      const countKey = `${mode.route.shape}|${corridorKey(from.id, to.id)}`
      const duplicate = corridorCounts.get(countKey) ?? 0
      corridorCounts.set(countKey, duplicate + 1)

      const points = mode.route.shape === 'arc'
        ? greatCirclePoints(from, to, 32)
        : offsetSurfaceSegment(
            from,
            to,
            laneOffsetDegrees(duplicate, mode.route.laneOffsetDeg),
          )
      const altitude = mode.route.shape === 'arc'
        ? flightArcAltitude(haversineKm(from, to)) * (1 + duplicate * 0.18)
        : mode.route.baseAltitude
      const mid = points[Math.floor(points.length / 2)]
      legs.push({
        from,
        to,
        points,
        altitude,
        midLat: mid[0],
        midLng: mid[1],
      })
    }

    const points: [number, number][] = []
    for (const leg of legs) appendSegment(points, leg.points)
    const midpoint = points[Math.floor(points.length / 2)]
    const names = cities.map((city) => city.name).join(' → ')

    routes.push({
      trip,
      type: trip.type,
      routeShape: mode.route.shape,
      color: mode.route.colorHex,
      stops: cities,
      legs,
      points,
      altitude: Math.max(...legs.map((leg) => leg.altitude)),
      label: `${trip.date} · ${names}${trip.note ? ` · ${trip.note}` : ''}`,
      midLat: midpoint[0],
      midLng: midpoint[1],
      fromLat: cities[0].lat,
      fromLng: cities[0].lng,
      toLat: cities.at(-1)!.lat,
      toLng: cities.at(-1)!.lng,
    })
  }

  return {
    routes,
    flights: routes
      .filter((route) => route.type === 'flight')
      .map(toFlightArc),
    trains: routes
      .filter((route) => route.type !== 'flight')
      .map(toSurfacePath),
  }
}
