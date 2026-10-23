import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { validateTravelData } from '@/lib/validate'

const sample = () => structuredClone(dataJson) as TravelData

describe('journey validation', () => {
  it('accepts the migrated sample data', () => {
    expect(validateTravelData(sample()).filter((issue) => issue.level === 'error')).toEqual([])
  })

  it('rejects a trip outside its journey date range', () => {
    const data = sample()
    data.trips[0].date = '2025-04-30'

    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'trip:t001',
    }))
  })

  it('rejects a missing journey reference', () => {
    const data = sample()
    data.visits[0].journeyId = 'missing'

    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
    }))
  })

  it('rejects an invalid cover photo', () => {
    const data = sample()
    data.journeys[0].coverPhotos[0] = { visitId: 'v001', file: 'missing.jpg' }

    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'journey:j001',
    }))
  })

  it('rejects a cover photo from another journey', () => {
    const data = sample()
    data.journeys[0].coverPhotos[0] = { visitId: 'v003', file: '03.svg' }

    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'journey:j001',
    }))
  })

  it('rejects a home-city visit', () => {
    const data = sample()
    data.visits[0].city = data.meta.homeCity

    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
    }))
  })

  it('rejects out-of-range focal points', () => {
    const data = sample()
    data.visits[0].photos[0].focalPoint = { x: 1.2, y: 0.5 }

    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
    }))
  })

  it('reports a non-array photos field without throwing', () => {
    const data = sample()
    ;(data.visits[0] as unknown as { photos: unknown }).photos = null

    expect(() => validateTravelData(data)).not.toThrow()
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
      message: 'photos 必须是数组',
    }))
  })

  it('reports invalid cover and photo entries without dereferencing them', () => {
    const data = sample()
    ;(data.journeys[0].coverPhotos as unknown as unknown[])[0] = null
    ;(data.visits[0].photos as unknown as unknown[])[0] = null

    expect(() => validateTravelData(data)).not.toThrow()
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'journey:j001',
      message: 'coverPhotos[0] 必须是对象',
    }))
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
      message: 'photos[0] 必须是对象',
    }))
  })
})
