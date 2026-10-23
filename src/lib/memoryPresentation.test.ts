import { describe, expect, it } from 'vitest'
import type { MemoryChapter } from '@/lib/memory'
import {
  memoryDateParts,
  memoryDateRange,
  memoryRoute,
} from '@/lib/memoryPresentation'

const chapter = (
  cityName: string,
  arriveDate: string,
  leaveDate = arriveDate,
): MemoryChapter => ({
  key: cityName,
  visitId: cityName,
  journeyId: 'journey',
  cityId: cityName,
  cityName,
  arriveDate,
  leaveDate,
  photos: [],
})

describe('memory presentation', () => {
  it('formats dates without shifting ISO timezone offsets', () => {
    expect(memoryDateParts('2025-05-02T18:40:00+08:00')).toEqual({
      year: '2025',
      month: 5,
      day: '02',
      monthShort: 'MAY',
      time: '18:40',
    })
  })

  it('summarizes a journey route and date range', () => {
    const chapters = [
      chapter('杭州', '2025-05-01', '2025-05-03'),
      chapter('上海', '2025-05-03', '2025-05-05'),
      chapter('成都', '2025-06-10', '2025-06-13'),
      chapter('北京', '2025-06-14'),
    ]
    expect(memoryRoute(chapters)).toBe('杭州 / 上海 / 成都 / +1')
    expect(memoryDateRange(chapters)).toBe('2025.05.01 — 2025.06.14')
  })
})
