import { describe, expect, it } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import {
  TRAVEL_STORAGE_KEY,
  clearStoredTravelData,
  loadStoredTravelData,
  saveStoredTravelData,
} from '@/lib/travelStorage'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const clone = (): TravelData => JSON.parse(JSON.stringify(tripsJson)) as TravelData

describe('travel storage', () => {
  it('round-trips a valid travel document', () => {
    const storage = new MemoryStorage()
    const data = clone()

    expect(saveStoredTravelData(data, storage)).toEqual({
      ok: true,
      error: null,
      savedAt: expect.any(String),
    })
    const loaded = loadStoredTravelData(storage)

    expect(loaded.error).toBeNull()
    expect(loaded.savedAt).toEqual(expect.any(String))
    expect(loaded.data?.journeys[0].title).toBe('江南春行')
  })

  it('falls back when the stored envelope is invalid', () => {
    const storage = new MemoryStorage()
    storage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify({ version: 1, data: {} }))

    const loaded = loadStoredTravelData(storage)

    expect(loaded.data).toBeNull()
    expect(loaded.error).toContain('结构不合法')
  })

  it('rejects a stored document with validation errors', () => {
    const storage = new MemoryStorage()
    const data = clone()
    data.visits[0].leaveDate = '2025-04-01'
    saveStoredTravelData(data, storage)

    const loaded = loadStoredTravelData(storage)

    expect(loaded.data).toBeNull()
    expect(loaded.error).toContain('校验失败')
  })

  it('surfaces quota failures without throwing', () => {
    const storage = new MemoryStorage()
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }

    const saved = saveStoredTravelData(clone(), storage)

    expect(saved.ok).toBe(false)
    expect(saved.error).toContain('本地存储空间不足')
  })

  it('clears only the travel document and leaves other storage untouched', () => {
    const storage = new MemoryStorage()
    storage.setItem(TRAVEL_STORAGE_KEY, '{}')
    storage.setItem('unrelated', 'keep')

    expect(clearStoredTravelData(storage)).toEqual({ ok: true, error: null })
    expect(storage.getItem(TRAVEL_STORAGE_KEY)).toBeNull()
    expect(storage.getItem('unrelated')).toBe('keep')
  })
})
