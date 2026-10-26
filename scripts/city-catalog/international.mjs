import worldCountries from 'world-countries'
import {
  ALIAS_OVERRIDES,
  COUNTRY_FALLBACKS,
  CURATED_INTERNATIONAL_EXTRAS,
  NATURAL_EARTH_URL,
} from './config.mjs'
import { loadJsonSource } from './sources.mjs'

const EXCLUDED_CHINA_CODES = new Set(['CN', 'HK', 'MO', 'TW'])
const REGION_OUTPUT = {
  Asia: 'international-asia',
  Europe: 'international-europe',
  Africa: 'international-africa',
  Oceania: 'international-oceania',
  Americas: 'international-americas',
}

const byAlpha2 = new Map(
  worldCountries.map((country) => [country.cca2, country]),
)
const byAlpha3 = new Map(
  worldCountries.map((country) => [country.cca3, country]),
)
const byEnglishName = new Map(
  worldCountries.map((country) => [country.name.common, country]),
)

function countryFor(properties) {
  return byAlpha2.get(properties.ISO_A2)
    ?? byAlpha3.get(properties.ADM0_A3)
    ?? byEnglishName.get(properties.ADM0NAME)
    ?? COUNTRY_FALLBACKS[properties.ADM0NAME]
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function aliasesFor(feature, id) {
  const properties = feature.properties
  return [
    properties.NAME,
    properties.NAME_EN,
    properties.NAMEASCII,
    properties.NAME_ZH,
    properties.NAME_ZHT,
    properties.NAMEALT,
    properties.NAMEPAR,
    ...(ALIAS_OVERRIDES[id] ?? []),
  ].filter(Boolean)
}

function entryFromFeature(feature, kind) {
  const properties = feature.properties
  const country = countryFor(properties)
  if (!country) throw new Error(`Unknown country: ${properties.ADM0NAME}`)
  if (!properties.NAME_ZH) throw new Error(`Missing Chinese name: ${properties.NAME}`)

  const [lng, lat] = feature.geometry.coordinates
  const countryCode = country.cca2.toUpperCase()
  const id = `${slug(properties.NAMEASCII || properties.NAME)}-${countryCode.toLowerCase()}`
  return {
    file: REGION_OUTPUT[country.region] ?? 'international-asia',
    entry: {
      city: {
        id,
        name: properties.NAME_ZH,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        province: properties.ADM1NAME || country.translations.zho?.common,
        country: country.translations.zho?.common ?? properties.ADM0NAME,
      },
      nameEn: properties.NAME_EN || properties.NAME,
      aliases: aliasesFor(feature, id),
      countryCode,
      kind,
      priority: kind === 'capital' ? 70 : 80,
    },
  }
}

function matchesName(feature, name) {
  return [
    feature.properties.NAME,
    feature.properties.NAME_EN,
    feature.properties.NAMEASCII,
  ].includes(name)
}

export async function buildInternationalCatalog(cacheDir) {
  const data = await loadJsonSource(
    NATURAL_EARTH_URL,
    cacheDir,
    'natural-earth-populated-places.json',
  )
  const features = data.features.filter(
    (feature) => !EXCLUDED_CHINA_CODES.has(feature.properties.ISO_A2),
  )
  const capitals = features.filter(
    (feature) => feature.properties.FEATURECLA === 'Admin-0 capital',
  )
  const extras = CURATED_INTERNATIONAL_EXTRAS.map((name) => {
    const feature = features.find((item) => matchesName(item, name))
    if (!feature) throw new Error(`Missing curated city: ${name}`)
    return feature
  })

  const entries = []
  const seenGeonames = new Set()
  for (const feature of capitals) {
    const key = feature.properties.GEONAMESID
    seenGeonames.add(key)
    entries.push(entryFromFeature(feature, 'capital'))
  }
  for (const feature of extras) {
    const key = feature.properties.GEONAMESID
    if (seenGeonames.has(key)) continue
    seenGeonames.add(key)
    entries.push(entryFromFeature(feature, 'major-city'))
  }

  const usedIds = new Set()
  for (const { entry } of entries) {
    const base = entry.city.id
    let id = base
    let index = 2
    while (usedIds.has(id)) {
      id = `${base}-${index}`
      index += 1
    }
    entry.city.id = id
    entry.aliases = [...new Set([...entry.aliases, id])]
    usedIds.add(id)
  }

  return entries
}
