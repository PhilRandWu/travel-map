import type {
  Journey,
  JourneyCoverPhoto,
  JourneyTheme,
  Photo,
  TravelData,
  Visit,
} from '@/types'
import { resolveCity } from '@/lib/cities'
import { nextEntityId } from '@/lib/editorModel'
import { getJourneyVisits, sortJourneysNewestFirst } from '@/lib/journeys'

const THEMES: JourneyTheme[] = ['amber', 'cyan', 'sage', 'rose']

export interface JourneyDraft {
  id: string
  title: string
  startDate: string
  endDate: string
  epigraph: string
  summary: string
  theme: JourneyTheme
  coverPhotos: JourneyCoverPhoto[]
}

export interface JourneyCoverOption {
  visit: Visit
  photo: Photo
  cityName: string
}

export interface JourneyMutationResult {
  data: TravelData
  journeyId: string
}

function localISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createJourneyDraft(
  data: TravelData,
  today = new Date(),
): JourneyDraft {
  const date = localISODate(today)
  return {
    id: nextEntityId('j', data.journeys.map((journey) => journey.id)),
    title: '新旅程',
    startDate: date,
    endDate: date,
    epigraph: '',
    summary: '',
    theme: THEMES[data.journeys.length % THEMES.length],
    coverPhotos: [],
  }
}

export function resolveActiveJourneyId(
  journeys: Journey[],
  preferredId?: string,
): string {
  if (preferredId && journeys.some((journey) => journey.id === preferredId)) {
    return preferredId
  }
  return sortJourneysNewestFirst(journeys)[0]?.id ?? ''
}

export function editJourneyDraft(journey: Journey): JourneyDraft {
  return {
    id: journey.id,
    title: journey.title,
    startDate: journey.startDate,
    endDate: journey.endDate,
    epigraph: journey.epigraph ?? '',
    summary: journey.summary ?? '',
    theme: journey.theme,
    coverPhotos: journey.coverPhotos.map((cover) => ({ ...cover })),
  }
}

export function saveJourney(
  data: TravelData,
  draft: JourneyDraft,
): TravelData {
  const journey: Journey = {
    id: draft.id,
    title: draft.title.trim(),
    startDate: draft.startDate,
    endDate: draft.endDate,
    epigraph: draft.epigraph.trim() || undefined,
    summary: draft.summary.trim() || undefined,
    theme: draft.theme,
    coverPhotos: draft.coverPhotos.slice(0, 5),
  }
  const exists = data.journeys.some((item) => item.id === journey.id)
  const journeys = exists
    ? data.journeys.map((item) => (item.id === journey.id ? journey : item))
    : [...data.journeys, journey]

  return { ...data, journeys }
}

export function removeJourney(
  data: TravelData,
  journeyId: string,
): TravelData {
  return {
    ...data,
    journeys: data.journeys.filter((journey) => journey.id !== journeyId),
    visits: data.visits.filter((visit) => visit.journeyId !== journeyId),
    trips: data.trips.filter((trip) => trip.journeyId !== journeyId),
  }
}

export function duplicateJourneySettings(
  data: TravelData,
  journeyId: string,
): JourneyMutationResult | null {
  const source = data.journeys.find((journey) => journey.id === journeyId)
  if (!source) return null

  const id = nextEntityId('j', data.journeys.map((journey) => journey.id))
  const suffix = ' 副本'
  const copy: Journey = {
    id,
    title: `${source.title.slice(0, 40 - suffix.length)}${suffix}`,
    startDate: source.startDate,
    endDate: source.endDate,
    epigraph: source.epigraph,
    summary: source.summary,
    theme: source.theme,
    coverPhotos: [],
  }

  return {
    data: { ...data, journeys: [...data.journeys, copy] },
    journeyId: id,
  }
}

export function listJourneyCoverOptions(
  data: TravelData,
  journeyId: string,
): JourneyCoverOption[] {
  return getJourneyVisits(data, journeyId).flatMap((visit) => {
    const cityName = resolveCity(data, visit.city)?.name ?? visit.city
    return visit.photos.map((photo) => ({ visit, photo, cityName }))
  })
}
