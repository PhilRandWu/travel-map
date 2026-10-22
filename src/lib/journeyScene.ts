import type { Tracks } from '@/lib/tracks'
import { greatCirclePoints } from '@/lib/geo'

export interface SceneRoutePoint {
  lat: number
  lng: number
  altitude: number
}

export interface SceneRoute {
  id: string
  type: 'flight' | 'train'
  points: SceneRoutePoint[]
}

const GROUND_ALTITUDE = 0.004

export function buildJourneySceneRoutes(tracks: Tracks): SceneRoute[] {
  const flights = tracks.flights.map((track): SceneRoute => {
    const points = greatCirclePoints(
      { lat: track.startLat, lng: track.startLng },
      { lat: track.endLat, lng: track.endLng },
      64,
    )
    return {
      id: track.trip.id,
      type: 'flight',
      points: points.map(([lat, lng], index) => ({
        lat,
        lng,
        altitude: GROUND_ALTITUDE
          + Math.sin((index / Math.max(1, points.length - 1)) * Math.PI)
          * track.altitude,
      })),
    }
  })
  const trains = tracks.trains.map((track): SceneRoute => ({
    id: track.trip.id,
    type: 'train',
    points: track.points.map(([lat, lng]) => ({
      lat,
      lng,
      altitude: GROUND_ALTITUDE,
    })),
  }))
  return [...flights, ...trains]
}
