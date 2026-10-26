import { pinyin } from 'pinyin-pro'
import {
  DATAV_ROOT,
  EXISTING_IDS,
  PINYIN_OVERRIDES,
  PROVINCE_CODES,
  PROVINCE_LEVEL_CODES,
  SPECIAL_CITY_ALIASES,
  SPECIAL_CITY_IDS,
  SPECIAL_PROVINCE_LEVEL_CITIES,
  TAIWAN_CITIES,
} from './config.mjs'
import { loadJsonSource } from './sources.mjs'

const REGION_BY_PROVINCE = [
  { labels: ['北京', '天津', '河北', '山西', '内蒙古'], file: 'china-north' },
  { labels: ['辽宁', '吉林', '黑龙江'], file: 'china-northeast' },
  { labels: ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'], file: 'china-east' },
  { labels: ['河南', '湖北', '湖南'], file: 'china-central' },
  { labels: ['广东', '广西', '海南', '香港', '澳门'], file: 'china-south' },
  { labels: ['重庆', '四川', '贵州', '云南', '西藏'], file: 'china-southwest' },
  { labels: ['陕西', '甘肃', '青海', '宁夏', '新疆'], file: 'china-northwest' },
]

function regionFor(province) {
  return REGION_BY_PROVINCE.find(({ labels }) =>
    labels.some((label) => province.startsWith(label)))?.file ?? 'china-east'
}

function stripCitySuffix(name) {
  return name.endsWith('市') && name.length > 1 ? name.slice(0, -1) : name
}

function stripProvinceSuffix(name) {
  return name
    .replace(/特别行政区$/, '')
    .replace(/[省市]$/, '')
}

function pinyinWords(name) {
  return pinyin(name, { toneType: 'none', type: 'array' })
}

function citySlug(name) {
  if (PINYIN_OVERRIDES[name]) return PINYIN_OVERRIDES[name]
  if (EXISTING_IDS[name]) return EXISTING_IDS[name]
  if (SPECIAL_CITY_IDS[name]) return SPECIAL_CITY_IDS[name]
  return pinyinWords(name)
    .join('-')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function pinyinName(name) {
  const value = pinyinWords(name).join('').replace(/[^a-zA-Z]/g, '')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function makeChinaEntry({
  id,
  name,
  nameEn,
  lat,
  lng,
  province,
  priority = 50,
  aliases = [],
}) {
  const suffixAliases = SPECIAL_CITY_IDS[name] ? [] : [`${name}市`]
  return {
    file: regionFor(province),
    entry: {
      city: {
        id,
        name,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        province: stripProvinceSuffix(province),
        country: '中国',
      },
      nameEn,
      aliases: [...new Set([name, ...suffixAliases, ...aliases])],
      countryCode: 'CN',
      kind: 'china-city',
      priority,
    },
  }
}

export async function buildChinaCatalog(cacheDir) {
  const national = await loadJsonSource(
    `${DATAV_ROOT}/100000_full.json`,
    cacheDir,
    'datav-100000.json',
  )
  const provinceName = new Map(
    national.features.map((feature) => [
      String(feature.properties.adcode),
      feature.properties.name,
    ]),
  )
  const entries = []

  for (const code of PROVINCE_LEVEL_CODES) {
    const feature = national.features.find(
      (item) => String(item.properties.adcode) === code,
    )
    if (!feature?.properties.center) continue
    const special = SPECIAL_PROVINCE_LEVEL_CITIES[code]
    const name = special?.name ?? stripCitySuffix(feature.properties.name)
    const [lng, lat] = feature.properties.center
    entries.push(makeChinaEntry({
      id: citySlug(name),
      name,
      nameEn: special?.nameEn ?? pinyinName(name),
      lat,
      lng,
      province: feature.properties.name,
      priority: 100,
      aliases: SPECIAL_CITY_ALIASES[name] ?? [],
    }))
  }

  for (const code of PROVINCE_CODES) {
    const province = provinceName.get(code) ?? ''
    const data = await loadJsonSource(
      `${DATAV_ROOT}/${code}_full.json`,
      cacheDir,
      `datav-${code}.json`,
    )
    for (const feature of data.features) {
      const adcode = String(feature.properties.adcode)
      if (!feature.properties.center || !adcode.endsWith('00')) continue
      const name = stripCitySuffix(feature.properties.name)
      const [lng, lat] = feature.properties.center
      const id = citySlug(name)
      entries.push(makeChinaEntry({
        id,
        name,
        nameEn: pinyinName(name),
        lat,
        lng,
        province,
        priority: adcode.endsWith('0100') ? 75 : 50,
        aliases: [id],
      }))
    }
  }

  for (const city of TAIWAN_CITIES) {
    entries.push(makeChinaEntry({
      ...city,
      id: citySlug(city.name),
      province: '台湾',
      aliases: [city.nameEn.toLowerCase()],
    }))
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
