import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import {
  buildPhotoExport,
  matchPhotoDate,
  type PhotoAssignment,
} from '@/lib/exifGrouping'
import type { TravelData } from '@/types'

const travelData = data as TravelData

function singleVisitData(
  arriveDate: string,
  leaveDate: string,
): TravelData {
  return {
    ...travelData,
    visits: [
      {
        id: 'v-test',
        city: 'hangzhou',
        arriveDate,
        leaveDate,
        photos: [],
      },
    ],
  }
}

describe('matchPhotoDate', () => {
  it('拍摄日期落在到访区间内时精确匹配', () => {
    const result = matchPhotoDate(
      singleVisitData('2025-01-10', '2025-01-12'),
      '2025-01-11 09:30:00',
    )

    expect(result).toMatchObject({
      visitId: 'v-test',
      confidence: 'exact',
      distanceDays: 0,
    })
  })

  it('相差一天时给出待确认建议', () => {
    const result = matchPhotoDate(
      singleVisitData('2025-01-10', '2025-01-12'),
      '2025-01-13',
    )

    expect(result).toMatchObject({
      visitId: 'v-test',
      confidence: 'near',
      distanceDays: 1,
    })
  })

  it('超过容差或没有拍摄日期时不自动匹配', () => {
    const data = singleVisitData('2025-01-10', '2025-01-12')

    expect(matchPhotoDate(data, '2025-01-15')).toMatchObject({
      visitId: null,
      confidence: 'none',
    })
    expect(matchPhotoDate(data, null)).toMatchObject({
      visitId: null,
      confidence: 'none',
    })
  })

  it('多个到访都命中时优先最近开始的到访', () => {
    const data: TravelData = {
      ...travelData,
      visits: [
        {
          id: 'older',
          city: 'beijing',
          arriveDate: '2025-01-01',
          leaveDate: '2025-01-20',
          photos: [],
        },
        {
          id: 'newer',
          city: 'hangzhou',
          arriveDate: '2025-01-10',
          leaveDate: '2025-01-15',
          photos: [],
        },
      ],
    }

    expect(matchPhotoDate(data, '2025-01-11').visitId).toBe('newer')
  })
})

describe('buildPhotoExport', () => {
  it('把确认照片加入对应到访并避免文件名冲突', () => {
    const assignments: PhotoAssignment[] = [
      { id: 'a', visitId: 'v001', fileName: '01.svg' },
      { id: 'b', visitId: 'v001', fileName: '01.svg' },
      { id: 'c', visitId: 'v003', fileName: '熊猫.jpg' },
      { id: 'd', visitId: 'missing', fileName: 'ignore.jpg' },
    ]

    const result = buildPhotoExport(travelData, assignments)
    const hangzhou = result.data.visits.find((visit) => visit.id === 'v001')
    const chengdu = result.data.visits.find((visit) => visit.id === 'v003')

    expect(result.files).toEqual([
      {
        id: 'a',
        visitId: 'v001',
        fileName: '01-2.svg',
        targetPath: 'public/photos/v001/01-2.svg',
      },
      {
        id: 'b',
        visitId: 'v001',
        fileName: '01-3.svg',
        targetPath: 'public/photos/v001/01-3.svg',
      },
      {
        id: 'c',
        visitId: 'v003',
        fileName: '熊猫.jpg',
        targetPath: 'public/photos/v003/熊猫.jpg',
      },
    ])
    expect(hangzhou?.photos.map((photo) => photo.file)).toEqual([
      '01.svg',
      '02.svg',
      '03.svg',
      '01-2.svg',
      '01-3.svg',
    ])
    expect(chengdu?.photos.at(-1)).toMatchObject({
      file: '熊猫.jpg',
      caption: '',
    })
  })

  it('导出数据不修改原始 TravelData', () => {
    const before = JSON.stringify(travelData)
    buildPhotoExport(travelData, [
      { id: 'a', visitId: 'v001', fileName: 'new.jpg' },
    ])

    expect(JSON.stringify(travelData)).toBe(before)
  })
})
