import type { City, Journey, Photo, TravelData, Trip, TransportType, Visit } from '@/types'
import { resolveCity } from '@/lib/cities'
import { listCityOptions } from '@/lib/editorCityCatalog'
import { TRANSPORT_WAYPOINT_LIMIT } from '@/lib/transportModes'
import { validateTravelData, type ValidationIssue } from '@/lib/validate'

export {
  listCityOptions,
  searchCities,
} from '@/lib/editorCityCatalog'

export interface VisitDraft {
  id: string
  journeyId: string
  city: City | null
  arriveDate: string
  leaveDate: string
  note: string
  photos: Photo[]
}

export type CompleteVisitDraft = VisitDraft & { city: City }

export interface TripDraft {
  id: string
  journeyId: string
  type: TransportType
  date: string
  from: City | null
  to: City | null
  waypoints: City[]
  note: string
}

export type CompleteTripDraft = TripDraft & { from: City; to: City }

export interface CustomCityInput {
  name: string
  province: string
  country: string
  lat: number
  lng: number
}

export function makeCityId(name: string, data: TravelData): string {
  const used = new Set(listCityOptions(data).map((city) => city.id))
  const base = name
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'city'

  if (!used.has(base)) return base

  let index = 2
  while (used.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

export function createCustomCity(data: TravelData, input: CustomCityInput): City {
  return {
    id: makeCityId(input.name, data),
    name: input.name.trim(),
    province: input.province.trim() || '未知',
    country: input.country.trim() || '中国',
    lat: input.lat,
    lng: input.lng,
  }
}

export function nextEntityId(prefix: 'v' | 't' | 'j', ids: string[]): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  for (const id of ids) {
    const match = pattern.exec(id)
    if (match) max = Math.max(max, Number(match[1]))
  }

  const used = new Set(ids)
  let next = max + 1
  while (used.has(`${prefix}${String(next).padStart(3, '0')}`)) next += 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

export function createVisitDraft(data: TravelData, journey: Journey): VisitDraft {
  return {
    id: nextEntityId('v', data.visits.map((visit) => visit.id)),
    journeyId: journey.id,
    city: null,
    arriveDate: journey.startDate,
    leaveDate: journey.startDate,
    note: '',
    photos: [],
  }
}

export function editVisitDraft(data: TravelData, visit: Visit): VisitDraft {
  return {
    id: visit.id,
    journeyId: visit.journeyId,
    city: resolveCity(data, visit.city) ?? null,
    arriveDate: visit.arriveDate,
    leaveDate: visit.leaveDate,
    note: visit.note ?? '',
    photos: visit.photos.map((photo) => ({ ...photo })),
  }
}

export function createTripDraft(data: TravelData, journey: Journey): TripDraft {
  return {
    id: nextEntityId('t', data.trips.map((trip) => trip.id)),
    journeyId: journey.id,
    type: 'flight',
    date: journey.startDate,
    from: null,
    to: null,
    waypoints: [],
    note: '',
  }
}

export function editTripDraft(data: TravelData, trip: Trip): TripDraft {
  return {
    id: trip.id,
    journeyId: trip.journeyId,
    type: trip.type,
    date: trip.date,
    from: resolveCity(data, trip.from) ?? null,
    to: resolveCity(data, trip.to) ?? null,
    waypoints: trip.waypoints.flatMap((id) => {
      const city = resolveCity(data, id)
      return city ? [city] : []
    }),
    note: trip.note ?? '',
  }
}

function withCity(data: TravelData, city: City): TravelData {
  if (data.cities.some((item) => item.id === city.id)) return data
  return { ...data, cities: [...data.cities, city] }
}

function expandJourney(journey: Journey, dates: string[]): Journey {
  const allDates = [journey.startDate, journey.endDate, ...dates].filter(Boolean).sort()
  const startDate = allDates[0]
  const endDate = allDates[allDates.length - 1]
  if (startDate === journey.startDate && endDate === journey.endDate) return journey
  return { ...journey, startDate, endDate }
}

function sortVisits(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => a.arriveDate.localeCompare(b.arriveDate)
    || a.id.localeCompare(b.id))
}

function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => a.date.localeCompare(b.date)
    || a.id.localeCompare(b.id))
}

