import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { Journey, TravelData, Visit } from '@/types'
import {
  buildMemoryDiscovery,
  memoryTargetKey,
  pickRandomMemory,
} from '@/lib/travelDiscovery'

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

  it('avoids recently shown targets while alternatives remain', () => {
    const target = pickRandomMemory(data, () => 0, [
      'j001:hangzhou:v001:01.svg',
      'j001:hangzhou:v001:02.svg',
    ])

    expect(memoryTargetKey(target!)).toBe('j001:shanghai:v002:01.svg')
  })
})

describe('buildMemoryDiscovery', () => {
  const oldJourney: Journey = {
    id: 'j000',
    title: '杭州旧梦',
    startDate: '2024-03-12',
    endDate: '2024-03-14',
    theme: 'sage',
    coverPhotos: [],
  }
  const oldVisit: Visit = {
    id: 'v000',
    journeyId: 'j000',
    city: 'hangzhou',
    arriveDate: '2024-03-12',
    leaveDate: '2024-03-14',
    note: '第一次看西湖',
    photos: [{ file: 'old.svg', caption: '旧西湖', featured: true }],
  }

  function withOldHangzhou(): TravelData {
    const next = structuredClone(data)
    next.journeys.push(oldJourney)
    next.visits.push(oldVisit)
    return next
  }

  it('builds anniversary, recent, and repeated-city prompts with stable targets', () => {
    const discoveries = buildMemoryDiscovery(withOldHangzhou(), {
      referenceDate: new Date(2026, 2, 12),
    })

    expect(discoveries.map(({ kind }) => kind)).toEqual([
      'anniversary',
      'recent',
      'same-city',
    ])
    expect(discoveries[0]).toMatchObject({
      label: '往年的今天',
      title: '杭州',
      target: {
        journeyId: 'j000',
        cityId: 'hangzhou',
        visitId: 'v000',
        photoFile: 'old.svg',
      },
    })
    expect(discoveries[1]).toMatchObject({
      label: '最近回忆',
      title: '成都',
      target: { visitId: 'v003' },
    })
    expect(discoveries[2]).toMatchObject({
      label: '同城旧事',
      title: '杭州',
      target: { visitId: 'v001' },
    })
  })

  it('omits unavailable discovery types instead of inventing weak matches', () => {
    const discoveries = buildMemoryDiscovery(data, {
      referenceDate: new Date(2026, 2, 12),
    })

    expect(discoveries.map(({ kind }) => kind)).toEqual(['recent'])
  })
})
