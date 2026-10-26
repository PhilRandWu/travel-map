import type { TravelData } from '@/types'

export interface RandomMemoryTarget {
  journeyId: string
  cityId: string
  visitId: string
  photoFile?: string
}

export function pickRandomMemory(
  data: TravelData,
  random: () => number = Math.random,
): RandomMemoryTarget | null {
  const photos = data.visits.flatMap((visit) => visit.photos.map((photo) => ({
    journeyId: visit.journeyId,
    cityId: visit.city,
    visitId: visit.id,
    photoFile: photo.file,
    featured: photo.featured === true,
  })))
  const featured = photos.filter((photo) => photo.featured)
  const pool = featured.length > 0 ? featured : photos

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
