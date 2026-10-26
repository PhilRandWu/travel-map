import { describe, expect, it } from 'vitest'
import { CITY_CATALOG } from '@/data/cities'
import { searchCityCatalog } from '@/lib/cityCatalog'

describe('generated city catalog', () => {
  it('contains the agreed global catalog scale', () => {
    const china = CITY_CATALOG.filter((entry) => entry.countryCode === 'CN')
    const international = CITY_CATALOG.length - china.length

    expect(CITY_CATALOG.length).toBeGreaterThanOrEqual(560)
    expect(CITY_CATALOG.length).toBeLessThanOrEqual(590)
    expect(china.length).toBeGreaterThanOrEqual(300)
    expect(china.length).toBeGreaterThan(international)
    expect(international).toBeGreaterThanOrEqual(220)
    expect(international).toBeLessThanOrEqual(240)
  })

  it('has unique ids and valid coordinates', () => {
    const ids = new Set<string>()
    for (const { city } of CITY_CATALOG) {
      expect(city.id).toMatch(/^[a-z0-9-]+$/)
      expect(ids.has(city.id)).toBe(false)
      ids.add(city.id)
      expect(city.lat).toBeGreaterThanOrEqual(-90)
      expect(city.lat).toBeLessThanOrEqual(90)
      expect(city.lng).toBeGreaterThanOrEqual(-180)
      expect(city.lng).toBeLessThanOrEqual(180)
    }
  })

  it('keeps existing ids and complete search metadata', () => {
    const ids = new Set(CITY_CATALOG.map((entry) => entry.city.id))
    for (const id of [
      'beijing', 'shanghai', 'hangzhou', 'jiaxing', 'chengdu',
      'suzhou', 'guangzhou', 'shenzhen', 'xian', 'chongqing',
    ]) {
      expect(ids.has(id)).toBe(true)
    }

    for (const entry of CITY_CATALOG) {
      expect(entry.city.name.trim()).not.toBe('')
      expect(entry.nameEn.trim()).not.toBe('')
      expect(entry.city.country.trim()).not.toBe('')
      expect(entry.countryCode).toMatch(/^[A-Z]{2}$/)
      expect(entry.aliases.length).toBeGreaterThan(0)
      expect(Number.isFinite(entry.priority)).toBe(true)
    }
  })

  it('covers capitals broadly', () => {
    const capitalCountries = new Set(
      CITY_CATALOG
        .filter((entry) => entry.kind === 'capital')
        .map((entry) => entry.countryCode),
    )
    expect(capitalCountries.size).toBeGreaterThanOrEqual(190)
  })

  it.each([
    ['杭州', 'hangzhou'],
    ['杭州市', 'hangzhou'],
    ['Tokyo', 'tokyo-jp'],
    ['东京', 'tokyo-jp'],
    ['纽约', 'new-york-us'],
    ['NYC', 'new-york-us'],
    ['巴黎', 'paris-fr'],
    ['新加坡', 'singapore-sg'],
    ['Cape Town', 'cape-town-za'],
    ['开普敦', 'cape-town-za'],
  ])('finds %s as %s', (query, id) => {
    expect(searchCityCatalog(CITY_CATALOG, query).map((entry) => entry.city.id))
      .toContain(id)
  })
})
