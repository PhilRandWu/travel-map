import { describe, expect, it } from 'vitest'
import {
  searchCityCatalog,
  type CityCatalogEntry,
} from '@/lib/cityCatalog'

const entries: CityCatalogEntry[] = [
  {
    city: {
      id: 'hangzhou',
      name: '杭州',
      lat: 30.287459,
      lng: 120.153576,
      province: '浙江省',
      country: '中国',
    },
    nameEn: 'Hangzhou',
    aliases: ['杭州市', 'hangzhou', 'hang zhou'],
    countryCode: 'CN',
    kind: 'china-city',
    priority: 60,
  },
  {
    city: {
      id: 'tokyo-jp',
      name: '东京',
      lat: 35.6895,
      lng: 139.6917,
      province: '东京都',
      country: '日本',
    },
    nameEn: 'Tokyo',
    aliases: ['東京', 'とうきょう'],
    countryCode: 'JP',
    kind: 'capital',
    priority: 70,
  },
  {
    city: {
      id: 'new-york-us',
      name: '纽约',
      lat: 40.7128,
      lng: -74.006,
      province: '纽约州',
      country: '美国',
    },
    nameEn: 'New York City',
    aliases: ['New York', 'NYC', '紐約'],
    countryCode: 'US',
    kind: 'major-city',
    priority: 80,
  },
  {
    city: {
      id: 'reykjavik-is',
      name: '雷克雅未克',
      lat: 64.1466,
      lng: -21.9426,
      province: '首都区',
      country: '冰岛',
    },
    nameEn: 'Reykjavík',
    aliases: ['Reykjavik'],
    countryCode: 'IS',
    kind: 'capital',
    priority: 70,
  },
]

describe('searchCityCatalog', () => {
  it('matches a Chinese name with or without the city suffix', () => {
    expect(searchCityCatalog(entries, '杭州')[0].city.id).toBe('hangzhou')
    expect(searchCityCatalog(entries, '杭州市')[0].city.id).toBe('hangzhou')
  })

  it('matches Chinese, English, pinyin and aliases case-insensitively', () => {
    expect(searchCityCatalog(entries, '东京')[0].city.id).toBe('tokyo-jp')
    expect(searchCityCatalog(entries, 'TOKYO')[0].city.id).toBe('tokyo-jp')
    expect(searchCityCatalog(entries, 'hangzhou')[0].city.id).toBe('hangzhou')
    expect(searchCityCatalog(entries, 'nyc')[0].city.id).toBe('new-york-us')
  })

  it('folds Latin accents for search', () => {
    expect(searchCityCatalog(entries, 'reykjavik')[0].city.id)
      .toBe('reykjavik-is')
  })

  it('puts exact matches before substring matches', () => {
    const results = searchCityCatalog(entries, '纽约')
    expect(results.map((entry) => entry.city.id))
      .toEqual(['new-york-us'])
  })

  it('prefers existing user cities when the query is empty', () => {
    const results = searchCityCatalog(entries, '', {
      preferredCityIds: ['tokyo-jp'],
    })

    expect(results[0].city.id).toBe('tokyo-jp')
    expect(results).toHaveLength(entries.length)
  })

  it('respects the result limit', () => {
    expect(searchCityCatalog(entries, '', { limit: 2 })).toHaveLength(2)
  })
})
