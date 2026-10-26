import type { TravelData } from '@/types'
import { resolveCities } from '@/lib/cities'
import { sortJourneysNewestFirst } from '@/lib/journeys'

export type TravelSearchKind = 'journey' | 'visit' | 'trip' | 'photo'

export interface TravelSearchResult {
  id: string
  kind: TravelSearchKind
  title: string
  subtitle: string
  journeyId: string
  cityId?: string
  visitId?: string
  tripId?: string
  photoFile?: string
}

interface RankedResult {
  result: TravelSearchResult
  score: number
  date: string
}

const normalize = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('zh-CN')
  .replace(/\s+/g, ' ')
  .trim()

const dateLabel = (value: string) => value.replaceAll('-', '.')

function fieldScore(field: string, query: string): number {
  const value = normalize(field)
  if (!value) return 0
  if (value === query) return 100
  if (value.startsWith(query)) return 82
  if (value.includes(query)) return 64

  const tokens = query.split(' ').filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => value.includes(token))) return 48
  return 0
}

function resultScore(fields: string[], query: string): number {
  return fields.reduce((best, field) => Math.max(best, fieldScore(field, query)), 0)
}

export function searchTravelData(
  data: TravelData,
  rawQuery: string,
  limit = 12,
): TravelSearchResult[] {
  const query = normalize(rawQuery)
  const cities = resolveCities(data)
  const ranked: RankedResult[] = []

  for (const journey of sortJourneysNewestFirst(data.journeys)) {
    const score = query
      ? resultScore([
          journey.title,
          journey.epigraph ?? '',
          journey.summary ?? '',
          journey.startDate,
          journey.endDate,
          journey.theme,
        ], query)
      : 1
    if (score > 0) {
      ranked.push({
        score,
        date: journey.endDate,
        result: {
          id: `journey:${journey.id}`,
          kind: 'journey',
          title: journey.title,
          subtitle: `${dateLabel(journey.startDate)} - ${dateLabel(journey.endDate)} · 旅程`,
          journeyId: journey.id,
        },
      })
    }
  }

  if (!query) {
    return ranked.slice(0, limit).map(({ result }) => result)
  }

  for (const visit of data.visits) {
    const city = cities.get(visit.city)
    const cityName = city?.name ?? visit.city
    const score = resultScore([
      cityName,
      city?.province ?? '',
      city?.country ?? '',
      visit.note ?? '',
      visit.arriveDate,
      visit.leaveDate,
    ], query)
    if (score > 0) {
      ranked.push({
        score,
        date: visit.leaveDate,
        result: {
          id: `visit:${visit.id}`,
          kind: 'visit',
          title: cityName,
          subtitle: `${dateLabel(visit.arriveDate)} - ${dateLabel(visit.leaveDate)} · ${visit.note ?? '城市到访'}`,
          journeyId: visit.journeyId,
          cityId: visit.city,
          visitId: visit.id,
        },
      })
    }

    for (const photo of visit.photos) {
      const photoScore = resultScore([
        photo.caption ?? '',
        photo.file,
        photo.takenAt ?? '',
        cityName,
        visit.note ?? '',
      ], query)
      if (photoScore === 0) continue
      ranked.push({
        score: photoScore + (photo.featured ? 2 : 0),
        date: photo.takenAt ?? visit.arriveDate,
        result: {
          id: `photo:${visit.id}:${photo.file}`,
          kind: 'photo',
          title: photo.caption || photo.file,
          subtitle: `${dateLabel(visit.arriveDate)} · ${cityName} · 照片`,
          journeyId: visit.journeyId,
          cityId: visit.city,
          visitId: visit.id,
          photoFile: photo.file,
        },
      })
    }
  }

  for (const trip of data.trips) {
    const route = [trip.from, ...trip.waypoints, trip.to]
      .map((cityId) => cities.get(cityId)?.name ?? cityId)
      .join(' → ')
    const transport = trip.type === 'flight' ? '飞机' : '高铁'
    const score = resultScore([
      route,
      trip.note ?? '',
      trip.date,
      transport,
      trip.type,
    ], query)
    if (score === 0) continue
    ranked.push({
      score,
      date: trip.date,
      result: {
        id: `trip:${trip.id}`,
        kind: 'trip',
        title: route,
        subtitle: `${dateLabel(trip.date)} · ${transport} · ${route}${trip.note ? ` · ${trip.note}` : ''}`,
        journeyId: trip.journeyId,
        cityId: trip.from,
        tripId: trip.id,
      },
    })
  }

  return ranked
    .sort((a, b) =>
      b.score - a.score
      || b.date.localeCompare(a.date)
      || a.result.id.localeCompare(b.result.id))
    .slice(0, limit)
    .map(({ result }) => result)
}
