import type { MemoryMode, MemorySource, TravelData, Visit } from '@/types'
import { resolveCity } from '@/lib/cities'
import { compareDate } from '@/lib/validate'

export interface MemoryPhoto {
  key: string
  visitId: string
  journeyId: string
  chapterKey: string
  cityId: string
  cityName: string
  file: string
  caption?: string
  takenAt?: string
  featured: boolean
  focalPoint?: { x: number; y: number }
  timeUnknown: boolean
  sourceIndex: number
}

export interface MemoryChapter {
  key: string
  visitId: string
  journeyId: string
  cityId: string
  cityName: string
  arriveDate: string
  leaveDate: string
  photos: MemoryPhoto[]
}

export interface MemoryCollection {
  source: MemorySource
  photos: MemoryPhoto[]
  chapters: MemoryChapter[]
  hasFeatured: boolean
}

function sourceVisits(data: TravelData, source: MemorySource): Visit[] {
  return data.visits
    .filter((visit) => source.kind === 'visit'
      ? visit.id === source.visitId
      : visit.journeyId === source.journeyId)
    .sort((a, b) =>
      compareDate(a.arriveDate, b.arriveDate) || a.id.localeCompare(b.id))
}

function sortVisitPhotos(visit: Visit, cityName: string): MemoryPhoto[] {
  return visit.photos
    .map((photo, sourceIndex): MemoryPhoto => ({
      key: `${visit.id}:${photo.file}`,
      visitId: visit.id,
      journeyId: visit.journeyId,
      chapterKey: visit.id,
      cityId: visit.city,
      cityName,
      file: photo.file,
      caption: photo.caption,
      takenAt: photo.takenAt,
      featured: photo.featured === true,
      focalPoint: photo.focalPoint,
      timeUnknown: !photo.takenAt,
      sourceIndex,
    }))
    .sort((a, b) => {
      if (a.takenAt && b.takenAt) {
        return a.takenAt.localeCompare(b.takenAt) || a.sourceIndex - b.sourceIndex
      }
      if (a.takenAt) return -1
      if (b.takenAt) return 1
      return a.sourceIndex - b.sourceIndex
    })
}

export function buildMemoryCollection(
  data: TravelData,
  source: MemorySource,
): MemoryCollection {
  const chapters = sourceVisits(data, source).map((visit): MemoryChapter => {
    const cityName = resolveCity(data, visit.city)?.name ?? visit.city
    return {
      key: visit.id,
      visitId: visit.id,
      journeyId: visit.journeyId,
      cityId: visit.city,
      cityName,
      arriveDate: visit.arriveDate,
      leaveDate: visit.leaveDate,
      photos: sortVisitPhotos(visit, cityName),
    }
  })
  const photos = chapters.flatMap((chapter) => chapter.photos)

  return {
    source,
    photos,
    chapters,
    hasFeatured: photos.some((photo) => photo.featured),
  }
}

export function filterMemoryPhotos(
  collection: MemoryCollection,
  mode: MemoryMode,
): MemoryPhoto[] {
  return filterMemoryCollection(collection, mode).photos
}

export function filterMemoryCollection(
  collection: MemoryCollection,
  mode: MemoryMode,
): MemoryCollection {
  if (mode !== 'featured' || !collection.hasFeatured) return collection
  const chapters = collection.chapters
    .map((chapter) => ({
      ...chapter,
      photos: chapter.photos.filter((photo) => photo.featured),
    }))
    .filter((chapter) => chapter.photos.length > 0)

  return {
    ...collection,
    chapters,
    photos: chapters.flatMap((chapter) => chapter.photos),
  }
}

export function initialMemoryMode(collection: MemoryCollection): MemoryMode {
  return collection.hasFeatured ? 'featured' : 'all'
}

export function clampMemoryIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.trunc(index)))
}
