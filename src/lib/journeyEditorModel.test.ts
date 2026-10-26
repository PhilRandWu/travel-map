import { describe, expect, it } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { newEditorErrors } from '@/lib/editorModel'
import {
  createJourneyDraft,
  duplicateJourneySettings,
  editJourneyDraft,
  listJourneyCoverOptions,
  removeJourney,
  resolveActiveJourneyId,
  saveJourney,
} from '@/lib/journeyEditorModel'

const clone = (): TravelData => JSON.parse(JSON.stringify(tripsJson)) as TravelData

describe('journey editor model', () => {
  it('keeps a valid preferred journey and otherwise selects the newest', () => {
    const data = clone()

    expect(resolveActiveJourneyId(data.journeys, 'j001')).toBe('j001')
    expect(resolveActiveJourneyId(data.journeys, 'missing')).toBe('j002')
  })

  it('creates a new journey with a unique id and local date', () => {
    const data = clone()
    const draft = createJourneyDraft(data, new Date(2026, 9, 26))
    const next = saveJourney(data, {
      ...draft,
      title: '  京都秋日  ',
      epigraph: '  沿鸭川散步  ',
    })
    const journey = next.journeys.find((item) => item.id === 'j003')

    expect(draft.startDate).toBe('2026-10-26')
    expect(draft.endDate).toBe('2026-10-26')
    expect(journey).toMatchObject({
      title: '京都秋日',
      epigraph: '沿鸭川散步',
      theme: 'sage',
      coverPhotos: [],
    })
    expect(newEditorErrors(data, next)).toEqual([])
  })

  it('updates journey fields while preserving cover photos', () => {
    const data = clone()
    const original = data.journeys[0]
    const next = saveJourney(data, {
      ...editJourneyDraft(original),
      title: '江南新篇',
      theme: 'rose',
      startDate: '2025-04-30',
    })
    const journey = next.journeys[0]

    expect(journey.title).toBe('江南新篇')
    expect(journey.theme).toBe('rose')
    expect(journey.startDate).toBe('2025-04-30')
    expect(journey.coverPhotos).toEqual(original.coverPhotos)
  })

  it('blocks shortened journey dates that exclude existing records', () => {
    const data = clone()
    const draft = {
      ...editJourneyDraft(data.journeys[0]),
      endDate: '2025-05-02',
    }
    const errors = newEditorErrors(data, saveJourney(data, draft))

    expect(errors.some((issue) => issue.message.includes('不在旅程 j001 的日期范围内')))
      .toBe(true)
  })

  it('lists selectable cover photos from visits in the same journey', () => {
    const data = clone()
    const options = listJourneyCoverOptions(data, 'j001')

    expect(options).toHaveLength(5)
    expect(options[0]).toMatchObject({
      cityName: '杭州',
      photo: { file: '01.svg' },
    })
  })

  it('removes a journey with its visits and trips only', () => {
    const data = clone()
    const next = removeJourney(data, 'j001')

    expect(next.journeys.map((journey) => journey.id)).toEqual(['j002'])
    expect(next.visits.every((visit) => visit.journeyId !== 'j001')).toBe(true)
    expect(next.trips.every((trip) => trip.journeyId !== 'j001')).toBe(true)
    expect(next.visits.length).toBeLessThan(data.visits.length)
    expect(next.trips.length).toBeLessThan(data.trips.length)
    expect(newEditorErrors(data, next)).toEqual([])
  })

  it('duplicates journey settings without copying records or covers', () => {
    const data = clone()
    const result = duplicateJourneySettings(data, 'j001')

    expect(result).not.toBeNull()
    expect(result?.journeyId).toBe('j003')
    const copy = result?.data.journeys.find(
      (journey) => journey.id === result.journeyId,
    )
    expect(copy).toMatchObject({
      title: '江南春行 副本',
      startDate: data.journeys[0].startDate,
      endDate: data.journeys[0].endDate,
      coverPhotos: [],
    })
    expect(result?.data.visits).toHaveLength(data.visits.length)
    expect(result?.data.trips).toHaveLength(data.trips.length)
    if (result) expect(newEditorErrors(data, result.data)).toEqual([])
  })
})
