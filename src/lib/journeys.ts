import type { City, Journey, JourneyScope, TravelData, Trip, Visit } from '@/types'
import { resolveCity, resolveCities } from '@/lib/cities'
import { tripDistance } from '@/lib/geo'
import { compareDate } from '@/lib/date'

export interface JourneyCoverSource {
  visitId: string
  file: string
  visit: Visit
}

export interface JourneySummary {
  journey: Journey
  tripCount: number
  visitCount: number
  destinationCityIds: string[]
  photoCount: number
  distanceKm: number
  coverSources: JourneyCoverSource[]
}

export function sortJourneysNewestFirst(journeys: Journey[]): Journey[] {
  return [...journeys].sort((a, b) => {
    const byEnd = compareDate(b.endDate, a.endDate)
    return byEnd || compareDate(b.startDate, a.startDate)
  })
}

export function groupJourneysByYear(
  journeys: Journey[],
): Array<{ year: number; journeys: Journey[] }> {
  const groups = new Map<number, Journey[]>()

  for (const journey of sortJourneysNewestFirst(journeys)) {
    const year = Number(journey.startDate.slice(0, 4))
    const list = groups.get(year) ?? []
    list.push(journey)
    groups.set(year, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, journeys: items }))
}

export function findJourney(data: TravelData, journeyId: string): Journey | undefined {
  return data.journeys.find((journey) => journey.id === journeyId)
}

export function getJourneyTrips(data: TravelData, journeyId: string): Trip[] {
  return data.trips
    .filter((trip) => trip.journeyId === journeyId)
    .sort((a, b) => compareDate(a.date, b.date))
}

export function getJourneyVisits(data: TravelData, journeyId: string): Visit[] {
  return data.visits
    .filter((visit) => visit.journeyId === journeyId)
    .sort((a, b) => compareDate(a.arriveDate, b.arriveDate))
}

export function getOtherJourneyTrips(data: TravelData, journeyId: string): Trip[] {
  return data.trips
    .filter((trip) => trip.journeyId !== journeyId)
    .sort((a, b) => compareDate(a.date, b.date))
}

export function getJourneyCoverSources(
  data: TravelData,
  journey: Journey,
): JourneyCoverSource[] {
  return journey.coverPhotos.flatMap((cover) => {
    const visit = data.visits.find((item) => item.id === cover.visitId)

    if (!visit || visit.journeyId !== journey.id) return []
    if (!visit.photos.some((photo) => photo.file === cover.file)) return []

    return [{ ...cover, visit }]
  })
}

export function getJourneyPhotoCount(data: TravelData, journeyId: string): number {
  return getJourneyVisits(data, journeyId)
    .reduce((total, visit) => total + visit.photos.length, 0)
}

export function getJourneyDistanceKm(data: TravelData, journeyId: string): number {
  const cityMap = resolveCities(data)

  return Math.round(getJourneyTrips(data, journeyId)
    .reduce((total, trip) => total + (tripDistance(trip, cityMap) ?? 0), 0))
}

export function getJourneyDestinationCityIds(
  data: TravelData,
  journeyId: string,
): string[] {
  const ids = new Set(
    getJourneyVisits(data, journeyId)
      .map((visit) => visit.city)
      .filter((cityId) => cityId !== data.meta.homeCity),
  )

  return [...ids]
}

export function summarizeJourney(data: TravelData, journey: Journey): JourneySummary {
  return {
    journey,
    tripCount: getJourneyTrips(data, journey.id).length,
    visitCount: getJourneyVisits(data, journey.id).length,
    destinationCityIds: getJourneyDestinationCityIds(data, journey.id),
    photoCount: getJourneyPhotoCount(data, journey.id),
    distanceKm: getJourneyDistanceKm(data, journey.id),
    coverSources: getJourneyCoverSources(data, journey),
  }
}

export function scopeTravelData(data: TravelData, scope: JourneyScope): TravelData {
  if (scope.kind === 'archive') return data

  const journey = findJourney(data, scope.journeyId)
  if (!journey) {
    return { ...data, journeys: [], trips: [], visits: [] }
  }

  return {
    ...data,
    journeys: [journey],
    trips: data.trips.filter((trip) => trip.journeyId === journey.id),
    visits: data.visits.filter((visit) => visit.journeyId === journey.id),
  }
}

export function getHomeCity(data: TravelData): City | undefined {
  return resolveCity(data, data.meta.homeCity)
}

export function getJourneyCityMap(data: TravelData): Map<string, City> {
  return resolveCities(data)
}