export function saveVisit(data: TravelData, draft: CompleteVisitDraft): TravelData {
  const journey = data.journeys.find((item) => item.id === draft.journeyId)
  if (!journey) return data

  const visit: Visit = {
    id: draft.id,
    journeyId: draft.journeyId,
    city: draft.city.id,
    arriveDate: draft.arriveDate,
    leaveDate: draft.leaveDate,
    note: draft.note.trim() || undefined,
    photos: draft.photos,
  }
  const next = withCity(data, draft.city)
  const fileNames = new Set(visit.photos.map((photo) => photo.file))
  const visits = next.visits.some((item) => item.id === visit.id)
    ? next.visits.map((item) => (item.id === visit.id ? visit : item))
    : [...next.visits, visit]
  const journeys = next.journeys.map((item) => {
    if (item.id !== journey.id) return item
    const expanded = expandJourney(item, [visit.arriveDate, visit.leaveDate])
    return {
      ...expanded,
      coverPhotos: expanded.coverPhotos.filter((cover) => (
        cover.visitId !== visit.id || fileNames.has(cover.file)
      )),
    }
  })

  return { ...next, journeys, visits: sortVisits(visits) }
}

export function saveTrip(data: TravelData, draft: CompleteTripDraft): TravelData {
  const journey = data.journeys.find((item) => item.id === draft.journeyId)
  if (!journey) return data

  const seen = new Set<string>([draft.from.id, draft.to.id])
  const waypoints = draft.waypoints
    .filter((city) => {
      if (seen.has(city.id)) return false
      seen.add(city.id)
      return true
    })
    .slice(0, TRANSPORT_WAYPOINT_LIMIT)
  const trip: Trip = {
    id: draft.id,
    journeyId: draft.journeyId,
    type: draft.type,
    date: draft.date,
    from: draft.from.id,
    to: draft.to.id,
    waypoints: waypoints.map((city) => city.id),
    note: draft.note.trim() || undefined,
  }

  let next = withCity(data, draft.from)
  next = withCity(next, draft.to)
  for (const city of waypoints) next = withCity(next, city)

  const trips = next.trips.some((item) => item.id === trip.id)
    ? next.trips.map((item) => (item.id === trip.id ? trip : item))
    : [...next.trips, trip]
  const journeys = next.journeys.map((item) => (
    item.id === journey.id ? expandJourney(item, [trip.date]) : item
  ))

  return { ...next, journeys, trips: sortTrips(trips) }
}

export function removeVisit(data: TravelData, visitId: string): TravelData {
  const visits = data.visits.filter((visit) => visit.id !== visitId)
  const journeys = data.journeys.map((journey) => ({
    ...journey,
    coverPhotos: journey.coverPhotos.filter((cover) => cover.visitId !== visitId),
  }))
  return { ...data, visits, journeys }
}

export function removeTrip(data: TravelData, tripId: string): TravelData {
  return { ...data, trips: data.trips.filter((trip) => trip.id !== tripId) }
}

function errorKey(issue: ValidationIssue): string {
  return `${issue.subject}\u0000${issue.message}`
}

/** 仅返回本次编辑新引入的 error，保留既有告警与无关记录。 */
export function newEditorErrors(
  before: TravelData,
  after: TravelData,
): ValidationIssue[] {
  const baseline = new Set(
    validateTravelData(before)
      .filter((issue) => issue.level === 'error')
      .map(errorKey),
  )

  return validateTravelData(after)
    .filter((issue) => issue.level === 'error' && !baseline.has(errorKey(issue)))
}
