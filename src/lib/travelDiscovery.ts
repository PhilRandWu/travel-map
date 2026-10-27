import type { TravelData, Visit } from '@/types'
import { resolveCity } from '@/lib/cities'
import { compareDate } from '@/lib/date'

export interface RandomMemoryTarget {
  journeyId: string
  cityId: string
  visitId: string
  photoFile?: string
}

export type MemoryDiscoveryKind = 'anniversary' | 'recent' | 'same-city'

export interface MemoryDiscovery {
  id: string
  kind: MemoryDiscoveryKind
  label: string
  title: string
  subtitle: string
  target: RandomMemoryTarget
}

export interface MemoryDiscoveryOptions {
  referenceDate?: Date
  currentCityId?: string | null
}

export function memoryTargetKey(target: RandomMemoryTarget): string {
  return [
    target.journeyId,
    target.cityId,
    target.visitId,
    target.photoFile ?? '',
  ].join(':')
}

function targetForVisit(visit: Visit): RandomMemoryTarget {
  const photo = visit.photos.find((item) => item.featured) ?? visit.photos[0]
  return {
    journeyId: visit.journeyId,
    cityId: visit.city,
    visitId: visit.id,
    ...(photo ? { photoFile: photo.file } : {}),
  }
}

function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function journeyTitle(data: TravelData, visit: Visit): string {
  return data.journeys.find((journey) => journey.id === visit.journeyId)?.title
    ?? '一段旅程'
}

function discovery(
  data: TravelData,
  kind: MemoryDiscoveryKind,
  visit: Visit,
  subtitle: string,
): MemoryDiscovery {
  const target = targetForVisit(visit)
  const cityName = resolveCity(data, visit.city)?.name ?? visit.city
  const label = kind === 'anniversary'
    ? '往年的今天'
    : kind === 'recent'
      ? '最近回忆'
      : '同城旧事'
  return {
    id: `${kind}:${memoryTargetKey(target)}`,
    kind,
    label,
    title: cityName,
    subtitle,
    target,
  }
}

export function buildMemoryDiscovery(
  data: TravelData,
  options: MemoryDiscoveryOptions = {},
): MemoryDiscovery[] {
  const referenceDate = options.referenceDate ?? new Date()
  const today = localDateKey(referenceDate)
  const currentYear = referenceDate.getFullYear()
  const result: MemoryDiscovery[] = []
  const used = new Set<string>()

  const anniversary = data.visits
    .filter((visit) => (
      visit.arriveDate.slice(5) <= today.slice(5)
      && visit.leaveDate.slice(5) >= today.slice(5)
      && Number(visit.arriveDate.slice(0, 4)) < currentYear
    ))
    .sort((a, b) => compareDate(b.arriveDate, a.arriveDate))[0]
  if (anniversary) {
    const item = discovery(
      data,
      'anniversary',
      anniversary,
      `${anniversary.arriveDate.slice(0, 4)} 年的今天 · ${journeyTitle(data, anniversary)}`,
    )
    result.push(item)
    used.add(memoryTargetKey(item.target))
  }

  const recent = [...data.visits]
    .sort((a, b) =>
      compareDate(b.leaveDate, a.leaveDate)
      || compareDate(b.arriveDate, a.arriveDate))[0]
  if (recent) {
    const item = discovery(
      data,
      'recent',
      recent,
      `${recent.leaveDate.replaceAll('-', '.')} · ${journeyTitle(data, recent)}`,
    )
    result.push(item)
    used.add(memoryTargetKey(item.target))
  }

  const byCity = new Map<string, Visit[]>()
  for (const visit of data.visits) {
    const visits = byCity.get(visit.city) ?? []
    visits.push(visit)
    byCity.set(visit.city, visits)
  }
  const repeated = [...byCity.entries()]
    .filter(([, visits]) => visits.length > 1)
    .sort(([aId, aVisits], [bId, bVisits]) => {
      const aCurrent = aId === options.currentCityId ? 1 : 0
      const bCurrent = bId === options.currentCityId ? 1 : 0
      return bCurrent - aCurrent || bVisits.length - aVisits.length
    })
    .flatMap(([, visits]) => [...visits].sort((a, b) =>
      compareDate(a.arriveDate, b.arriveDate)))
  const sameCity = repeated.find((visit) => (
    !used.has(memoryTargetKey(targetForVisit(visit)))
  ))
  if (sameCity) {
    const cityName = resolveCity(data, sameCity.city)?.name ?? sameCity.city
    result.push(discovery(
      data,
      'same-city',
      sameCity,
      `再次走进 ${sameCity.arriveDate.slice(0, 4)} 年的 ${cityName}`,
    ))
  }

  return result
}

export function pickRandomMemory(
  data: TravelData,
  random: () => number = Math.random,
  excludedKeys: string[] = [],
): RandomMemoryTarget | null {
  const photos = data.visits.flatMap((visit) => visit.photos.map((photo) => ({
    journeyId: visit.journeyId,
    cityId: visit.city,
    visitId: visit.id,
    photoFile: photo.file,
    featured: photo.featured === true,
  })))
  const featured = photos.filter((photo) => photo.featured)
  const completePool = featured.length > 0 ? featured : photos
  const available = completePool.filter((photo) => (
    !excludedKeys.includes(memoryTargetKey(photo))
  ))
  const pool = available.length > 0 ? available : completePool

  if (pool.length > 0) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
    const target = pool[index]
    return {
      journeyId: target.journeyId,
      cityId: target.cityId,
      visitId: target.visitId,
      photoFile: target.photoFile,
    }
  }

  if (data.visits.length === 0) return null
  const index = Math.min(
    data.visits.length - 1,
    Math.floor(random() * data.visits.length),
  )
  const visit = data.visits[index]
  return {
    journeyId: visit.journeyId,
    cityId: visit.city,
    visitId: visit.id,
  }
}
