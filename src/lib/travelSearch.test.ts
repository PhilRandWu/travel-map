import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { searchTravelData } from '@/lib/travelSearch'

const data = dataJson as TravelData

describe('travel search', () => {
  it('finds photos by caption and keeps their navigation target', () => {
    const results = searchTravelData(data, '西湖暮色')
    expect(results[0]).toMatchObject({
      kind: 'photo',
      journeyId: 'j001',
      cityId: 'hangzhou',
      visitId: 'v001',
      photoFile: '02.svg',
    })
  })

  it('finds trips by note and renders the route as subtitle', () => {
    const results = searchTravelData(data, 'G7558')
    expect(results[0]).toMatchObject({
      kind: 'trip',
      journeyId: 'j001',
      tripId: 't002',
    })
    expect(results[0].subtitle).toContain('杭州')
    expect(results[0].subtitle).toContain('上海')
  })

  it('returns newest journeys as the empty-query starting point', () => {
    const results = searchTravelData(data, '', 1)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ kind: 'journey', journeyId: 'j002' })
  })

  it('matches city names and notes without case sensitivity', () => {
    const byCity = searchTravelData(data, '成都')
    const byNote = searchTravelData(data, 'ca4193')

    expect(byCity.some((result) => result.kind === 'visit' && result.visitId === 'v003'))
      .toBe(true)
    expect(byNote.some((result) => result.kind === 'trip' && result.tripId === 't005'))
      .toBe(true)
  })

  it('matches mode names and common transport terms', () => {
    const metroData = structuredClone(data)
    metroData.trips[1].type = 'metro'
    metroData.trips[1].note = '2 号线'

    expect(searchTravelData(metroData, '地铁')[0].tripId).toBe('t002')
    expect(searchTravelData(metroData, 'subway')[0].tripId).toBe('t002')
    expect(searchTravelData(metroData, '2 号线')[0].tripId).toBe('t002')
  })

  it('matches every transport label', () => {
    const modes = [
      ['flight', '飞机'],
      ['train', '高铁'],
      ['metro', '地铁'],
      ['ship', '轮船'],
      ['car', '汽车'],
    ] as const
    for (const [type, label] of modes) {
      const modeData = structuredClone(data)
      modeData.trips[0].type = type

      expect(searchTravelData(modeData, label).some((result) =>
        result.kind === 'trip' && result.tripId === 't001')).toBe(true)
    }
  })

  it('matches a trip by waypoint city', () => {
    const results = searchTravelData(data, '嘉兴')
    expect(results.some((result) =>
      result.kind === 'trip' && result.tripId === 't002')).toBe(true)
  })
})
