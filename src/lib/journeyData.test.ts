import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'

const data = dataJson as TravelData

describe('example journey data', () => {
  it('contains two valid journeys and no home-city visit', () => {
    expect(data.meta.version).toBe(2)
    expect(data.journeys).toHaveLength(2)
    expect(data.visits.map((visit) => visit.id)).toEqual(['v001', 'v002', 'v003'])
    expect(data.visits.some((visit) => visit.city === data.meta.homeCity)).toBe(false)
  })

  it('assigns every trip and visit to an existing journey', () => {
    const journeyIds = new Set(data.journeys.map((journey) => journey.id))

    for (const item of [...data.trips, ...data.visits]) {
      expect(journeyIds.has(item.journeyId), item.id).toBe(true)
    }
  })
})
