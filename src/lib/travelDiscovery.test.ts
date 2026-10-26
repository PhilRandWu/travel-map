import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { pickRandomMemory } from '@/lib/travelDiscovery'

const data = dataJson as TravelData

describe('pickRandomMemory', () => {
  it('prefers featured photos and returns a complete navigation target', () => {
    expect(pickRandomMemory(data, () => 0)).toEqual({
      journeyId: 'j001',
      cityId: 'hangzhou',
      visitId: 'v001',
      photoFile: '01.svg',
    })
  })

  it('falls back to a visit when no photos exist', () => {
    const withoutPhotos = structuredClone(data)
    withoutPhotos.visits.forEach((visit) => {
      visit.photos = []
    })

    expect(pickRandomMemory(withoutPhotos, () => 0)).toEqual({
      journeyId: 'j001',
      cityId: 'hangzhou',
      visitId: 'v001',
    })
  })

  it('returns null when there are no memories to pick', () => {
    const empty: TravelData = {
      ...data,
      journeys: [],
      trips: [],
      visits: [],
    }

    expect(pickRandomMemory(empty)).toBeNull()
  })
})
