import { describe, expect, it } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { findBuiltinCity } from '@/lib/cities'
import {
  createCustomCity,
  createTripDraft,
  createVisitDraft,
  editVisitDraft,
  newEditorErrors,
  nextEntityId,
  removeVisit,
  saveTrip,
  saveVisit,
  searchCities,
} from '@/lib/editorModel'

const clone = (): TravelData => JSON.parse(JSON.stringify(tripsJson)) as TravelData

describe('editor model', () => {
  it('searches cities by name, province and user-defined city', () => {
    const data = clone()
    expect(searchCities(data, '浙江').slice(0, 2).map((city) => city.id))
      .toEqual(['hangzhou', 'jiaxing'])
    expect(searchCities(data, '浙江').length).toBeGreaterThan(2)

    data.cities.push({
      id: 'hangzhou',
      name: '杭州市',
      lat: 30.27,
      lng: 120.16,
      province: '浙江',
      country: '中国',
    })
    expect(searchCities(data, '杭州')[0].name).toBe('杭州市')
  })

  it('searches the global offline catalog by Chinese and English names', () => {
    const data = clone()
    expect(searchCities(data, '东京')[0].id).toBe('tokyo-jp')
    expect(searchCities(data, 'Tokyo')[0].id).toBe('tokyo-jp')
    expect(searchCities(data, 'nyc')[0].id).toBe('new-york-us')
  })

  it('prefers user city overrides for an existing catalog id', () => {
    const data = clone()
    data.cities.push({
      id: 'tokyo-jp',
      name: '东京都',
      lat: 35.68,
      lng: 139.76,
      province: '东京都',
      country: '日本',
    })

    expect(searchCities(data, '东京都')[0]).toMatchObject({
      id: 'tokyo-jp',
      name: '东京都',
      lat: 35.68,
    })
  })

  it('persists a selected global city into travel data', () => {
    const data = clone()
    const draft = createTripDraft(data, data.journeys[0])
    const from = searchCities(data, '东京')[0]
    const to = searchCities(data, '纽约')[0]
    const next = saveTrip(data, {
      ...draft,
      from,
      to,
      date: '2025-05-02',
    })

    expect(next.cities.some((city) => city.id === 'tokyo-jp')).toBe(true)
    expect(next.cities.some((city) => city.id === 'new-york-us')).toBe(true)
  })

  it('creates unique ids and custom city ids', () => {
    const data = clone()
    expect(nextEntityId('v', data.visits.map((visit) => visit.id))).toBe('v004')
    expect(nextEntityId('t', data.trips.map((trip) => trip.id))).toBe('t006')

    const city = createCustomCity(data, {
      name: '杭州',
      province: '浙江',
      country: '中国',
      lat: 30.2,
      lng: 120.1,
    })
    expect(city.id).toBe('city')
  })

  it('saves a new visit, expands the journey and adds a custom city', () => {
    const data = clone()
    const journey = data.journeys[0]
    const draft = createVisitDraft(data, journey)
    const city = createCustomCity(data, {
      name: '绍兴',
      province: '浙江',
      country: '中国',
      lat: 30.03,
      lng: 120.58,
    })
    const next = saveVisit(data, {
      ...draft,
      city,
      arriveDate: '2025-04-28',
      leaveDate: '2025-05-02',
      note: '  水乡散步  ',
      photos: [{ file: '01.jpg', caption: '桥' }],
    })

    expect(next.visits.some((visit) => visit.id === draft.id)).toBe(true)
    expect(next.journeys[0].startDate).toBe('2025-04-28')
    expect(next.cities.some((item) => item.id === city.id)).toBe(true)
    expect(next.visits.find((visit) => visit.id === draft.id)?.note).toBe('水乡散步')
    expect(newEditorErrors(data, next)).toEqual([])
  })

  it('drops journey cover references for photos removed from a visit', () => {
    const data = clone()
    const visit = data.visits.find((item) => item.id === 'v001')!
    const draft = editVisitDraft(data, visit)
    const next = saveVisit(data, {
      ...draft,
      city: findBuiltinCity(visit.city)!,
      photos: draft.photos.filter((photo) => photo.file !== '02.svg'),
    })

    expect(next.journeys[0].coverPhotos.map((cover) => `${cover.visitId}/${cover.file}`))
      .toEqual(['v001/01.svg', 'v002/01.svg'])
  })

  it('keeps ordered unique waypoints for every transport type', () => {
    const data = clone()
    const journey = data.journeys[0]
    const draft = createTripDraft(data, journey)
    const from = findBuiltinCity('hangzhou')!
    const to = findBuiltinCity('shanghai')!
    const jiaxing = findBuiltinCity('jiaxing')!

    for (const type of ['flight', 'train', 'metro', 'ship', 'car'] as const) {
      const next = saveTrip(data, {
        ...draft,
        type,
        from,
        to,
        waypoints: [jiaxing, from, jiaxing],
        date: '2025-05-02',
      })
      expect(next.trips.find((trip) => trip.id === draft.id)?.waypoints)
        .toEqual(['jiaxing'])
      expect(next.cities.some((city) => city.id === 'jiaxing')).toBe(true)
    }
  })

  it('removes a visit and its cover references together', () => {
    const data = clone()
    const next = removeVisit(data, 'v001')

    expect(next.visits.some((visit) => visit.id === 'v001')).toBe(false)
    expect(next.journeys[0].coverPhotos.some((cover) => cover.visitId === 'v001'))
      .toBe(false)
  })

  it('blocks home-city visits with a new validation error', () => {
    const data = clone()
    const journey = data.journeys[0]
    const draft = createVisitDraft(data, journey)
    const next = saveVisit(data, {
      ...draft,
      city: findBuiltinCity('beijing')!,
      arriveDate: '2025-05-01',
      leaveDate: '2025-05-02',
    })

    expect(newEditorErrors(data, next).some((issue) => (
      issue.message.includes('常居城市不能创建旅行到访')
    ))).toBe(true)
  })
})
