import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData, Visit } from '@/types'
import {
  buildMemoryCollection,
  filterMemoryPhotos,
} from '@/lib/memory'

const data = dataJson as TravelData

describe('memory collection', () => {
  it('builds a journey collection grouped by visit chapter', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    expect(collection.photos).toHaveLength(5)
    expect(collection.chapters.map((chapter) => chapter.visitId)).toEqual(['v001', 'v002'])
    expect(collection.hasFeatured).toBe(true)
  })

  it('filters featured photos while preserving source order', () => {
    const collection = buildMemoryCollection(data, { kind: 'visit', visitId: 'v001' })
    expect(filterMemoryPhotos(collection, 'all').map((photo) => photo.file))
      .toEqual(['01.svg', '02.svg', '03.svg'])
    expect(filterMemoryPhotos(collection, 'featured').map((photo) => photo.file))
      .toEqual(['01.svg', '02.svg'])
  })

  it('keeps separate chapters for the same city in different visits', () => {
    const cloned = structuredClone(data)
    const repeated: Visit = {
      ...cloned.visits[0],
      id: 'v-repeat',
      arriveDate: '2025-05-04',
      leaveDate: '2025-05-04',
      photos: [{ ...cloned.visits[0].photos[0], file: 'repeat.svg' }],
    }
    cloned.visits.push(repeated)
    const collection = buildMemoryCollection(cloned, { kind: 'journey', journeyId: 'j001' })
    expect(collection.chapters.filter((chapter) => chapter.cityId === 'hangzhou'))
      .toHaveLength(2)
  })

  it('places untimed photos after timed photos while preserving their own order', () => {
    const cloned = structuredClone(data)
    cloned.visits[0].photos = [
      { file: 'unknown-a.svg' },
      { file: 'late.svg', takenAt: '2025-05-02T18:00:00+08:00' },
      { file: 'unknown-b.svg' },
      { file: 'early.svg', takenAt: '2025-05-01T08:00:00+08:00' },
    ]
    const collection = buildMemoryCollection(cloned, { kind: 'visit', visitId: 'v001' })
    expect(collection.photos.map((photo) => photo.file))
      .toEqual(['early.svg', 'late.svg', 'unknown-a.svg', 'unknown-b.svg'])
  })

  it('keeps a 360-photo journey grouped into stable chapters', () => {
    const cloned = structuredClone(data)
    const baseVisit = cloned.visits[0]
    cloned.visits = Array.from({ length: 12 }, (_, chapterIndex) => ({
      ...baseVisit,
      id: `stress-${chapterIndex}`,
      arriveDate: `2025-05-${String(chapterIndex + 1).padStart(2, '0')}`,
      leaveDate: `2025-05-${String(chapterIndex + 1).padStart(2, '0')}`,
      photos: Array.from({ length: 30 }, (_, photoIndex) => ({
        file: `photo-${String(photoIndex).padStart(2, '0')}.svg`,
        takenAt: `2025-05-${String(chapterIndex + 1).padStart(2, '0')}T${String(
          8 + Math.floor(photoIndex / 10),
        ).padStart(2, '0')}:${String((photoIndex % 10) * 5).padStart(2, '0')}:00+08:00`,
      })),
    }))

    const collection = buildMemoryCollection(
      cloned,
      { kind: 'journey', journeyId: 'j001' },
    )

    expect(collection.photos).toHaveLength(360)
    expect(collection.chapters).toHaveLength(12)
    expect(collection.chapters.every((chapter) => chapter.photos.length === 30))
      .toBe(true)
    expect(new Set(collection.photos.map((photo) => photo.key)).size).toBe(360)
    expect(collection.chapters[0].photos[0].file).toBe('photo-00.svg')
    expect(collection.chapters[11].photos[29].file).toBe('photo-29.svg')
  })
})
