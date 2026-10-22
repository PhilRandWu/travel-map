import { describe, expect, it } from 'vitest'
import type {
  Journey,
  JourneyScope,
  Photo,
  TravelData,
  Trip,
  Visit,
} from '@/types'

const journey: Journey = {
  id: 'j-contract',
  title: '契约测试旅程',
  startDate: '2025-01-01',
  endDate: '2025-01-03',
  theme: 'cyan',
  coverPhotos: [],
}

const trip: Trip = {
  id: 't-contract',
  journeyId: journey.id,
  date: '2025-01-01',
  type: 'flight',
  from: 'beijing',
  to: 'hangzhou',
  waypoints: [],
}

const photo: Photo = {
  file: '01.jpg',
  takenAt: '2025-01-01T10:00:00+08:00',
  featured: true,
  focalPoint: { x: 0.5, y: 0.45 },
}

const visit: Visit = {
  id: 'v-contract',
  journeyId: journey.id,
  city: 'hangzhou',
  arriveDate: '2025-01-01',
  leaveDate: '2025-01-03',
  photos: [photo],
}

const data: TravelData = {
  meta: { owner: '旅行者', homeCity: 'beijing', version: 2 },
  cities: [],
  journeys: [journey],
  trips: [trip],
  visits: [visit],
}

describe('v0.3 data contracts', () => {
  it('places journeys, trips and visits in one version 2 document', () => {
    const scope: JourneyScope = { kind: 'journey', journeyId: journey.id }

    expect(data.meta.version).toBe(2)
    expect(data.trips[0].journeyId).toBe(scope.journeyId)
    expect(data.visits[0].photos[0].focalPoint).toEqual({ x: 0.5, y: 0.45 })
  })
})
