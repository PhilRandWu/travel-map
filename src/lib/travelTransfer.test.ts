import { describe, expect, it } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import {
  parseTravelDataText,
  serializeTravelData,
  travelDataFileName,
} from '@/lib/travelTransfer'

const clone = (): TravelData => JSON.parse(JSON.stringify(tripsJson)) as TravelData

describe('travel transfer', () => {
  it('serializes and parses a complete travel document', () => {
    const text = serializeTravelData(clone())
    const parsed = parseTravelDataText(text)

    expect(parsed.issues).toEqual([])
    expect(parsed.data?.visits).toHaveLength(3)
    expect(text.endsWith('\n')).toBe(true)
  })

  it('reports invalid JSON and invalid references', () => {
    expect(parseTravelDataText('{').issues[0].message).toContain('JSON 无法解析')

    const data = clone()
    data.trips[0].to = 'missing-city'
    const parsed = parseTravelDataText(JSON.stringify(data))

    expect(parsed.data).toBeNull()
    expect(parsed.issues.some((issue) => issue.message.includes('missing-city'))).toBe(true)
  })

  it('builds a dated export filename', () => {
    expect(travelDataFileName(new Date(2026, 9, 26)))
      .toBe('travel-data-2026-10-26.json')
  })
})
