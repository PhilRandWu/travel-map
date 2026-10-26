import type { City, TravelData } from '@/types'
import { CITY_CATALOG } from '@/data/cities'
import { BUILTIN_CITIES } from '@/lib/cities'
import {
  searchCityCatalog,
  type CityCatalogEntry,
} from '@/lib/cityCatalog'

const builtinCities = new Map(BUILTIN_CITIES.map((city) => [city.id, city]))

function entryForUserCity(city: City): CityCatalogEntry {
  return {
    city,
    nameEn: city.name,
    aliases: [city.name, city.id, city.province, city.country],
    countryCode: '',
    kind: 'china-city',
    priority: 0,
  }
}

function mergedCatalogEntries(data: TravelData): CityCatalogEntry[] {
  const overrides = new Map(data.cities.map((city) => [city.id, city]))
  const entries = CITY_CATALOG.map((entry) => {
    // User data wins over the catalog; core cities keep their canonical coordinates.
    const override = overrides.get(entry.city.id)
      ?? builtinCities.get(entry.city.id)
    return override ? { ...entry, city: override } : entry
  })
  const known = new Set(entries.map((entry) => entry.city.id))
  for (const city of data.cities) {
    if (!known.has(city.id)) entries.push(entryForUserCity(city))
  }
  return entries
}

export function listCityOptions(data: TravelData): City[] {
  return mergedCatalogEntries(data).map((entry) => entry.city)
}

export function searchCities(
  data: TravelData,
  query: string,
  limit = 8,
): City[] {
  return searchCityCatalog(mergedCatalogEntries(data), query, {
    limit,
    preferredCityIds: data.cities.map((city) => city.id),
  }).map((entry) => entry.city)
}
