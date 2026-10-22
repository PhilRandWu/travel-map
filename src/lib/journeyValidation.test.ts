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
})
