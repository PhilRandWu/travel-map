const REQUIRED_IDS = [
  'beijing', 'shanghai', 'hangzhou', 'jiaxing', 'chengdu',
  'suzhou', 'guangzhou', 'shenzhen', 'xian', 'chongqing',
]

const ALLOWED_KINDS = new Set([
  'china-city',
  'capital',
  'major-city',
  'travel-city',
])

export function validateCatalog(entries) {
  const ids = new Set()
  const china = entries.filter(({ entry }) => entry.countryCode === 'CN')
  const international = entries.length - china.length
  const capitalCountries = new Set(
    entries
      .filter(({ entry }) => entry.kind === 'capital')
      .map(({ entry }) => entry.countryCode),
  )

  if (entries.length < 560 || entries.length > 590) {
    throw new Error(`catalog size ${entries.length}, expected 560-590`)
  }
  if (china.length < 300 || china.length <= international) {
    throw new Error(`China coverage invalid: ${china.length}/${entries.length}`)
  }
  if (international < 220 || international > 240) {
    throw new Error(`international size ${international}, expected 220-240`)
  }
  if (capitalCountries.size < 190) {
    throw new Error(`capital coverage ${capitalCountries.size}, expected >= 190`)
  }

  for (const required of REQUIRED_IDS) {
    if (!entries.some(({ entry }) => entry.city.id === required)) {
      throw new Error(`missing existing id: ${required}`)
    }
  }

  for (const { entry } of entries) {
    const { city } = entry
    if (!/^[a-z0-9-]+$/.test(city.id)) throw new Error(`bad id ${city.id}`)
    if (ids.has(city.id)) throw new Error(`duplicate id ${city.id}`)
    ids.add(city.id)
    if (!city.name || !entry.nameEn || !city.country) {
      throw new Error(`missing names for ${city.id}`)
    }
    if (!/^[A-Z]{2}$/.test(entry.countryCode)) {
      throw new Error(`bad country code for ${city.id}`)
    }
    if (!ALLOWED_KINDS.has(entry.kind)) {
      throw new Error(`bad kind for ${city.id}: ${entry.kind}`)
    }
    if (city.lat < -90 || city.lat > 90 || city.lng < -180 || city.lng > 180) {
      throw new Error(`invalid coordinates for ${city.id}`)
    }
    if (!entry.aliases.length) throw new Error(`missing aliases for ${city.id}`)
  }
}
