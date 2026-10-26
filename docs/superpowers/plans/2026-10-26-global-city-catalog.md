# Global City Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline 560–590 city catalog with Chinese, English, pinyin and alias search, without adding the catalog to the initial application bundle.

**Architecture:** Keep the existing `City` domain model frozen. Add an editor-only `CityCatalogEntry` layer, build it from a one-time DataV + Natural Earth generation command, and feed the generated static JSON into the existing lazy-loaded editor path. Selected cities continue to be persisted into `data.cities`.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, TopoJSON-adjacent DataV JSON, Natural Earth GeoJSON, `world-countries`, `pinyin-pro` as a build-only dependency.

**Spec:** `docs/superpowers/specs/2026-10-26-global-cities-transport-design.md`

---

## File Structure

**Create**

- `src/lib/cityCatalog.ts` — catalog types, normalization, ranking and search.
- `src/lib/cityCatalog.test.ts` — pure search and ranking tests.
- `src/lib/cityCatalogData.test.ts` — committed catalog quality contract.
- `src/lib/editorCityCatalog.ts` — editor-only catalog merge and `City` search API.
- `src/lib/editorCityCatalog.ts` — editor-only catalog merge and `City` search API.
- `src/data/cities/china-north.json`
- `src/data/cities/china-northeast.json`
- `src/data/cities/china-east.json`
- `src/data/cities/china-central.json`
- `src/data/cities/china-south.json`
- `src/data/cities/china-southwest.json`
- `src/data/cities/china-northwest.json`
- `src/data/cities/international-asia.json`
- `src/data/cities/international-europe.json`
- `src/data/cities/international-americas.json`
- `src/data/cities/international-africa.json`
- `src/data/cities/international-oceania.json`
- `src/data/cities/index.ts` — typed aggregation of all generated files.
- `scripts/build-city-catalog.mjs` — command entry point.
- `scripts/city-catalog/config.mjs` — source constants, curated extras, aliases and overrides.
- `scripts/city-catalog/china.mjs` — DataV fetch and China normalization.
- `scripts/city-catalog/international.mjs` — Natural Earth fetch and international normalization.
- `scripts/city-catalog/validate.mjs` — generated catalog contract validation.
- `scripts/city-catalog/write.mjs` — region splitting and output.
- `docs/DATA_SOURCES.md` — source and license attribution.

**Modify**

- `package.json` — add `cities:build` and build-only pinyin dependency.
- `pnpm-lock.yaml` — dependency lock update.
- `src/lib/editorModel.ts` — merge generated catalog into editor search.
- `src/lib/editorModel.test.ts` — global search and persistence tests.
- `src/components/editor/CityCombobox.tsx` — search hint and empty catalog fallback.
- `src/components/editor/CityCombobox.test.tsx` — hint and result rendering.
- `README.md` — replace the “small built-in table” instructions.

**Do not modify**

- `src/types/index.ts` — `City` stays `{ id, name, lat, lng, province, country }`.
- `src/lib/cities.ts` — keep the existing core fallback map and synchronous resolve behavior.
- `src/data/trips.json` — real travel data is not test data.

---

### Task 1: Catalog Search Core

**Files:**
- Create: `src/lib/cityCatalog.ts`
- Create: `src/lib/cityCatalog.test.ts`

- [ ] **Step 1: Write the failing search tests**

Create `src/lib/cityCatalog.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
rtk vitest src/lib/cityCatalog.test.ts
```

Expected: FAIL because `@/lib/cityCatalog` does not exist.

- [ ] **Step 3: Implement the catalog search core**

Create `src/lib/cityCatalog.ts`:

```ts
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
```

- [ ] **Step 4: Run the search tests**

Run:

