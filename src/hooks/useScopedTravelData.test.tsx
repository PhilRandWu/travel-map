import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { useScopedTravelData } from '@/hooks/useScopedTravelData'

const data = dataJson as TravelData

describe('useScopedTravelData', () => {
  it('derives only the active journey', () => {
    const { result } = renderHook(() =>
      useScopedTravelData(data, { kind: 'journey', journeyId: 'j002' }))

    expect(result.current.scopedData?.trips.map((trip) => trip.id)).toEqual(['t004', 't005'])
    expect(result.current.timeline).toHaveLength(3)
    expect(result.current.stats?.cityCount).toBe(1)
  })
})
