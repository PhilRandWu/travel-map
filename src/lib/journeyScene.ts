import type { TransportType } from '@/types'
import type { Tracks } from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'

export interface SceneRoutePoint {
  lat: number
  lng: number
  altitude: number
}

export interface SceneRoute {
  id: string
  type: TransportType
  color: number
  dashed: boolean
  points: SceneRoutePoint[]
}

export function buildJourneySceneRoutes(tracks: Tracks): SceneRoute[] {
  return tracks.routes.map((route) => {
    const mode = getTransportMode(route.type)
    const points = route.legs.flatMap((leg) => leg.points.map(
      ([lat, lng], index) => {
        const progress = index / Math.max(1, leg.points.length - 1)
        return {
          lat,
          lng,
          altitude: mode.route.shape === 'arc'
            ? mode.route.baseAltitude
              + Math.sin(progress * Math.PI) * leg.altitude
            : mode.route.baseAltitude,
        }
      },
    ))
    return {
      id: route.trip.id,
      type: route.type,
      color: mode.route.colorNumber,
      dashed: mode.route.dashed,
      points,
    }
  })
}
