import { describe, expect, it } from 'vitest'
import {
  EMPTY_JOURNEY_PREFERENCES,
  loadJourneyPreferences,
  rememberJourney,
  saveJourneyPreferences,
  toggleJourneyPinned,
} from '@/lib/journeyPreferences'

describe('journeyPreferences', () => {
  it('moves the active journey to the front of recent use and keeps four', () => {
    const next = rememberJourney({
      pinnedIds: [],
      recentIds: ['j005', 'j004', 'j003', 'j002'],
    }, 'j001')

    expect(next.recentIds).toEqual(['j001', 'j005', 'j004', 'j003'])
  })

  it('pins and unpins a journey without duplicates', () => {
    const pinned = toggleJourneyPinned(EMPTY_JOURNEY_PREFERENCES, 'j002')
    expect(pinned.pinnedIds).toEqual(['j002'])

    const unpinned = toggleJourneyPinned(pinned, 'j002')
    expect(unpinned.pinnedIds).toEqual([])
  })

  it('persists valid preferences and falls back safely for malformed data', () => {
    let value: string | null = JSON.stringify({
      pinnedIds: ['j002', 'j002'],
      recentIds: ['j001', 'j002'],
    })
    const storage = {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next
      },
    } as unknown as Storage

    expect(loadJourneyPreferences(storage)).toEqual({
      pinnedIds: ['j002'],
      recentIds: ['j001', 'j002'],
    })

    saveJourneyPreferences(
      { pinnedIds: ['j003'], recentIds: ['j003'] },
      storage,
    )
    expect(loadJourneyPreferences(storage)).toEqual({
      pinnedIds: ['j003'],
      recentIds: ['j003'],
    })

    value = '{broken'
    expect(loadJourneyPreferences(storage)).toEqual(EMPTY_JOURNEY_PREFERENCES)
  })
})
