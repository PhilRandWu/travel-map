import type { City } from '@/types'

export type CityCatalogKind =
  | 'china-city'
  | 'capital'
  | 'major-city'
  | 'travel-city'

export interface CityCatalogEntry {
  city: City
  nameEn: string
  aliases: readonly string[]
  countryCode: string
  kind: CityCatalogKind
  priority: number
}

export interface CitySearchOptions {
  limit?: number
  preferredCityIds?: readonly string[]
}

const CITY_SUFFIXES = ['特别行政区', '市'] as const
const termCache = new WeakMap<CityCatalogEntry, readonly string[]>()

function removeCitySuffix(value: string): string {
  for (const suffix of CITY_SUFFIXES) {
    if (value.endsWith(suffix) && value.length > suffix.length) {
      return value.slice(0, -suffix.length)
    }
  }
  return value
}

export function normalizeCitySearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s\-_.'’·]/g, '')
}

function normalizedVariants(value: string): string[] {
  const normalized = normalizeCitySearchText(value)
  if (!normalized) return []
  return [...new Set([normalized, removeCitySuffix(normalized)])]
}

function searchTerms(entry: CityCatalogEntry): readonly string[] {
  const cached = termCache.get(entry)
  if (cached) return cached

  const values = [
    entry.city.name,
    entry.city.id,
    entry.nameEn,
    entry.city.province,
    entry.city.country,
    entry.countryCode,
    ...entry.aliases,
  ]
  const terms = [...new Set(values.flatMap(normalizedVariants).filter(Boolean))]
  termCache.set(entry, terms)
  return terms
}

function scoreTerm(term: string, query: string): number {
  if (term === query) return 100
  if (term.startsWith(query)) return 80
  if (term.includes(query)) return 60
  return 0
}

function scoreEntry(entry: CityCatalogEntry, query: string): number {
  return searchTerms(entry)
    .reduce((best, term) => Math.max(best, scoreTerm(term, query)), 0)
}

export function searchCityCatalog(
  entries: readonly CityCatalogEntry[],
  rawQuery: string,
  options: CitySearchOptions = {},
): CityCatalogEntry[] {
  const query = normalizeCitySearchText(rawQuery)
  const preferred = new Set(options.preferredCityIds ?? [])
  const limit = options.limit ?? 8

  if (!query) {
    return [...entries]
      .sort((a, b) =>
        Number(preferred.has(b.city.id)) - Number(preferred.has(a.city.id))
        || b.priority - a.priority
        || a.city.name.localeCompare(b.city.name, 'zh-CN'))
      .slice(0, limit)
  }

  return entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, query) + (preferred.has(entry.city.id) ? 5 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) =>
      b.score - a.score
      || b.entry.priority - a.entry.priority
      || a.entry.city.name.localeCompare(b.entry.city.name, 'zh-CN'))
    .slice(0, limit)
    .map(({ entry }) => entry)
}