```bash
rtk vitest src/lib/cityCatalog.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit the search core**

```bash
git add src/lib/cityCatalog.ts src/lib/cityCatalog.test.ts
git commit -S -m "feat: add ranked city catalog search"
```

---

### Task 2: Generate and Validate the Static Catalog

**Files:**
- Create: `src/lib/cityCatalogData.test.ts`
- Create: `src/data/cities/index.ts`
- Create: `src/data/cities/*.json`
- Create: `scripts/build-city-catalog.mjs`
- Create: `scripts/city-catalog/*.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Write the failing catalog contract tests**

Create `src/lib/cityCatalogData.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify the generated module is missing**

Run:

```bash
rtk vitest src/lib/cityCatalogData.test.ts
```

Expected: FAIL with a module-resolution error for `@/data/cities`.

- [ ] **Step 3: Add the build-only pinyin dependency and command**

Run:

```bash
pnpm add -D pinyin-pro
```

Then update `package.json` scripts so it contains:

```json
{
  "scripts": {
    "cities:build": "node scripts/build-city-catalog.mjs"
  }
}
```

Keep all existing scripts unchanged.

- [ ] **Step 4: Implement generator configuration**

Create `scripts/city-catalog/config.mjs`:

```js
export const DATAV_ROOT = 'https://geo.datav.aliyun.com/areas_v3/bound'
export const NATURAL_EARTH_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson'

export const PROVINCE_CODES = [
  '130000', '140000', '150000', '210000', '220000', '230000',
  '320000', '330000', '340000', '350000', '360000', '370000',
  '410000', '420000', '430000', '440000', '450000', '460000',
  '510000', '520000', '530000', '540000', '610000', '620000',
  '630000', '640000', '650000',
]

export const PROVINCE_LEVEL_CODES = [
  '110000', '120000', '310000', '500000', '810000', '820000',
]

export const EXISTING_IDS = {
  北京: 'beijing',
  上海: 'shanghai',
  杭州: 'hangzhou',
  嘉兴: 'jiaxing',
  成都: 'chengdu',
  苏州: 'suzhou',
  广州: 'guangzhou',
  深圳: 'shenzhen',
  西安: 'xian',
  重庆: 'chongqing',
}

export const SPECIAL_CITY_IDS = {
  香港: 'hong-kong',
  澳门: 'macau',
  台北: 'taipei',
  新北: 'new-taipei',
  桃园: 'taoyuan',
  台中: 'taichung',
  台南: 'tainan',
  高雄: 'kaohsiung',
  花莲: 'hualien',
}

export const SPECIAL_PROVINCE_LEVEL_CITIES = {
  810000: { name: '香港', nameEn: 'Hong Kong' },
  820000: { name: '澳门', nameEn: 'Macau' },
}

export const SPECIAL_CITY_ALIASES = {
  香港: ['HK', 'Hong Kong', '香港特别行政区'],
  澳门: ['Macao', 'Macau', '澳门特别行政区'],
}

export const PINYIN_OVERRIDES = {
  厦门: 'xiamen',
  泉州: 'quanzhou',
  长沙: 'changsha',
  长春: 'changchun',
  重庆: 'chongqing',
  六安: 'luan',
  蚌埠: 'bengbu',
}

export const TAIWAN_CITIES = [
  { name: '台北', nameEn: 'Taipei', lat: 25.033, lng: 121.5654, priority: 80 },
  { name: '新北', nameEn: 'New Taipei', lat: 25.0169, lng: 121.4628, priority: 70 },
  { name: '桃园', nameEn: 'Taoyuan', lat: 24.9937, lng: 121.301, priority: 65 },
  { name: '台中', nameEn: 'Taichung', lat: 24.1477, lng: 120.6736, priority: 70 },
  { name: '台南', nameEn: 'Tainan', lat: 22.9999, lng: 120.227, priority: 65 },
  { name: '高雄', nameEn: 'Kaohsiung', lat: 22.6273, lng: 120.3014, priority: 75 },
  { name: '花莲', nameEn: 'Hualien', lat: 23.9911, lng: 121.6112, priority: 60 },
]

export const CURATED_INTERNATIONAL_EXTRAS = [
  'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Miami',
  'Toronto', 'Vancouver', 'Montreal', 'Sydney', 'Melbourne',
  'Auckland', 'Barcelona', 'Milan', 'Munich', 'Frankfurt',
  'Zurich', 'Istanbul', 'Antalya', 'Dubai', 'Jeddah',
  'Tel Aviv', 'Mumbai', 'Delhi', 'Bengaluru', 'Kolkata',
  'Osaka', 'Kyoto', 'Nagoya', 'Busan', 'Jeju',
  'Ho Chi Minh City', 'Da Nang', 'Chiang Mai', 'Denpasar',
  'Rio de Janeiro', 'São Paulo', 'Cusco', 'Cancún',
  'Cape Town', 'Marrakesh', 'Zanzibar City', 'Nairobi',
]

export const ALIAS_OVERRIDES = {
  'new-york-us': ['NYC', 'New York'],
  'los-angeles-us': ['LA', 'L.A.'],
  'san-francisco-us': ['SF', 'San Fran', '旧金山'],
  'hong-kong-hk': ['HK', '香港特别行政区'],
  'macau-mo': ['澳门特别行政区', 'Macao'],
  'singapore-sg': ['新加坡市'],
  'cape-town-za': ['开普敦', 'Cape Town'],
}
```

- [ ] **Step 5: Implement China generation**

Create `scripts/city-catalog/china.mjs`:

```js
import { pinyin } from 'pinyin-pro'
import {
  DATAV_ROOT,
  EXISTING_IDS,
  PINYIN_OVERRIDES,
  PROVINCE_CODES,
  PROVINCE_LEVEL_CODES,
  SPECIAL_CITY_IDS,
  SPECIAL_CITY_ALIASES,
  SPECIAL_PROVINCE_LEVEL_CITIES,
  TAIWAN_CITIES,
} from './config.mjs'

const REGION_BY_PROVINCE = new Map([
  [['北京', '天津', '河北', '山西', '内蒙古'], 'china-north'],
  [['辽宁', '吉林', '黑龙江'], 'china-northeast'],
  [['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'], 'china-east'],
  [['河南', '湖北', '湖南'], 'china-central'],
  [['广东', '广西', '海南', '香港', '澳门'], 'china-south'],
  [['重庆', '四川', '贵州', '云南', '西藏'], 'china-southwest'],
  [['陕西', '甘肃', '青海', '宁夏', '新疆'], 'china-northwest'],
])

function regionFor(province) {
  for (const labels of REGION_BY_PROVINCE.keys()) {
    if (labels.some((label) => province.startsWith(label))) {
      return REGION_BY_PROVINCE.get(labels)
    }
  }
  return 'china-east'
}

function stripCitySuffix(name) {
  return name.endsWith('市') && name.length > 1 ? name.slice(0, -1) : name
}

function stripProvinceSuffix(name) {
  return name
    .replace(/特别行政区$/, '')
    .replace(/[省市]$/, '')
}

function slugPinyin(name) {
  if (PINYIN_OVERRIDES[name]) return PINYIN_OVERRIDES[name]
  if (EXISTING_IDS[name]) return EXISTING_IDS[name]
  if (SPECIAL_CITY_IDS[name]) return SPECIAL_CITY_IDS[name]
  return pinyin(name, { toneType: 'none', type: 'array' })
    .join('-')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`)
  return response.json()
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
      aliases: [...new Set([name, `${name}市`, ...aliases])],
      countryCode: 'CN',
      kind: 'china-city',
      priority,
    },
  }
}

export async function buildChinaCatalog() {
  const national = await fetchJson(`${DATAV_ROOT}/100000_full.json`)
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
      id: slugPinyin(name),
      name,
      nameEn: special?.nameEn
        ?? pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
      lat,
      lng,
      province: feature.properties.name,
      priority: 100,
      aliases: SPECIAL_CITY_ALIASES[name] ?? [],
    }))
  }

  for (const code of PROVINCE_CODES) {
    const province = provinceName.get(code) ?? ''
    const data = await fetchJson(`${DATAV_ROOT}/${code}_full.json`)
    for (const feature of data.features) {
      if (!feature.properties.center) continue
      const adcode = String(feature.properties.adcode)
      if (!adcode.endsWith('00')) continue
      const rawName = feature.properties.name
      const name = stripCitySuffix(rawName)
      const [lng, lat] = feature.properties.center
      const id = slugPinyin(name)
      entries.push(makeChinaEntry({
        id,
        name,
        nameEn: pinyin(name, { toneType: 'none' }).replace(/\s+/g, ''),
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
      id: slugPinyin(city.name),
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
```

- [ ] **Step 6: Implement international generation**

Create `scripts/city-catalog/international.mjs`:

```js
import worldCountries from 'world-countries'
import {
  ALIAS_OVERRIDES,
  CURATED_INTERNATIONAL_EXTRAS,
  NATURAL_EARTH_URL,
} from './config.mjs'

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

function countryFor(properties) {
  return byAlpha2.get(properties.ISO_A2)
    ?? byAlpha3.get(properties.ADM0_A3)
    ?? worldCountries.find((country) =>
      country.name.common === properties.ADM0NAME)
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function entryFromFeature(feature, kind, priority) {
  const properties = feature.properties
  const country = countryFor(properties)
  if (!country) throw new Error(`Unknown country: ${properties.ADM0NAME}`)
  const [lng, lat] = feature.geometry.coordinates
  const countryCode = country.cca2.toUpperCase()
  const id = `${slug(properties.NAMEASCII || properties.NAME)}-${countryCode.toLowerCase()}`
  const aliases = [
    properties.NAME,
    properties.NAME_EN,
    properties.NAMEASCII,
    properties.NAME_ZH,
    properties.NAME_ZHT,
    properties.NAMEALT,
    properties.NAMEPAR,
    ...(ALIAS_OVERRIDES[id] ?? []),
  ].filter(Boolean)

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
      aliases: [...new Set(aliases)],
      countryCode,
      kind,
      priority,
    },
  }
}

export async function buildInternationalCatalog() {
  const response = await fetch(NATURAL_EARTH_URL)
  if (!response.ok) throw new Error(`Natural Earth HTTP ${response.status}`)
  const data = await response.json()
  const features = data.features.filter(
    (feature) => !EXCLUDED_CHINA_CODES.has(feature.properties.ISO_A2),
  )

  const capitals = features.filter(
    (feature) => feature.properties.FEATURECLA === 'Admin-0 capital',
  )
  const extraNames = new Set(CURATED_INTERNATIONAL_EXTRAS)
  const extras = features.filter(
    (feature) => extraNames.has(feature.properties.NAME_EN)
      || extraNames.has(feature.properties.NAME),
  )

  const entries = []
  const ids = new Set()
  for (const feature of [...capitals, ...extras]) {
    const result = entryFromFeature(feature, 'capital', 70)
    if (!ids.has(result.entry.city.id)) {
      ids.add(result.entry.city.id)
      entries.push(result)
    }
  }

  for (const result of entries) {
    if (!capitals.some((feature) =>
      feature.properties.NAME_ZH === result.entry.city.name
      && feature.properties.ISO_A2 === result.entry.countryCode)) {
      result.entry.kind = extraNames.has(result.entry.nameEn)
        ? 'major-city'
        : 'travel-city'
      result.entry.priority = 80
    }
  }

  return entries
}
```

- [ ] **Step 7: Implement validation and output**

Create `scripts/city-catalog/validate.mjs`:

```js
const REQUIRED_IDS = [
  'beijing', 'shanghai', 'hangzhou', 'jiaxing', 'chengdu',
  'suzhou', 'guangzhou', 'shenzhen', 'xian', 'chongqing',
]

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
    if (city.lat < -90 || city.lat > 90 || city.lng < -180 || city.lng > 180) {
      throw new Error(`invalid coordinates for ${city.id}`)
    }
    if (!entry.aliases.length) throw new Error(`missing aliases for ${city.id}`)
  }
}
```

Create `scripts/city-catalog/write.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const OUTPUT_FILES = [
  'china-north',
  'china-northeast',
  'china-east',
  'china-central',
  'china-south',
  'china-southwest',
  'china-northwest',
  'international-asia',
  'international-europe',
  'international-americas',
  'international-africa',
  'international-oceania',
]

export async function writeCatalog(entries, root) {
  const directory = join(root, 'src/data/cities')
  await mkdir(directory, { recursive: true })

  for (const file of OUTPUT_FILES) {
    const data = entries
      .filter((item) => item.file === file)
      .map((item) => item.entry)
      .sort((a, b) =>
        b.priority - a.priority
        || a.city.name.localeCompare(b.city.name, 'zh-CN'))
    await writeFile(
      join(directory, `${file}.json`),
      `${JSON.stringify(data, null, 2)}\n`,
    )
  }
}
```

- [ ] **Step 8: Implement the command entry point**

Create `scripts/build-city-catalog.mjs`:

```js
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildChinaCatalog } from './city-catalog/china.mjs'
import { buildInternationalCatalog } from './city-catalog/international.mjs'
import { validateCatalog } from './city-catalog/validate.mjs'
import { writeCatalog } from './city-catalog/write.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  process.stdout.write('· building China city catalog… ')
  const china = await buildChinaCatalog()
  console.log(`${china.length} entries`)

  process.stdout.write('· building international city catalog… ')
  const international = await buildInternationalCatalog()
  console.log(`${international.length} entries`)

  const entries = [...china, ...international]
  validateCatalog(entries)
  await writeCatalog(entries, root)
  console.log(`✓ city catalog written: ${entries.length} entries`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

- [ ] **Step 9: Run the generator**

Run:

```bash
pnpm cities:build
```

Expected:

```text
✓ city catalog written: 560-590 entries
```

This command requires network access only during regeneration. If counts differ, update `CURATED_INTERNATIONAL_EXTRAS` or China filtering in the generator; do not weaken `validateCatalog`.

- [ ] **Step 10: Create the typed catalog aggregation**

Create `src/data/cities/index.ts`:

```ts
import type { CityCatalogEntry } from '@/lib/cityCatalog'
import chinaCentral from './china-central.json'
import chinaEast from './china-east.json'
import chinaNorth from './china-north.json'
import chinaNortheast from './china-northeast.json'
import chinaNorthwest from './china-northwest.json'
import chinaSouth from './china-south.json'
import chinaSouthwest from './china-southwest.json'
import internationalAfrica from './international-africa.json'
import internationalAmericas from './international-americas.json'
import internationalAsia from './international-asia.json'
import internationalEurope from './international-europe.json'
import internationalOceania from './international-oceania.json'

export const CITY_CATALOG = [
  ...chinaNorth,
  ...chinaNortheast,
  ...chinaEast,
  ...chinaCentral,
  ...chinaSouth,
  ...chinaSouthwest,
  ...chinaNorthwest,
  ...internationalAsia,
  ...internationalEurope,
  ...internationalAmericas,
  ...internationalAfrica,
  ...internationalOceania,
] as CityCatalogEntry[]
```

- [ ] **Step 11: Run the catalog contract tests**

Run:

```bash
rtk vitest src/lib/cityCatalogData.test.ts
```

Expected: PASS. If search sample `paris-fr` or `singapore-sg` fails, inspect generated IDs and update the test only when the ID follows the documented slug rule.

- [ ] **Step 12: Commit generated data and generator**

```bash
git add package.json pnpm-lock.yaml \
  scripts/build-city-catalog.mjs scripts/city-catalog \
  src/data/cities src/lib/cityCatalogData.test.ts
git commit -S -m "feat: generate offline global city catalog"
```

---

### Task 3: Integrate the Catalog into the Editor

**Files:**
- Create: `src/lib/editorCityCatalog.ts`
- Modify: `src/lib/editorModel.ts`
- Modify: `src/lib/editorModel.test.ts`

- [ ] **Step 1: Add failing editor integration tests**

In `src/lib/editorModel.test.ts`, replace:

```ts
expect(searchCities(data, '浙江').map((city) => city.id))
  .toEqual(['hangzhou', 'jiaxing'])
```

with:

```ts
expect(searchCities(data, '浙江').slice(0, 2).map((city) => city.id))
  .toEqual(['hangzhou', 'jiaxing'])
expect(searchCities(data, '浙江').length).toBeGreaterThan(2)
```

Then append:

```ts
it('searches the global offline catalog by Chinese and English names', () => {
  const data = clone()
  expect(searchCities(data, '东京')[0].id).toBe('tokyo-jp')
  expect(searchCities(data, 'Tokyo')[0].id).toBe('tokyo-jp')
  expect(searchCities(data, 'nyc')[0].id).toBe('new-york-us')
})

it('prefers user city overrides for an existing catalog id', () => {
  const data = clone()
  data.cities.push({
    id: 'tokyo-jp',
    name: '东京都',
    lat: 35.68,
    lng: 139.76,
    province: '东京都',
    country: '日本',
  })

  expect(searchCities(data, '东京都')[0]).toMatchObject({
    id: 'tokyo-jp',
    name: '东京都',
    lat: 35.68,
  })
})

it('persists a selected global city into travel data', () => {
  const data = clone()
  const draft = createTripDraft(data, data.journeys[0])
  const from = searchCities(data, '东京')[0]
  const to = searchCities(data, '纽约')[0]
  const next = saveTrip(data, {
    ...draft,
    from,
    to,
    date: '2025-05-02',
  })

  expect(next.cities.some((city) => city.id === 'tokyo-jp')).toBe(true)
  expect(next.cities.some((city) => city.id === 'new-york-us')).toBe(true)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
rtk vitest src/lib/editorModel.test.ts
```

Expected: FAIL because `searchCities()` only sees the core built-ins and user cities.

- [ ] **Step 3: Add an editor-only catalog module**

Create `src/lib/editorCityCatalog.ts`:

```ts
import type { City, TravelData } from '@/types'
import { CITY_CATALOG } from '@/data/cities'
import { BUILTIN_CITIES } from '@/lib/cities'
import {
  searchCityCatalog,
  type CityCatalogEntry,
} from '@/lib/cityCatalog'

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
    const override = overrides.get(entry.city.id)
    return override ? { ...entry, city: override } : entry
  })
  const known = new Set(entries.map((entry) => entry.city.id))
  for (const city of data.cities) {
    if (!known.has(city.id)) entries.push(entryForUserCity(city))
  }
  return entries
}

export function listCityOptions(data: TravelData): City[] {
  const merged = new Map<string, City>()
  for (const city of BUILTIN_CITIES) merged.set(city.id, city)
  for (const entry of mergedCatalogEntries(data)) {
    merged.set(entry.city.id, entry.city)
  }
  return [...merged.values()]
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
```

In `src/lib/editorModel.ts`, remove the local `listCityOptions` and
`searchCities` implementations and their now-unused imports. Add:

```ts
import { listCityOptions } from '@/lib/editorCityCatalog'

export {
  listCityOptions,
  searchCities,
} from '@/lib/editorCityCatalog'
```

Update `makeCityId()` so its used-id set comes from the editor-only list:

```ts
const used = new Set(listCityOptions(data).map((city) => city.id))
```

Do not change `src/lib/cities.ts`; the generated catalog remains editor-only.

- [ ] **Step 4: Run editor tests**

Run:

```bash
rtk vitest src/lib/editorModel.test.ts
```

Expected: PASS, including all pre-existing editor tests.

- [ ] **Step 5: Commit editor integration**

```bash
git add src/lib/editorModel.ts src/lib/editorModel.test.ts \
  src/lib/editorCityCatalog.ts
git commit -S -m "feat: search global cities in the editor"
```

---

### Task 4: Editor Hint and Offline Loading Fallback

**Files:**
- Modify: `src/components/editor/CityCombobox.tsx`
- Modify: `src/components/editor/CityCombobox.test.tsx`

- [ ] **Step 1: Write a failing combobox hint test**

Add to `src/components/editor/CityCombobox.test.tsx`:

```tsx
it('advertises Chinese, English and pinyin search', () => {
  render(
    <CityCombobox
      data={clone()}
      label="到达城市"
      value={null}
      onChange={() => {}}
    />,
  )

  expect(screen.getByRole('combobox').getAttribute('placeholder'))
    .toContain('中文、英文或拼音')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk vitest src/components/editor/CityCombobox.test.tsx
```

Expected: FAIL because the placeholder still says only “城市名、省份或 id”.

- [ ] **Step 3: Update the combobox copy**

In `src/components/editor/CityCombobox.tsx`, change the input placeholder to:

```tsx
placeholder="搜索中文、英文或拼音"
```

Keep the existing custom-city fallback and coordinate preview unchanged.

- [ ] **Step 4: Run combobox tests**

Run:

```bash
rtk vitest src/components/editor/CityCombobox.test.tsx
```

Expected: PASS, including the existing custom city tests.

- [ ] **Step 5: Commit the combobox update**

```bash
git add src/components/editor/CityCombobox.tsx \
  src/components/editor/CityCombobox.test.tsx
git commit -S -m "feat: clarify global city search"
```

---

### Task 5: Documentation and Source Attribution

**Files:**
- Create: `docs/DATA_SOURCES.md`
- Modify: `README.md`

- [ ] **Step 1: Add source attribution**

Create `docs/DATA_SOURCES.md`:

```markdown
# 数据来源

## 旅行记录

`src/data/trips.json` 中的旅程、交通、到访和照片说明由项目使用者维护，不属于第三方数据集。

## 中国城市目录

`src/data/cities/china-*.json` 的城市中心坐标与行政区名称来自阿里云 DataV 行政区划数据：

- 来源：https://geo.datav.aliyun.com/areas_v3/bound/
- 使用方式：生成时读取地级行政区 `center`，之后以静态 JSON 提交。
- 运行时不请求 DataV。

港澳台少量城市由项目人工核对补充。

## 国际城市目录

`src/data/cities/international-*.json` 以 Natural Earth 10m populated places 为基础：

- 来源：https://github.com/nvkelso/natural-earth-vector
- Natural Earth 数据属于 public domain。
- 中文名、英文名、首都标记和坐标来自 Natural Earth 属性。
- 国家中文名使用 `world-countries` 的翻译补充。

项目维护了少量旅行常用别名，例如 NYC、LA、SF 和城市简称。

## 城市目录重新生成

```bash
pnpm cities:build
```

该命令需要网络，只会写入手工生成的城市 JSON。常规 `pnpm dev`、`pnpm build` 和线上运行完全离线。
```

- [ ] **Step 2: Update README city instructions**

Replace the current “内置常用城市” section with:

```markdown
## 添加与选择城市

编辑器内置约 560–590 个离线城市，覆盖中国地级及以上城市、各国首都以及主要旅行城市。可按中文、英文、拼音、别名、省份或国家搜索；选中后自动填入坐标。

如果城市不在目录中，可直接在表单内填写省份、国家、经纬度和坐标创建自定义城市。

城市目录由 `pnpm cities:build` 手动更新，普通开发、构建与运行不联网。数据来源见 [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)。
```

- [ ] **Step 3: Verify documentation links**

Run:

```bash
rg -n "DATA_SOURCES|cities:build|560" README.md docs/DATA_SOURCES.md
```

Expected: README references the data source file and manual build command.

- [ ] **Step 4: Commit docs**

```bash
git add README.md docs/DATA_SOURCES.md
git commit -S -m "docs: document offline city catalog sources"
```

---

### Task 6: Full Verification and Bundle Boundary

**Files:**
- No source changes expected.

- [ ] **Step 1: Run all types and tests**

Run:

```bash
pnpm check
```

Expected: typecheck passes and every test file passes.

- [ ] **Step 2: Build the application**

Run:

```bash
pnpm build
```

Expected: Vite build succeeds.

- [ ] **Step 3: Verify the catalog is not in the initial chunk**

Run:

```bash
rg -l "雷克雅未克|Cape Town|tokyo-jp" dist/assets
```

Expected: matches only the lazy editor chunk, not `index-*.js`.

- [ ] **Step 4: Verify city search in the browser**

Start the development server:

```bash
pnpm dev
```

In desktop Chrome at 1440×900:

1. Open the editor and add a visit.
2. Search “杭州”“杭州市”“Tokyo”“东京”“NYC”“Reykjavik”.
3. Confirm coordinates appear before saving.
4. Select Tokyo and save the visit.
5. Reload and confirm the selected Tokyo city still resolves.
6. Confirm there are no page console errors.

- [ ] **Step 5: Preserve repository cleanliness**

Do not commit browser state or `dist/`. If a verification step exposes a
source defect, return to the task that owns that file, add or correct its
failing test there, implement the fix, rerun that task's focused test, and
commit with that task's exact `git add` list. Then rerun `pnpm check` and
`pnpm build`.

---

## Self-Review

**Spec coverage**

- Catalog size and China majority: Task 2.
- Chinese/English/pinyin/alias search: Tasks 1 and 3.
- Offline runtime and manual generation: Tasks 2 and 5.
- Editor-only bundle boundary: Tasks 3 and 6.
- Selected city persistence: Task 3.
- Existing IDs and core fallback unchanged: Task 2 contract test and Task 3 boundary.
- Custom-city fallback: Task 4.
- Source attribution: Task 5.
- Desktop verification: Task 6.

**Placeholder scan**

No TBD/TODO markers or unspecified file lists remain.

**Type consistency**

- `CityCatalogEntry`, `CityCatalogKind`, `searchCityCatalog`, `CITY_CATALOG`, `mergedCatalogEntries`, and the JSON field names are used consistently.
- `countryCode` is uppercase ISO2 in tests and generated data.
- Existing `City` fields remain unchanged.
