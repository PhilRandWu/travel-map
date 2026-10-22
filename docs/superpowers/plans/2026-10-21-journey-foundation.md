# Journey Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立旅程级数据模型、校验、范围过滤、导航状态机、旅行档案和旅程视图，使两段旅行及常居城市在地图、章节、统计与回放中完全隔离。

**Architecture:** 以 `Journey` 为一级对象，以 `JourneyScope` 决定数据范围，以现有 `Selection` 决定聚焦对象。所有派生结果先通过 `scopeTravelData` 过滤，再复用现有 `selectLitCities`、`buildTimelineNodes`、`buildTracks`、`computeStats` 和回放引擎，避免维护第二套渲染逻辑。

**Tech Stack:** TypeScript、React 19、Vitest、Testing Library、jsdom、react-globe.gl、现有 Vite 构建。

---

## 执行约定

- 本计划中的 commit 步骤是未来执行计划时的提交节点；本轮只写文档，不执行 commit。
- 每个任务先写失败测试，再写最小实现。
- 产品组件不超过约 220 行，产品模块不超过约 300 行。
- 用户提供的 2026 年日期只出现在讨论中，不写入代码、示例 JSON 或测试。

## 文件边界

- `src/types/index.ts`：领域类型与跨阶段状态契约。
- `src/lib/journeys.ts`：旅程排序、分组、封面解析、范围过滤与摘要。
- `src/lib/navigation.ts`：无 UI 的导航状态机。
- `src/lib/validate.ts`：现有同步校验入口。
- `src/lib/journeyValidation.ts`：旅程、封面、照片元数据校验。
- `src/components/journey/*`：档案、旅程卡、面包屑、护照与章节轴。
- `src/components/app/TravelWorkspace.tsx`：应用编排，不承载纯领域逻辑。

### Task A1: 建立组件测试基线

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.tsx`

- [x] **Step 1: 写第一个组件冒烟测试**

```tsx
// src/test/smoke.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('component test environment', () => {
  it('renders a React component in jsdom', () => {
    render(<button type="button">打开旅程</button>)
    expect(screen.getByRole('button', { name: '打开旅程' })).toBeTruthy()
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/test/smoke.test.tsx`

Expected: FAIL，提示无法解析 `@testing-library/react` 或 jsdom 环境不可用。

- [x] **Step 3: 安装测试依赖**

Run: `pnpm add -D @testing-library/react @testing-library/user-event jsdom`

Expected: `package.json` 与锁文件新增 3 个开发依赖。

- [x] **Step 4: 配置 Vitest 与清理钩子**

```ts
// vite.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
```

```ts
// src/test/setup.ts
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
```

- [x] **Step 5: 运行测试与类型检查**

Run: `pnpm test -- src/test/smoke.test.tsx && pnpm exec tsc --noEmit`

Expected: 1 个测试文件通过；TypeScript 无错误。

- [ ] **Step 6: 提交测试基线**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/test/setup.ts src/test/smoke.test.tsx
git commit -m "test: add component testing baseline"
```

### Task A2: 定义 Journey 与跨阶段契约

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/types/contract.test.ts`

- [x] **Step 1: 写类型契约测试**

```ts
// src/types/contract.test.ts
import { describe, expect, it } from 'vitest'
import type {
  Journey,
  JourneyScope,
  Photo,
  TravelData,
  Trip,
  Visit,
} from '@/types'

const journey: Journey = {
  id: 'j-contract',
  title: '契约测试旅程',
  startDate: '2025-01-01',
  endDate: '2025-01-03',
  theme: 'cyan',
  coverPhotos: [],
}

const trip: Trip = {
  id: 't-contract',
  journeyId: journey.id,
  date: '2025-01-01',
  type: 'flight',
  from: 'beijing',
  to: 'hangzhou',
  waypoints: [],
}

const photo: Photo = {
  file: '01.jpg',
  takenAt: '2025-01-01T10:00:00+08:00',
  featured: true,
  focalPoint: { x: 0.5, y: 0.45 },
}

const visit: Visit = {
  id: 'v-contract',
  journeyId: journey.id,
  city: 'hangzhou',
  arriveDate: '2025-01-01',
  leaveDate: '2025-01-03',
  photos: [photo],
}

const data: TravelData = {
  meta: { owner: '旅行者', homeCity: 'beijing', version: 2 },
  cities: [],
  journeys: [journey],
  trips: [trip],
  visits: [visit],
}

describe('v0.3 data contracts', () => {
  it('places journeys, trips and visits in one version 2 document', () => {
    const scope: JourneyScope = { kind: 'journey', journeyId: journey.id }
    expect(data.meta.version).toBe(2)
    expect(data.trips[0].journeyId).toBe(scope.journeyId)
    expect(data.visits[0].photos[0].focalPoint).toEqual({ x: 0.5, y: 0.45 })
  })
})
```

- [x] **Step 2: 运行类型检查确认失败**

Run: `pnpm exec tsc --noEmit`

Expected: FAIL，提示 `Journey`、`journeyId`、`journeys`、`version: 2` 或照片元数据字段不存在。

- [x] **Step 3: 修改领域类型**

```ts
// src/types/index.ts
export type TransportType = 'flight' | 'train'
export type JourneyTheme = 'amber' | 'cyan' | 'sage' | 'rose'

export interface City {
  id: string
  name: string
  lat: number
  lng: number
  province: string
  country: string
}

export interface JourneyCoverPhoto {
  visitId: string
  file: string
}

export interface Journey {
  id: string
  title: string
  startDate: string
  endDate: string
  epigraph?: string
  summary?: string
  theme: JourneyTheme
  coverPhotos: JourneyCoverPhoto[]
}

export interface Photo {
  file: string
  caption?: string
  takenAt?: string
  featured?: boolean
  focalPoint?: {
    x: number
    y: number
  }
}

export interface Trip {
  id: string
  journeyId: string
  date: string
  type: TransportType
  from: string
  to: string
  waypoints: string[]
  note?: string
}

export interface Visit {
  id: string
  journeyId: string
  city: string
  arriveDate: string
  leaveDate: string
  note?: string
  photos: Photo[]
}

export interface TravelMeta {
  owner: string
  homeCity: string
  version: 2
}

export interface TravelData {
  meta: TravelMeta
  cities: City[]
  journeys: Journey[]
  trips: Trip[]
  visits: Visit[]
}

export type TimelineNodeKind = 'visit' | 'trip'

export type Selection =
  | { kind: 'none' }
  | { kind: 'visit'; visitId: string }
  | { kind: 'trip'; tripId: string }
  | { kind: 'city'; cityId: string }

export type JourneyScope =
  | { kind: 'archive' }
  | { kind: 'journey'; journeyId: string }
```

- [x] **Step 4: 运行契约测试和类型检查**

Run: `pnpm test -- src/types/contract.test.ts && pnpm exec tsc --noEmit`

Expected: 契约测试通过；TypeScript 通过。JSON 数据尚未迁移时只做结构断言，不运行应用。

- [ ] **Step 5: 提交类型契约**

```bash
git add src/types/index.ts src/types/contract.test.ts
git commit -m "feat: define journey data contracts"
```

### Task A3: 迁移示例数据并移除常居生活到访

**Files:**
- Modify: `src/data/trips.json`
- Create: `src/lib/journeyData.test.ts`

- [x] **Step 1: 写示例数据测试**

```ts
// src/lib/journeyData.test.ts
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'

const data = dataJson as TravelData

describe('example journey data', () => {
  it('contains two valid journeys and no home-city visit', () => {
    expect(data.meta.version).toBe(2)
    expect(data.journeys).toHaveLength(2)
    expect(data.visits.map((visit) => visit.id)).toEqual(['v001', 'v002', 'v003'])
    expect(data.visits.some((visit) => visit.city === data.meta.homeCity)).toBe(false)
  })

  it('assigns every trip and visit to an existing journey', () => {
    const journeyIds = new Set(data.journeys.map((journey) => journey.id))
    for (const item of [...data.trips, ...data.visits]) {
      expect(journeyIds.has(item.journeyId), item.id).toBe(true)
    }
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/journeyData.test.ts`

Expected: FAIL，示例数据缺少 `journeys`，仍包含北京生活到访。

- [x] **Step 3: 替换示例 JSON**

```json
{
  "meta": {
    "owner": "旅行者",
    "homeCity": "beijing",
    "version": 2
  },
  "cities": [
    { "id": "beijing", "name": "北京", "lat": 39.9042, "lng": 116.4074, "province": "北京", "country": "中国" },
    { "id": "hangzhou", "name": "杭州", "lat": 30.2741, "lng": 120.1551, "province": "浙江", "country": "中国" },
    { "id": "shanghai", "name": "上海", "lat": 31.2304, "lng": 121.4737, "province": "上海", "country": "中国" },
    { "id": "jiaxing", "name": "嘉兴", "lat": 30.7522, "lng": 120.7555, "province": "浙江", "country": "中国" },
    { "id": "chengdu", "name": "成都", "lat": 30.5728, "lng": 104.0668, "province": "四川", "country": "中国" }
  ],
  "journeys": [
    {
      "id": "j001",
      "title": "江南春行",
      "startDate": "2025-05-01",
      "endDate": "2025-05-05",
      "epigraph": "沿着水汽与梧桐，走进五月的江南。",
      "summary": "从杭州的湖光出发，经嘉兴抵达上海，再从外滩归程。",
      "theme": "cyan",
      "coverPhotos": [
        { "visitId": "v001", "file": "02.svg" },
        { "visitId": "v001", "file": "01.svg" },
        { "visitId": "v002", "file": "01.svg" }
      ]
    },
    {
      "id": "j002",
      "title": "成都慢夏",
      "startDate": "2025-06-10",
      "endDate": "2025-06-13",
      "epigraph": "在竹影、红油与缓慢的午后之间停留。",
      "summary": "一次只围绕成都展开的短途停留。",
      "theme": "amber",
      "coverPhotos": [
        { "visitId": "v003", "file": "03.svg" },
        { "visitId": "v003", "file": "02.svg" },
        { "visitId": "v003", "file": "01.svg" }
      ]
    }
  ],
  "trips": [
    {
      "id": "t001",
      "journeyId": "j001",
      "date": "2025-05-01",
      "type": "flight",
      "from": "beijing",
      "to": "hangzhou",
      "waypoints": [],
      "note": "CA1234"
    },
    {
      "id": "t002",
      "journeyId": "j001",
      "date": "2025-05-03",
      "type": "train",
      "from": "hangzhou",
      "to": "shanghai",
      "waypoints": ["jiaxing"],
      "note": "G7558"
    },
    {
      "id": "t003",
      "journeyId": "j001",
      "date": "2025-05-05",
      "type": "flight",
      "from": "shanghai",
      "to": "beijing",
      "waypoints": [],
      "note": "MU5101"
    },
    {
      "id": "t004",
      "journeyId": "j002",
      "date": "2025-06-10",
      "type": "flight",
      "from": "beijing",
      "to": "chengdu",
      "waypoints": [],
      "note": "3U8887"
    },
    {
      "id": "t005",
      "journeyId": "j002",
      "date": "2025-06-13",
      "type": "flight",
      "from": "chengdu",
      "to": "beijing",
      "waypoints": [],
      "note": "CA4193"
    }
  ],
  "visits": [
    {
      "id": "v001",
      "journeyId": "j001",
      "city": "hangzhou",
      "arriveDate": "2025-05-01",
      "leaveDate": "2025-05-03",
      "note": "五一西湖行",
      "photos": [
        {
          "file": "01.svg",
          "caption": "断桥",
          "takenAt": "2025-05-01T09:20:00+08:00",
          "featured": true,
          "focalPoint": { "x": 0.54, "y": 0.48 }
        },
        {
          "file": "02.svg",
          "caption": "西湖暮色",
          "takenAt": "2025-05-02T18:40:00+08:00",
          "featured": true,
          "focalPoint": { "x": 0.46, "y": 0.42 }
        },
        {
          "file": "03.svg",
          "caption": "",
          "takenAt": "2025-05-03T07:15:00+08:00",
          "featured": false,
          "focalPoint": { "x": 0.5, "y": 0.5 }
        }
      ]
    },
    {
      "id": "v002",
      "journeyId": "j001",
      "city": "shanghai",
      "arriveDate": "2025-05-03",
      "leaveDate": "2025-05-05",
      "note": "外滩与武康路",
      "photos": [
        {
          "file": "01.svg",
          "caption": "外滩夜景",
          "takenAt": "2025-05-03T20:10:00+08:00",
          "featured": true,
          "focalPoint": { "x": 0.58, "y": 0.5 }
        },
        {
          "file": "02.svg",
          "caption": "",
          "takenAt": "2025-05-04T15:30:00+08:00",
          "featured": false,
          "focalPoint": { "x": 0.5, "y": 0.55 }
        }
      ]
    },
    {
      "id": "v003",
      "journeyId": "j002",
      "city": "chengdu",
      "arriveDate": "2025-06-10",
      "leaveDate": "2025-06-13",
      "note": "端午成都逛吃",
      "photos": [
        {
          "file": "01.svg",
          "caption": "宽窄巷子",
          "takenAt": "2025-06-10T16:00:00+08:00",
          "featured": false,
          "focalPoint": { "x": 0.5, "y": 0.5 }
        },
        {
          "file": "02.svg",
          "caption": "火锅",
          "takenAt": "2025-06-11T19:20:00+08:00",
          "featured": true,
          "focalPoint": { "x": 0.52, "y": 0.58 }
        },
        {
          "file": "03.svg",
          "caption": "大熊猫基地",
          "takenAt": "2025-06-12T08:40:00+08:00",
          "featured": true,
          "focalPoint": { "x": 0.48, "y": 0.44 }
        }
      ]
    }
  ]
}
```

- [x] **Step 4: 运行数据测试**

Run: `pnpm test -- src/lib/journeyData.test.ts`

Expected: 2 个测试通过。

- [ ] **Step 5: 提交示例迁移**

```bash
git add src/data/trips.json src/lib/journeyData.test.ts
git commit -m "feat: migrate sample data to journeys"
```

### Task A4: 校验旅程、封面、照片元数据与常居语义

**Files:**
- Create: `src/lib/journeyValidation.ts`
- Create: `src/lib/journeyValidation.test.ts`
- Modify: `src/lib/validate.ts`

- [x] **Step 1: 写失败校验测试**

```ts
// src/lib/journeyValidation.test.ts
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { validateTravelData } from '@/lib/validate'

const sample = () => structuredClone(dataJson) as TravelData

describe('journey validation', () => {
  it('accepts the migrated sample data', () => {
    expect(validateTravelData(sample()).filter((issue) => issue.level === 'error')).toEqual([])
  })

  it('rejects a trip outside its journey date range', () => {
    const data = sample()
    data.trips[0].date = '2025-04-30'
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'trip:t001',
    }))
  })

  it('rejects a missing journey reference', () => {
    const data = sample()
    data.visits[0].journeyId = 'missing'
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
    }))
  })

  it('rejects an invalid cover photo', () => {
    const data = sample()
    data.journeys[0].coverPhotos[0] = { visitId: 'v001', file: 'missing.jpg' }
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'journey:j001',
    }))
  })

  it('rejects a home-city visit', () => {
    const data = sample()
    data.visits[0].city = data.meta.homeCity
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
    }))
  })

  it('rejects out-of-range focal points', () => {
    const data = sample()
    data.visits[0].photos[0].focalPoint = { x: 1.2, y: 0.5 }
    expect(validateTravelData(data)).toContainEqual(expect.objectContaining({
      level: 'error',
      subject: 'visit:v001',
    }))
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/journeyValidation.test.ts`

Expected: 大多数新增断言失败，因为现有校验不读取 journeys、journeyId、封面或照片元数据。

- [x] **Step 3: 新建旅程校验模块**

```ts
// src/lib/journeyValidation.ts
import type { JourneyTheme, TravelData } from '@/types'
import type { ValidationIssue } from '@/lib/validate'

const JOURNEY_THEMES: JourneyTheme[] = ['amber', 'cyan', 'sage', 'rose']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function inRange(date: string, start: string, end: string): boolean {
  return validDate(date) && date >= start && date <= end
}

export function validateJourneyData(
  data: TravelData,
  seenIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const journeyMap = new Map<string, TravelData['journeys'][number]>()
  const visitMap = new Map(data.visits.map((visit) => [visit.id, visit]))

  if (data.meta.version !== 2) {
    issues.push({
      level: 'error',
      subject: 'meta',
      message: `version 必须为 2，当前为 ${String(data.meta.version)}`,
    })
  }

  for (const journey of data.journeys) {
    const subject = `journey:${journey.id}`
    if (typeof journey.id !== 'string' || journey.id === '') {
      issues.push({ level: 'error', subject, message: '缺少合法 id' })
    } else if (seenIds.has(journey.id)) {
      issues.push({ level: 'error', subject, message: `id「${journey.id}」重复` })
    } else {
      seenIds.add(journey.id)
      journeyMap.set(journey.id, journey)
    }

    if (typeof journey.title !== 'string' || journey.title.trim() === '') {
      issues.push({ level: 'error', subject, message: '缺少 title' })
    }
    if (!validDate(journey.startDate) || !validDate(journey.endDate)) {
      issues.push({ level: 'error', subject, message: '起止日期必须使用合法的 YYYY-MM-DD' })
    } else if (journey.startDate > journey.endDate) {
      issues.push({ level: 'error', subject, message: 'startDate 不能晚于 endDate' })
    }
    if (!JOURNEY_THEMES.includes(journey.theme)) {
      issues.push({ level: 'error', subject, message: `theme 非法：${String(journey.theme)}` })
    }
    if (!Array.isArray(journey.coverPhotos) || journey.coverPhotos.length > 5) {
      issues.push({ level: 'error', subject, message: 'coverPhotos 必须是 0–5 张的数组' })
      continue
    }
    journey.coverPhotos.forEach((cover, index) => {
      const visit = visitMap.get(cover.visitId)
      if (!visit) {
        issues.push({
          level: 'error',
          subject,
          message: `coverPhotos[${index}] 引用了不存在的到访「${cover.visitId}」`,
        })
        return
      }
      if (!visit.photos.some((photo) => photo.file === cover.file)) {
        issues.push({
          level: 'error',
          subject,
          message: `coverPhotos[${index}] 引用了不存在的照片「${cover.file}」`,
        })
      }
    })
  }

  for (const trip of data.trips) {
    const subject = `trip:${trip.id}`
    const journey = journeyMap.get(trip.journeyId)
    if (!journey) {
      issues.push({
        level: 'error',
        subject,
        message: `journeyId「${trip.journeyId}」不存在`,
      })
    } else if (validDate(trip.date)
      && !inRange(trip.date, journey.startDate, journey.endDate)) {
      issues.push({
        level: 'error',
        subject,
        message: `date「${trip.date}」不在旅程 ${journey.id} 的日期范围内`,
      })
    }
  }

  for (const visit of data.visits) {
    const subject = `visit:${visit.id}`
    const journey = journeyMap.get(visit.journeyId)
    if (!journey) {
      issues.push({
        level: 'error',
        subject,
        message: `journeyId「${visit.journeyId}」不存在`,
      })
    } else if (validDate(visit.arriveDate) && validDate(visit.leaveDate)) {
      if (!inRange(visit.arriveDate, journey.startDate, journey.endDate)
        || !inRange(visit.leaveDate, journey.startDate, journey.endDate)) {
        issues.push({
          level: 'error',
          subject,
          message: `到访日期不在旅程 ${journey.id} 的日期范围内`,
        })
      }
    }
    if (visit.city === data.meta.homeCity) {
      issues.push({
        level: 'error',
        subject,
        message: '常居城市不能创建旅行到访；请由 meta.homeCity 独立点亮',
      })
    }
    visit.photos.forEach((photo, index) => {
      if (photo.takenAt !== undefined && !ISO_DATE_TIME.test(photo.takenAt)) {
        issues.push({
          level: 'error',
          subject,
          message: `photos[${index}].takenAt 必须是带时区的 ISO 8601`,
        })
      }
      if (photo.featured !== undefined && typeof photo.featured !== 'boolean') {
        issues.push({
          level: 'error',
          subject,
          message: `photos[${index}].featured 必须是布尔值`,
        })
      }
      if (photo.focalPoint) {
        const { x, y } = photo.focalPoint
        if (x < 0 || x > 1 || y < 0 || y > 1) {
          issues.push({
            level: 'error',
            subject,
            message: `photos[${index}].focalPoint 必须位于 0–1`,
          })
        }
      }
    })
  }

  return issues
}
```

- [x] **Step 4: 接入现有校验入口**

```ts
// src/lib/validate.ts
import { validateJourneyData } from '@/lib/journeyValidation'

export function isTravelData(v: unknown): v is TravelData {
  if (!isObject(v) || !isObject(v.meta)) return false
  return Array.isArray(v.cities)
    && Array.isArray(v.journeys)
    && Array.isArray(v.trips)
    && Array.isArray(v.visits)
}

export function validateTravelData(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!isTravelData(input)) {
    issues.push({
      level: 'error',
      subject: 'trips.json',
      message: '顶层结构非法：需要 { meta, cities, journeys, trips, visits }',
    })
    return issues
  }

  const data = input
  const seen = new Set<string>()
  checkDuplicateIds(data.cities, 'city', seen, issues)
  checkDuplicateIds(data.trips, 'trip', seen, issues)
  checkDuplicateIds(data.visits, 'visit', seen, issues)
  issues.push(...validateJourneyData(data, seen))

  const cityMap = resolveCities(data)
  const requireCity = (ref: unknown, subject: string, field: string) => {
    if (typeof ref !== 'string' || ref === '') {
      issues.push({ level: 'error', subject, message: `${field} 缺少城市 id` })
      return
    }
    if (!cityMap.has(ref)) {
      issues.push({ level: 'error', subject, message: `${field} 引用了不存在的城市「${ref}」` })
    }
  }

  requireCity(data.meta.homeCity, 'meta', 'homeCity')

  for (const trip of data.trips) {
    const subject = `trip:${trip.id}`
    requireCity(trip.from, subject, 'from')
    requireCity(trip.to, subject, 'to')
    trip.waypoints.forEach((waypoint, index) =>
      requireCity(waypoint, subject, `waypoints[${index}]`))
  }

  for (const visit of data.visits) {
    requireCity(visit.city, `visit:${visit.id}`, 'city')
  }

  return issues
}
```

保留 `validateTravelData` 中原有的日期、交通类型、坐标范围和照片警告检查；把上述片段作为新增接入逻辑插入，不删除现有检查。

- [x] **Step 5: 运行校验测试**

Run: `pnpm test -- src/lib/journeyValidation.test.ts src/lib/derive.test.ts`

Expected: 新旧校验测试全部通过，示例数据零 error。

- [ ] **Step 6: 提交校验增强**

```bash
git add src/lib/journeyValidation.ts src/lib/journeyValidation.test.ts src/lib/validate.ts
git commit -m "feat: validate journey boundaries and photo metadata"
```

### Task A5: 实现旅程摘要与范围过滤

**Files:**
- Create: `src/lib/journeys.ts`
- Test: `src/lib/journeys.test.ts`

- [x] **Step 1: 写旅程派生测试**

```ts
// src/lib/journeys.test.ts
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData, Visit } from '@/types'
import {
  getHomeCity,
  getOtherJourneyTrips,
  getJourneyVisits,
  groupJourneysByYear,
  scopeTravelData,
  sortJourneysNewestFirst,
  summarizeJourney,
} from '@/lib/journeys'

const data = dataJson as TravelData

describe('journey derivations', () => {
  it('sorts newest journeys first and groups by start year', () => {
    expect(sortJourneysNewestFirst(data.journeys).map((journey) => journey.id))
      .toEqual(['j002', 'j001'])
    expect(groupJourneysByYear(data.journeys)).toEqual([
      { year: 2025, journeys: [data.journeys[1], data.journeys[0]] },
    ])
  })

  it('filters trips and visits through JourneyScope', () => {
    const scoped = scopeTravelData(data, { kind: 'journey', journeyId: 'j001' })
    expect(scoped.trips.map((trip) => trip.id)).toEqual(['t001', 't002', 't003'])
    expect(scoped.visits.map((visit) => visit.id)).toEqual(['v001', 'v002'])
  })

  it('isolates the same city in different journeys', () => {
    const cloned = structuredClone(data)
    const repeated: Visit = {
      ...cloned.visits[0],
      id: 'v-repeat',
      journeyId: 'j002',
      arriveDate: '2025-06-11',
      leaveDate: '2025-06-12',
    }
    cloned.visits.push(repeated)
    expect(getJourneyVisits(cloned, 'j001').map((visit) => visit.id)).toEqual(['v001', 'v002'])
    expect(getJourneyVisits(cloned, 'j002').map((visit) => visit.id)).toEqual(['v003', 'v-repeat'])
  })

  it('summarizes covers, photos and destination cities', () => {
    const summary = summarizeJourney(data, data.journeys[0])
    expect(summary.coverSources).toHaveLength(3)
    expect(summary.photoCount).toBe(5)
    expect(summary.destinationCityIds).toEqual(['hangzhou', 'shanghai'])
  })

  it('resolves the home city without creating a destination visit', () => {
    expect(getHomeCity(data)?.name).toBe('北京')
    expect(scopeTravelData(data, { kind: 'archive' }).visits.some(
      (visit) => visit.city === data.meta.homeCity,
    )).toBe(false)
  })

  it('keeps other journeys available only for the opt-in stardust layer', () => {
    expect(getOtherJourneyTrips(data, 'j001').map((trip) => trip.id))
      .toEqual(['t004', 't005'])
    expect(getOtherJourneyTrips(data, 'j002').map((trip) => trip.id))
      .toEqual(['t001', 't002', 't003'])
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/journeys.test.ts`

Expected: FAIL，`@/lib/journeys` 不存在。

- [x] **Step 3: 实现旅程派生**

```ts
// src/lib/journeys.ts
import type { City, Journey, JourneyScope, TravelData, Visit } from '@/types'
import { resolveCity, resolveCities } from '@/lib/cities'
import { compareDate } from '@/lib/validate'

export interface JourneyCoverSource {
  visitId: string
  file: string
  visit: Visit
}

export interface JourneySummary {
  journey: Journey
  tripCount: number
  visitCount: number
  destinationCityIds: string[]
  photoCount: number
  coverSources: JourneyCoverSource[]
}

export function sortJourneysNewestFirst(journeys: Journey[]): Journey[] {
  return [...journeys].sort((a, b) => {
    const byEnd = compareDate(b.endDate, a.endDate)
    return byEnd || compareDate(b.startDate, a.startDate)
  })
}

export function groupJourneysByYear(
  journeys: Journey[],
): Array<{ year: number; journeys: Journey[] }> {
  const groups = new Map<number, Journey[]>()
  for (const journey of sortJourneysNewestFirst(journeys)) {
    const year = Number(journey.startDate.slice(0, 4))
    const list = groups.get(year) ?? []
    list.push(journey)
    groups.set(year, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, journeys: items }))
}

export function findJourney(data: TravelData, journeyId: string): Journey | undefined {
  return data.journeys.find((journey) => journey.id === journeyId)
}

export function getJourneyTrips(data: TravelData, journeyId: string) {
  return data.trips
    .filter((trip) => trip.journeyId === journeyId)
    .sort((a, b) => compareDate(a.date, b.date))
}

export function getJourneyVisits(data: TravelData, journeyId: string): Visit[] {
  return data.visits
    .filter((visit) => visit.journeyId === journeyId)
    .sort((a, b) => compareDate(a.arriveDate, b.arriveDate))
}

export function getOtherJourneyTrips(data: TravelData, journeyId: string) {
  return data.trips.filter((trip) => trip.journeyId !== journeyId)
}

export function getJourneyCoverSources(
  data: TravelData,
  journey: Journey,
): JourneyCoverSource[] {
  return journey.coverPhotos.flatMap((cover) => {
    const visit = data.visits.find((item) => item.id === cover.visitId)
    if (!visit || !visit.photos.some((photo) => photo.file === cover.file)) return []
    return [{ ...cover, visit }]
  })
}

export function getJourneyPhotoCount(data: TravelData, journeyId: string): number {
  return getJourneyVisits(data, journeyId)
    .reduce((total, visit) => total + visit.photos.length, 0)
}

export function getJourneyDestinationCityIds(
  data: TravelData,
  journeyId: string,
): string[] {
  const ids = new Set(
    getJourneyVisits(data, journeyId)
      .map((visit) => visit.city)
      .filter((cityId) => cityId !== data.meta.homeCity),
  )
  return [...ids]
}

export function summarizeJourney(data: TravelData, journey: Journey): JourneySummary {
  return {
    journey,
    tripCount: getJourneyTrips(data, journey.id).length,
    visitCount: getJourneyVisits(data, journey.id).length,
    destinationCityIds: getJourneyDestinationCityIds(data, journey.id),
    photoCount: getJourneyPhotoCount(data, journey.id),
    coverSources: getJourneyCoverSources(data, journey),
  }
}

export function scopeTravelData(data: TravelData, scope: JourneyScope): TravelData {
  if (scope.kind === 'archive') return data
  const journey = findJourney(data, scope.journeyId)
  if (!journey) {
    return { ...data, journeys: [], trips: [], visits: [] }
  }
  return {
    ...data,
    journeys: [journey],
    trips: data.trips.filter((trip) => trip.journeyId === journey.id),
    visits: data.visits.filter((visit) => visit.journeyId === journey.id),
  }
}

export function getHomeCity(data: TravelData): City | undefined {
  return resolveCity(data, data.meta.homeCity)
}

export function getJourneyCityMap(data: TravelData) {
  return resolveCities(data)
}
```

- [x] **Step 4: 运行旅程派生测试**

Run: `pnpm test -- src/lib/journeys.test.ts`

Expected: 6 个测试通过。

- [ ] **Step 5: 提交旅程范围层**

```bash
git add src/lib/journeys.ts src/lib/journeys.test.ts
git commit -m "feat: derive and scope journey data"
```

### Task A6: 实现导航状态机

**Files:**
- Create: `src/lib/navigation.ts`
- Create: `src/lib/navigation.test.ts`
- Create: `src/hooks/useTravelNavigation.ts`

- [x] **Step 1: 写状态切换矩阵测试**

```ts
// src/lib/navigation.test.ts
import { describe, expect, it } from 'vitest'
import {
  INITIAL_NAVIGATION_STATE,
  navigationReducer,
} from '@/lib/navigation'

describe('travel navigation reducer', () => {
  it('opens a journey and clears selection', () => {
    const next = navigationReducer(
      { ...INITIAL_NAVIGATION_STATE, selection: { kind: 'trip', tripId: 't001' } },
      { type: 'open-journey', journeyId: 'j001' },
    )
    expect(next).toEqual({
      scope: { kind: 'journey', journeyId: 'j001' },
      selection: { kind: 'none' },
      cardCityId: null,
    })
  })

  it('opens a visit chapter and keeps its city context', () => {
    const next = navigationReducer(INITIAL_NAVIGATION_STATE, {
      type: 'open-visit',
      visitId: 'v001',
      cityId: 'hangzhou',
    })
    expect(next.selection).toEqual({ kind: 'visit', visitId: 'v001' })
    expect(next.cardCityId).toBe('hangzhou')
  })

  it('does not keep a place card open for trip selection', () => {
    const next = navigationReducer(INITIAL_NAVIGATION_STATE, {
      type: 'open-trip',
      tripId: 't001',
    })
    expect(next.selection).toEqual({ kind: 'trip', tripId: 't001' })
    expect(next.cardCityId).toBeNull()
  })

  it('returns to archive and clears every lower layer', () => {
    const next = navigationReducer(
      {
        scope: { kind: 'journey', journeyId: 'j001' },
        selection: { kind: 'city', cityId: 'hangzhou' },
        cardCityId: 'hangzhou',
      },
      { type: 'open-archive' },
    )
    expect(next).toEqual(INITIAL_NAVIGATION_STATE)
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/navigation.test.ts`

Expected: FAIL，模块不存在。

- [x] **Step 3: 实现 reducer**

```ts
// src/lib/navigation.ts
import type { JourneyScope, Selection } from '@/types'

export interface TravelNavigationState {
  scope: JourneyScope
  selection: Selection
  cardCityId: string | null
}

export type TravelNavigationAction =
  | { type: 'open-archive' }
  | { type: 'open-journey'; journeyId: string }
  | { type: 'open-city'; cityId: string }
  | { type: 'open-visit'; visitId: string; cityId: string }
  | { type: 'open-trip'; tripId: string }
  | { type: 'close-place' }
  | { type: 'clear-selection' }

export const INITIAL_NAVIGATION_STATE: TravelNavigationState = {
  scope: { kind: 'archive' },
  selection: { kind: 'none' },
  cardCityId: null,
}

export function navigationReducer(
  state: TravelNavigationState,
  action: TravelNavigationAction,
): TravelNavigationState {
  switch (action.type) {
    case 'open-archive':
      return INITIAL_NAVIGATION_STATE
    case 'open-journey':
      return {
        scope: { kind: 'journey', journeyId: action.journeyId },
        selection: { kind: 'none' },
        cardCityId: null,
      }
    case 'open-city':
      return {
        ...state,
        selection: { kind: 'city', cityId: action.cityId },
        cardCityId: action.cityId,
      }
    case 'open-visit':
      return {
        ...state,
        selection: { kind: 'visit', visitId: action.visitId },
        cardCityId: action.cityId,
      }
    case 'open-trip':
      return {
        ...state,
        selection: { kind: 'trip', tripId: action.tripId },
        cardCityId: null,
      }
    case 'close-place':
    case 'clear-selection':
      return {
        ...state,
        selection: { kind: 'none' },
        cardCityId: null,
      }
  }
}
```

- [x] **Step 4: 新建导航 hook**

```ts
// src/hooks/useTravelNavigation.ts
import { useMemo, useReducer } from 'react'
import {
  INITIAL_NAVIGATION_STATE,
  navigationReducer,
} from '@/lib/navigation'

export function useTravelNavigation() {
  const [state, dispatch] = useReducer(navigationReducer, INITIAL_NAVIGATION_STATE)
  const actions = useMemo<TravelNavigationActions>(() => ({
    openArchive: () => dispatch({ type: 'open-archive' }),
    openJourney: (journeyId: string) =>
      dispatch({ type: 'open-journey', journeyId }),
    openCity: (cityId: string) => dispatch({ type: 'open-city', cityId }),
    openVisit: (visitId: string, cityId: string) =>
      dispatch({ type: 'open-visit', visitId, cityId }),
    openTrip: (tripId: string) => dispatch({ type: 'open-trip', tripId }),
    closePlace: () => dispatch({ type: 'close-place' }),
    clearSelection: () => dispatch({ type: 'clear-selection' }),
  }), [])

  return { state, actions }
}

export interface TravelNavigationActions {
  openArchive: () => void
  openJourney: (journeyId: string) => void
  openCity: (cityId: string) => void
  openVisit: (visitId: string, cityId: string) => void
  openTrip: (tripId: string) => void
  closePlace: () => void
  clearSelection: () => void
}
```

- [x] **Step 5: 运行导航测试与类型检查**

Run: `pnpm test -- src/lib/navigation.test.ts && pnpm exec tsc --noEmit`

Expected: 4 个测试通过；TypeScript 无错误。

- [ ] **Step 6: 提交导航状态机**

```bash
git add src/lib/navigation.ts src/lib/navigation.test.ts src/hooks/useTravelNavigation.ts
git commit -m "feat: add journey navigation state machine"
```

### Task A7: 实现旅行档案月台与年份抽屉

**Files:**
- Create: `src/components/journey/JourneyCard.tsx`
- Create: `src/components/journey/JourneyArchiveDrawer.tsx`
- Create: `src/components/journey/JourneyArchive.tsx`
- Create: `src/components/journey/JourneyArchive.test.tsx`

- [x] **Step 1: 写档案组件测试**

```tsx
// src/components/journey/JourneyArchive.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import JourneyArchive from '@/components/journey/JourneyArchive'

const data = dataJson as TravelData

describe('JourneyArchive', () => {
  it('shows newest journeys first and opens a journey', async () => {
    const onOpen = vi.fn()
    render(<JourneyArchive data={data} onOpenJourney={onOpen} />)

    const cards = screen.getAllByRole('button', { name: /打开旅程/ })
    expect(cards[0].getAttribute('aria-label')).toContain('成都慢夏')
    await userEvent.click(cards[0])
    expect(onOpen).toHaveBeenCalledWith('j002')
  })

  it('opens the all-journeys drawer grouped by year', async () => {
    render(<JourneyArchive data={data} onOpenJourney={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: '全部旅程' }))
    expect(screen.getByRole('dialog', { name: '全部旅程' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '2025' })).toBeTruthy()
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/journey/JourneyArchive.test.tsx`

Expected: FAIL，组件不存在。

- [x] **Step 3: 实现旅程卡**

```tsx
// src/components/journey/JourneyCard.tsx
import type { JourneySummary } from '@/lib/journeys'
import { photoThumbUrl } from '@/lib/derive'

interface Props {
  summary: JourneySummary
  featured?: boolean
  onOpen: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyCard({ summary, featured = false, onOpen }: Props) {
  const { journey, coverSources, destinationCityIds, photoCount, tripCount } = summary
  return (
    <button
      type="button"
      aria-label={`打开旅程：${journey.title}，${journey.startDate} 至 ${journey.endDate}`}
      onClick={onOpen}
      data-journey-theme={journey.theme}
      className={`rg-journey-card pointer-events-auto shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-[rgba(7,11,24,.82)] text-left shadow-[0_16px_50px_rgba(0,0,0,.42)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/25 ${
        featured ? 'w-[390px]' : 'w-[280px]'
      }`}
    >
      <div className={`grid gap-1 p-2 ${featured ? 'h-32 grid-cols-3' : 'h-24 grid-cols-2'}`}>
        {coverSources.length > 0 ? coverSources.slice(0, featured ? 3 : 2).map((cover, index) => (
          <img
            key={`${cover.visitId}:${cover.file}`}
            src={photoThumbUrl(cover.visitId, cover.file)}
            alt=""
            loading="lazy"
            className={`h-full w-full rounded-lg object-cover ${
              index === 0 && featured ? 'row-span-2' : ''
            }`}
          />
        )) : (
          <div className="col-span-full row-span-full rounded-lg bg-[radial-gradient(circle_at_65%_30%,rgba(103,232,249,.28),transparent_55%),linear-gradient(135deg,#0a1730,#07101f)] p-4">
            <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-100/55">
              {formatDate(journey.startDate)} — {formatDate(journey.endDate)}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-2">
        <time className="font-mono text-[10px] tracking-[0.16em] text-amber-100/60">
          {formatDate(journey.startDate)} — {formatDate(journey.endDate)}
        </time>
        <h3 className="mt-1 font-serif text-xl text-white">{journey.title}</h3>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-white/48">
          {journey.epigraph ?? journey.summary ?? '一段被重新点亮的旅程'}
        </p>
        <p className="mt-2 text-[10px] tracking-[0.12em] text-white/38">
          {destinationCityIds.length} 个地点 · {photoCount} 张照片 · {tripCount} 段交通
        </p>
      </div>
    </button>
  )
}
```

- [x] **Step 4: 实现年份抽屉**

```tsx
// src/components/journey/JourneyArchiveDrawer.tsx
import { useEffect, useRef } from 'react'
import type { Journey } from '@/types'
import { groupJourneysByYear } from '@/lib/journeys'

interface Props {
  journeys: Journey[]
  onOpenJourney: (journeyId: string) => void
  onClose: () => void
}

export default function JourneyArchiveDrawer({
  journeys,
  onOpenJourney,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const groups = groupJourneysByYear(journeys)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-[#02040b]/78 backdrop-blur-md" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="全部旅程"
        onClick={(event) => event.stopPropagation()}
        className="rg-drawer-in absolute inset-x-4 bottom-4 top-16 mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/12 bg-[rgba(6,9,20,.94)] shadow-[0_30px_120px_rgba(0,0,0,.7)]"
      >
        <header className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div>
            <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
            <h2 className="mt-1 font-serif text-2xl text-white">全部旅程</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="关闭全部旅程"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/65"
          >
            ×
          </button>
        </header>
        <div className="rg-scroll h-[calc(100%-82px)] overflow-y-auto px-6 py-5">
          {groups.map(({ year, journeys: yearJourneys }) => (
            <section key={year} className="mb-7">
              <h3 className="mb-3 font-mono text-sm tracking-[0.22em] text-amber-100/65">
                {year}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {yearJourneys.map((journey) => (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => onOpenJourney(journey.id)}
                    className="rounded-2xl border border-white/9 bg-white/[.035] p-4 text-left transition hover:border-cyan-200/30 hover:bg-white/[.06]"
                  >
                    <span className="font-mono text-[10px] text-white/40">
                      {journey.startDate.replaceAll('-', '.')} — {journey.endDate.replaceAll('-', '.')}
                    </span>
                    <span className="mt-1 block font-serif text-lg text-white">{journey.title}</span>
                    <span className="mt-1 block text-xs text-white/45">
                      {journey.epigraph ?? journey.summary ?? '返回这段旅程'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [x] **Step 5: 实现档案月台**

```tsx
// src/components/journey/JourneyArchive.tsx
import { useState } from 'react'
import type { TravelData } from '@/types'
import { sortJourneysNewestFirst, summarizeJourney } from '@/lib/journeys'
import JourneyCard from '@/components/journey/JourneyCard'
import JourneyArchiveDrawer from '@/components/journey/JourneyArchiveDrawer'

interface Props {
  data: TravelData
  onOpenJourney: (journeyId: string) => void
}

export default function JourneyArchive({ data, onOpenJourney }: Props) {
  const [allOpen, setAllOpen] = useState(false)
  const summaries = sortJourneysNewestFirst(data.journeys)
    .slice(0, 3)
    .map((journey) => summarizeJourney(data, journey))

  if (summaries.length === 0) {
    return (
      <section className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-white/10 bg-[rgba(6,9,20,.76)] p-6 text-center backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
        <h2 className="mt-2 font-serif text-2xl text-white">建立第一段旅程</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          在 trips.json 中新增 journeys 记录，并为交通与到访填写 journeyId。
        </p>
      </section>
    )
  }

  return (
    <>
      <section aria-label="旅行档案" className="pointer-events-auto">
        <div className="mb-2 flex items-end justify-between px-1">
          <div>
            <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
            <h2 className="mt-1 font-serif text-lg text-white">选择一段旅程，重新走一遍</h2>
          </div>
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs tracking-[0.12em] text-white/62 transition hover:border-white/25 hover:text-white"
          >
            全部旅程
          </button>
        </div>
        <div className="rg-scroll flex gap-3 overflow-x-auto pb-2">
          {summaries.map((summary, index) => (
            <JourneyCard
              key={summary.journey.id}
              summary={summary}
              featured={index === 0}
              onOpen={() => onOpenJourney(summary.journey.id)}
            />
          ))}
        </div>
      </section>
      {allOpen && (
        <JourneyArchiveDrawer
          journeys={data.journeys}
          onOpenJourney={(journeyId) => {
            setAllOpen(false)
            onOpenJourney(journeyId)
          }}
          onClose={() => setAllOpen(false)}
        />
      )}
    </>
  )
}
```

- [x] **Step 6: 运行档案组件测试**

Run: `pnpm test -- src/components/journey/JourneyArchive.test.tsx`

Expected: 2 个测试通过。

- [ ] **Step 7: 提交旅行档案**

```bash
git add src/components/journey/JourneyCard.tsx src/components/journey/JourneyArchiveDrawer.tsx src/components/journey/JourneyArchive.tsx src/components/journey/JourneyArchive.test.tsx
git commit -m "feat: add journey archive and year drawer"
```

### Task A8: 应用壳与范围化数据编排

**Files:**
- Create: `src/hooks/useScopedTravelData.ts`
- Create: `src/components/app/TravelWorkspace.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useTravelData.ts`
- Test: `src/hooks/useScopedTravelData.test.tsx`

- [x] **Step 1: 写范围 hook 测试**

```tsx
// src/hooks/useScopedTravelData.test.tsx
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { useScopedTravelData } from '@/hooks/useScopedTravelData'

const data = dataJson as TravelData

describe('useScopedTravelData', () => {
  it('derives only the active journey', () => {
    const { result } = renderHook(() =>
      useScopedTravelData(data, { kind: 'journey', journeyId: 'j002' }))
    expect(result.current.scopedData.trips.map((trip) => trip.id)).toEqual(['t004', 't005'])
    expect(result.current.timeline).toHaveLength(3)
    expect(result.current.stats.cityCount).toBe(1)
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/hooks/useScopedTravelData.test.tsx`

Expected: FAIL，hook 不存在。

- [x] **Step 3: 实现范围派生 hook**

```ts
// src/hooks/useScopedTravelData.ts
import { useMemo } from 'react'
import type { JourneyScope, TravelData } from '@/types'
import {
  buildTimelineNodes,
  computeStats,
  selectLitCities,
} from '@/lib/derive'
import { getHomeCity, scopeTravelData } from '@/lib/journeys'

export function useScopedTravelData(data: TravelData | null, scope: JourneyScope) {
  return useMemo(() => {
    if (!data) {
      return {
        scopedData: null,
        litCities: [],
        homeCity: undefined,
        timeline: [],
        stats: null,
      }
    }
    const scopedData = scopeTravelData(data, scope)
    return {
      scopedData,
      litCities: selectLitCities(scopedData),
      homeCity: getHomeCity(data),
      timeline: buildTimelineNodes(scopedData),
      stats: computeStats(scopedData),
    }
  }, [data, scope])
}
```

- [x] **Step 4: 将旅行数据 hook 改为严格版本 2**

```ts
// src/hooks/useTravelData.ts
import { useEffect, useState } from 'react'
import type { TravelData } from '@/types'
import tripsJson from '@/data/trips.json'
import {
  checkPhotoFiles,
  isTravelData,
  reportIssues,
  validateTravelData,
  type ValidationIssue,
} from '@/lib/validate'

export function useTravelData() {
  const [data] = useState<TravelData | null>(() =>
    isTravelData(tripsJson) ? tripsJson : null)
  const [issues, setIssues] = useState<ValidationIssue[]>([])

  useEffect(() => {
    if (!data) {
      const fatal: ValidationIssue[] = [{
        level: 'error',
        subject: 'trips.json',
        message: '顶层结构非法，应用不渲染任何旅行数据',
      }]
      setIssues(fatal)
      reportIssues(fatal)
      return
    }
    let cancelled = false
    const syncIssues = validateTravelData(data)
    setIssues(syncIssues)
    reportIssues(syncIssues)
    void checkPhotoFiles(data).then((photoIssues) => {
      if (cancelled || photoIssues.length === 0) return
      setIssues((current) => [...current, ...photoIssues])
      reportIssues(photoIssues)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  return {
    data,
    issues,
    hasErrors: issues.some((issue) => issue.level === 'error'),
  }
}
```

- [x] **Step 5: 实现应用壳**

```tsx
// src/App.tsx
import { useTravelData } from '@/hooks/useTravelData'
import TravelWorkspace from '@/components/app/TravelWorkspace'

export default function App() {
  const { data, hasErrors } = useTravelData()
  if (!data || hasErrors) {
    return (
      <main className="grid h-screen place-items-center bg-[#050811] font-sans text-white">
        <p className="rounded-2xl border border-red-300/20 bg-red-300/5 px-6 py-4 text-sm text-red-100/75">
          旅行数据校验失败，请打开控制台查看具体记录。
        </p>
      </main>
    )
  }
  return <TravelWorkspace data={data} />
}
```

- [x] **Step 6: 实现范围化工作区**

```tsx
// src/components/app/TravelWorkspace.tsx
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Starfield from '@/components/globe/Starfield'
import type { PickedRegion } from '@/components/globe/pickedRegion'
import CityCard from '@/components/city/CityCard'
import JourneyArchive from '@/components/journey/JourneyArchive'
import StatsPanel from '@/components/stats/StatsPanel'
import Timeline from '@/components/timeline/Timeline'
import { useTravelNavigation } from '@/hooks/useTravelNavigation'
import { useScopedTravelData } from '@/hooks/useScopedTravelData'
import { preloadGeoData } from '@/lib/geoLookup'
import { findTrip } from '@/lib/derive'
import { getOtherJourneyTrips } from '@/lib/journeys'
import { buildTracks, type Tracks } from '@/lib/tracks'
import type { ReplayRuntime } from '@/lib/replay'
import type { TravelData } from '@/types'

const TravelGlobe = lazy(() => import('@/components/globe/TravelGlobe'))
const EMPTY_TRACKS: Tracks = { flights: [], trains: [] }

interface Props {
  data: TravelData
}

export default function TravelWorkspace({ data }: Props) {
  const { state, actions } = useTravelNavigation()
  const { scopedData, litCities, homeCity, timeline, stats } =
    useScopedTravelData(data, state.scope)
  const tracks = useMemo(
    () => (scopedData ? buildTracks(scopedData) : EMPTY_TRACKS),
    [scopedData],
  )
  const [showOtherJourneys, setShowOtherJourneys] = useState(false)
  const activeJourneyId = state.scope.kind === 'journey' ? state.scope.journeyId : null
  const stardustTracks = useMemo(() => {
    if (!activeJourneyId || !showOtherJourneys) return EMPTY_TRACKS
    const otherTrips = getOtherJourneyTrips(data, activeJourneyId)
    return buildTracks({ ...data, trips: otherTrips, visits: [] })
  }, [activeJourneyId, data, showOtherJourneys])
  useEffect(() => {
    setShowOtherJourneys(false)
  }, [activeJourneyId])
  const [region, setRegion] = useState<PickedRegion | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [tripPlaybackSignal, setTripPlaybackSignal] = useState(0)
  const [replayRuntime, setReplayRuntime] = useState<ReplayRuntime | null>(null)

  useEffect(() => {
    const idle = (window as unknown as {
      requestIdleCallback?: (callback: () => void) => number
    }).requestIdleCallback
    if (idle) idle(() => preloadGeoData())
    else {
      const timer = setTimeout(preloadGeoData, 2500)
      return () => clearTimeout(timer)
    }
  }, [])

  const focusPoint = useMemo(() => {
    if (state.selection.kind !== 'trip') return null
    const track = [...tracks.flights, ...tracks.trains]
      .find((item) => item.trip.id === state.selection.tripId)
    return track ? {
      lat: (track.fromLat + track.toLat) / 2,
      lng: (track.fromLng + track.toLng) / 2,
    } : null
  }, [state.selection, tracks])

  const openJourney = (journeyId: string) => {
    setReplayRuntime(null)
    setRegion(null)
    setShowOtherJourneys(false)
    actions.openJourney(journeyId)
  }

  const openTimelineNode = (node: (typeof timeline)[number]) => {
    if (node.kind === 'visit') {
      actions.openVisit(node.refId, node.cityId)
      return
    }
    const trip = scopedData ? findTrip(scopedData, node.refId) : undefined
    if (trip) {
      actions.openTrip(trip.id)
      setTripPlaybackSignal((signal) => signal + 1)
    }
  }

  const resetOverview = useCallback(() => {
    actions.clearSelection()
    setRegion(null)
    setResetSignal((signal) => signal + 1)
  }, [actions])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans text-white select-none">
      <Starfield />
      <Suspense fallback={null}>
        <TravelGlobe
          litCities={litCities}
          tracks={tracks}
          stardustTracks={stardustTracks}
          selectedCityId={state.cardCityId}
          selectedTripId={state.selection.kind === 'trip' ? state.selection.tripId : null}
          focusPoint={focusPoint}
          tripPlaybackSignal={tripPlaybackSignal}
          replayRuntime={replayRuntime}
          resetSignal={resetSignal}
          onSelectCity={(cityId) => cityId && actions.openCity(cityId)}
          onSelectTrip={actions.openTrip}
          region={region}
          onPick={(next) => {
            setRegion(next)
            if (next) actions.clearSelection()
          }}
        />
      </Suspense>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
        <header className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={actions.openArchive}
            className="pointer-events-auto text-sm font-medium tracking-[0.3em] text-white/80"
          >
            我的旅行足迹
          </button>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <StatsPanel stats={stats} />
          </div>
        </header>

        <div className="flex-1" />

        <footer className="px-6 pb-5">
          {state.scope.kind === 'archive' ? (
            <JourneyArchive data={data} onOpenJourney={openJourney} />
          ) : scopedData ? (
            <Timeline
              key={state.scope.journeyId}
              data={scopedData}
              nodes={timeline}
              selection={state.selection}
              onSelect={openTimelineNode}
              onFinishPlayback={resetOverview}
              onPlaybackRuntimeChange={setReplayRuntime}
            />
          ) : null}
        </footer>
      </div>

      {scopedData && state.cardCityId && (
        <div className="pointer-events-none absolute bottom-40 left-0 top-0 z-20 flex items-center px-6">
          <CityCard
            data={scopedData}
            cityId={state.cardCityId}
            selection={state.selection}
            onSelectTrip={actions.openTrip}
            onClose={actions.closePlace}
          />
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 7: 运行 hook 测试与构建**

Run: `pnpm test -- src/hooks/useScopedTravelData.test.tsx && pnpm build`

Expected: hook 测试通过；构建成功。

- [ ] **Step 8: 提交应用壳**

```bash
git add src/App.tsx src/components/app/TravelWorkspace.tsx src/hooks/useScopedTravelData.ts src/hooks/useScopedTravelData.test.tsx src/hooks/useTravelData.ts
git commit -m "feat: scope travel workspace by journey"
```

### Task A9: 旅程护照、面包屑、章节轴与常居城市

**Files:**
- Create: `src/components/journey/JourneyBreadcrumb.tsx`
- Create: `src/components/journey/JourneyPassport.tsx`
- Create: `src/components/journey/JourneyChapterRail.tsx`
- Create: `src/components/journey/JourneyPassport.test.tsx`
- Modify: `src/components/globe/cityMarkers.ts`
- Modify: `src/components/globe/hooks/useGlobeMarkers.ts`
- Modify: `src/components/globe/hooks/useTrackPresentation.ts`
- Modify: `src/components/globe/TravelGlobe.tsx`
- Modify: `src/components/app/TravelWorkspace.tsx`
- Modify: `src/components/stats/StatsPanel.tsx`
- Modify: `src/lib/journeys.ts`
- Modify: `src/lib/journeys.test.ts`

- [x] **Step 1: 写旅程护照测试**

```tsx
// src/components/journey/JourneyPassport.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import JourneyPassport from '@/components/journey/JourneyPassport'

const data = dataJson as TravelData

describe('JourneyPassport', () => {
  it('shows journey title, dates and scoped metrics', () => {
    render(
      <JourneyPassport
        data={data}
        journey={data.journeys[0]}
        onStartReplay={() => undefined}
        showOtherJourneys={false}
        onShowOtherJourneysChange={() => undefined}
      />,
    )
    expect(screen.getByRole('heading', { name: '江南春行' })).toBeTruthy()
    expect(screen.getByText('2 个地点')).toBeTruthy()
    expect(screen.getByText('5 张照片')).toBeTruthy()
  })

  it('keeps other journeys off by default and exposes an explicit toggle', async () => {
    const onShowOtherJourneysChange = vi.fn()
    render(
      <JourneyPassport
        data={data}
        journey={data.journeys[0]}
        onStartReplay={() => undefined}
        showOtherJourneys={false}
        onShowOtherJourneysChange={onShowOtherJourneysChange}
      />,
    )
    const toggle = screen.getByRole('switch', { name: '显示其他旅程' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(toggle)
    expect(onShowOtherJourneysChange).toHaveBeenCalledWith(true)
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/journey/JourneyPassport.test.tsx`

Expected: FAIL，组件不存在。

- [x] **Step 3: 实现面包屑**

```tsx
// src/components/journey/JourneyBreadcrumb.tsx
import type { Journey, JourneyScope } from '@/types'

interface Props {
  scope: JourneyScope
  journey?: Journey
  placeName?: string
  onArchive: () => void
  onJourney: () => void
}

export default function JourneyBreadcrumb({
  scope,
  journey,
  placeName,
  onArchive,
  onJourney,
}: Props) {
  return (
    <nav aria-label="旅行层级" className="pointer-events-auto flex items-center gap-2 text-xs">
      <button type="button" onClick={onArchive} className="text-white/45 hover:text-white">
        旅行档案
      </button>
      {scope.kind === 'journey' && (
        <>
          <span aria-hidden className="text-white/20">/</span>
          <button type="button" onClick={onJourney} className="text-white/70 hover:text-white">
            {journey?.title ?? '旅程'}
          </button>
        </>
      )}
      {placeName && (
        <>
          <span aria-hidden className="text-white/20">/</span>
          <span aria-current="page" className="text-amber-100/80">{placeName}</span>
        </>
      )}
    </nav>
  )
}
```

- [x] **Step 4: 实现旅程护照**

```tsx
// src/components/journey/JourneyPassport.tsx
import type { Journey, TravelData } from '@/types'
import { photoThumbUrl } from '@/lib/derive'
import { summarizeJourney } from '@/lib/journeys'

interface Props {
  data: TravelData
  journey: Journey
  onStartReplay: () => void
  showOtherJourneys: boolean
  onShowOtherJourneysChange: (visible: boolean) => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyPassport({
  data,
  journey,
  onStartReplay,
  showOtherJourneys,
  onShowOtherJourneysChange,
}: Props) {
  const summary = summarizeJourney(data, journey)
  return (
    <aside className="pointer-events-auto w-[320px] rounded-2xl border border-white/12 bg-[rgba(6,10,22,.82)] p-4 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <p className="font-mono text-[10px] tracking-[0.2em] text-amber-100/60">
        {formatDate(journey.startDate)} — {formatDate(journey.endDate)}
      </p>
      <h2 className="mt-1 font-serif text-2xl text-white">{journey.title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-white/50">
        {journey.epigraph ?? journey.summary}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-white/8 py-3 text-center">
        <Metric value={summary.tripCount} label="段交通" />
        <Metric value={summary.visitCount} label="处停留" />
        <Metric value={summary.photoCount} label="张照片" />
      </div>
      <p className="mt-2 text-[10px] tracking-[0.12em] text-white/38">
        {summary.destinationCityIds.length} 个地点
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {summary.coverSources.slice(0, 5).map((cover) => (
          <img
            key={`${cover.visitId}:${cover.file}`}
            src={photoThumbUrl(cover.visitId, cover.file)}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-lg object-cover"
          />
        ))}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={showOtherJourneys}
        onClick={() => onShowOtherJourneysChange(!showOtherJourneys)}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-left text-[11px] text-white/52 transition hover:border-white/16 hover:text-white/75"
      >
        <span>显示其他旅程</span>
        <span
          aria-hidden
          className={`relative h-4 w-7 rounded-full transition ${
            showOtherJourneys ? 'bg-cyan-200/55' : 'bg-white/12'
          }`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#f5ead8] transition-transform ${
              showOtherJourneys ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
      <button
        type="button"
        onClick={onStartReplay}
        className="mt-4 w-full rounded-xl border border-cyan-200/25 bg-cyan-200/10 px-4 py-2.5 text-sm text-cyan-50 transition hover:bg-cyan-200/16"
      >
        开始旅程回放
      </button>
    </aside>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums text-white/88">{value}</div>
      <div className="text-[9px] tracking-[0.12em] text-white/35">{label}</div>
    </div>
  )
}
```

- [x] **Step 5: 实现章节轴包装**

```tsx
// src/components/journey/JourneyChapterRail.tsx
import type { TravelData } from '@/types'
import type { Selection } from '@/types'
import type { TimelineNode } from '@/lib/derive'
import type { ReplayRuntime } from '@/lib/replay'
import Timeline from '@/components/timeline/Timeline'

interface Props {
  data: TravelData
  nodes: TimelineNode[]
  selection: Selection
  startSignal: number
  onSelect: (node: TimelineNode) => void
  onFinishPlayback: () => void
  onPlaybackRuntimeChange: (runtime: ReplayRuntime) => void
}

export default function JourneyChapterRail(props: Props) {
  return (
    <section aria-label="当前旅程章节">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] tracking-[0.22em] text-amber-100/55">JOURNEY CHAPTERS</p>
        <p className="text-[10px] text-white/35">按日期从出发到归程</p>
      </div>
      <Timeline {...props} />
    </section>
  )
}
```

- [x] **Step 6: 扩展旅程摘要以包含里程**

```ts
// src/lib/journeys.ts
import { tripDistance } from '@/lib/geo'
import { resolveCities } from '@/lib/cities'

export interface JourneySummary {
  journey: Journey
  tripCount: number
  visitCount: number
  destinationCityIds: string[]
  photoCount: number
  distanceKm: number
  coverSources: JourneyCoverSource[]
}

export function getJourneyDistanceKm(data: TravelData, journeyId: string): number {
  const cityMap = resolveCities(data)
  return Math.round(getJourneyTrips(data, journeyId)
    .reduce((total, trip) => total + (tripDistance(trip, cityMap) ?? 0), 0))
}

export function summarizeJourney(data: TravelData, journey: Journey): JourneySummary {
  return {
    journey,
    tripCount: getJourneyTrips(data, journey.id).length,
    visitCount: getJourneyVisits(data, journey.id).length,
    destinationCityIds: getJourneyDestinationCityIds(data, journey.id),
    photoCount: getJourneyPhotoCount(data, journey.id),
    distanceKm: getJourneyDistanceKm(data, journey.id),
    coverSources: getJourneyCoverSources(data, journey),
  }
}
```

在 `journeys.test.ts` 增加：

```ts
expect(summary.distanceKm).toBeGreaterThan(0)
```

- [x] **Step 7: 增加常居城市标记**

```ts
// src/components/globe/cityMarkers.ts
export type GlobeMarker =
  | ({ kind: 'city' } & CityMarkerDatum)
  | ({ kind: 'home' } & HomeMarkerDatum)
  | ({ kind: 'region' } & RegionMarkerDatum)

export interface HomeMarkerDatum {
  id: string
  name: string
  lat: number
  lng: number
  labelVisible: boolean
}

export function buildHomeMarker(d: HomeMarkerDatum): HTMLElement {
  const el = document.createElement('div')
  el.dataset.homeCity = d.id
  el.style.cssText =
    'position:relative;width:0;height:0;transform:translate(-50%,-50%);pointer-events:none;'
  el.innerHTML = `
    <span style="position:absolute;left:50%;top:50%;width:20px;height:20px;
      transform:translate(-50%,-50%);border-radius:50%;
      border:1px solid rgba(245,234,216,.72);
      box-shadow:0 0 12px rgba(245,234,216,.28);"></span>
    <span style="position:absolute;left:50%;top:50%;width:9px;height:9px;
      transform:translate(-50%,-50%);border-radius:50%;
      border:1.5px solid rgba(245,234,216,.9);background:rgba(5,8,17,.85);"></span>
    <span style="position:absolute;left:50%;bottom:15px;transform:translateX(-50%);
      white-space:nowrap;color:rgba(245,234,216,.72);font-size:10px;
      letter-spacing:.12em;opacity:${d.labelVisible ? 1 : 0};">${d.name} · 常居</span>
  `
  return el
}
```

`useGlobeMarkers` 增加 `homeCity?: City`，在 `litCities` 后插入：

```ts
if (homeCity) {
  list.push({
    kind: 'home',
    id: homeCity.id,
    name: homeCity.name,
    lat: homeCity.lat,
    lng: homeCity.lng,
    labelVisible: zoomedIn,
  })
}
```

`TravelGlobe` 新增 `homeCity?: City` prop，并在 `htmlElement` 分支中：

```tsx
return m.kind === 'city'
  ? buildCityMarker(m, { onSelect: handleSelectCity, onHover: handleHoverCity })
  : m.kind === 'home'
    ? buildHomeMarker(m)
    : buildRegionDot(m)
```

- [x] **Step 8: 在工作区接入面包屑、护照与章节轴**

把 `TravelWorkspace` 中现有的 `useScopedTravelData` 解构替换为下面第一段代码，并在现有 state 声明后加入其中的新状态：

```tsx
const { scopedData, litCities, homeCity, timeline, stats } =
  useScopedTravelData(data, state.scope)
const journey = state.scope.kind === 'journey'
  ? data.journeys.find((item) => item.id === state.scope.journeyId)
  : undefined
const activePlaceName = state.cardCityId
  ? data.cities.find((city) => city.id === state.cardCityId)?.name
  : undefined
const [replayStartSignal, setReplayStartSignal] = useState(0)
const startJourneyReplay = () => {
  setReplayStartSignal((signal) => signal + 1)
}
```

把 header 完整替换为：

```tsx
<header className="flex items-center justify-between px-6 py-4">
  <JourneyBreadcrumb
    scope={state.scope}
    journey={journey}
    placeName={activePlaceName}
    onArchive={actions.openArchive}
    onJourney={actions.clearSelection}
  />
  <div className="flex items-center gap-3 text-xs text-white/50">
    <StatsPanel stats={stats} />
  </div>
</header>
```

把原来的空主内容区替换为：

```tsx
<div className="flex flex-1 items-start justify-end px-6 py-2">
  {journey && scopedData && (
    <JourneyPassport
      data={scopedData}
      journey={journey}
      onStartReplay={startJourneyReplay}
      showOtherJourneys={showOtherJourneys}
      onShowOtherJourneysChange={setShowOtherJourneys}
    />
  )}
</div>
```

把 footer 完整替换为：

```tsx
<footer className="px-6 pb-5">
  {state.scope.kind === 'archive' ? (
    <JourneyArchive data={data} onOpenJourney={openJourney} />
  ) : scopedData ? (
    <JourneyChapterRail
      key={state.scope.journeyId}
      data={scopedData}
      nodes={timeline}
      selection={state.selection}
      startSignal={replayStartSignal}
      onSelect={openTimelineNode}
      onFinishPlayback={resetOverview}
      onPlaybackRuntimeChange={setReplayRuntime}
    />
  ) : null}
</footer>
```

在 `TravelGlobe` props 中、`litCities={litCities}` 下一行加入：

```tsx
homeCity={homeCity}
```

- [x] **Step 9: 接入“显示其他旅程”的星尘层**

`TravelGlobe` 增加 `stardustTracks?: Tracks`，并把当前旅程轨迹与星尘轨迹分别传给
`useTrackPresentation`。星尘层只允许以低透明度出现在当前旅程视图中，不能复用
`litCities`、`selectedCityId` 或 `activeCityIds`。

`useTrackPresentation` 把两类轨迹包装成同一种展示项：

```ts
type FlightItem = {
  track: Tracks['flights'][number]
  stardust: boolean
}

const flightItems: FlightItem[] = [
  ...tracks.flights.map((track) => ({ track, stardust: false })),
  ...(stardustTracks?.flights ?? []).map((track) => ({ track, stardust: true })),
]
```

渲染规则固定为：

- 当前旅程轨迹保持原有颜色、粗细、hover 和点击行为；
- 星尘轨迹的 `arcColor` / `pathColor` 使用 6%–10% 不透明度，粗细约为当前轨迹的 1/3；
- 星尘轨迹的 `arcLabel` / `pathLabel` 返回空字符串；
- 星尘轨迹的 hover/click 回调直接返回，不改变 `Selection`；
- 回放进行中隐藏星尘轨迹，避免与当前旅程回放争夺视觉焦点；
- `JourneyPassport` 的开关从 `false` 开始；切换旅程时重置为 `false`；
- `litCities` 仍只来自 `scopedData`，星尘轨迹不生成城市标记、城市名称或统计。

在 `TravelGlobe` 根节点暴露 `data-visible-stardust-tracks`，供 A10 浏览器验收确认
开关状态和不可交互性。

在 `Timeline.tsx` 的 Props 增加 `startSignal: number`，并在解构参数中加入 `startSignal`：

```ts
interface Props {
  data: TravelData
  nodes: TimelineNodeModel[]
  selection: Selection
  startSignal: number
  onSelect: (node: TimelineNodeModel) => void
  onFinishPlayback: () => void
  onPlaybackRuntimeChange: (runtime: ReplayRuntime) => void
}
```

在 `Timeline` 的 playback 初始化后加入：

```tsx
useEffect(() => {
  if (startSignal === 0) return
  playback.start()
}, [playback.start, startSignal])
```

在 `useTimelinePlayback` 返回对象中加入 `start`：

```ts
return {
  status,
  speed,
  progress,
  activeIndex,
  seekRevision,
  isPlaying: status === 'playing',
  getPosition,
  start,
  toggle,
  stop,
  seek,
  setSpeed,
}
```

`JourneyChapterRail` 的 `Props` 增加 `startSignal: number` 并原样传给 `Timeline`。

- [x] **Step 10: 运行阶段 A 定向测试**

Run: `pnpm test -- src/lib/journeyData.test.ts src/lib/journeyValidation.test.ts src/lib/journeys.test.ts src/lib/navigation.test.ts src/hooks/useScopedTravelData.test.tsx src/components/journey/JourneyArchive.test.tsx src/components/journey/JourneyPassport.test.tsx`

Expected: 所有定向测试通过。

- [ ] **Step 11: 提交旅程视图**

```bash
git add src/components/journey src/components/globe/cityMarkers.ts src/components/globe/hooks/useGlobeMarkers.ts src/components/globe/hooks/useTrackPresentation.ts src/components/globe/TravelGlobe.tsx src/components/app/TravelWorkspace.tsx src/components/stats/StatsPanel.tsx src/lib/journeys.ts src/lib/journeys.test.ts
git commit -m "feat: add journey passport chapters and stardust"
```

### Task A10: 阶段 A 回归与数据闸门

**Files:**
- Modify: `docs/PLAN.md`
- Modify: `README.md`
- Test: 现有全部 Vitest 文件

- [x] **Step 1: 运行完整测试**

Run: `pnpm test`

Expected: 所有测试文件通过，无失败、无未处理异常。

- [x] **Step 2: 运行生产构建**

Run: `pnpm build`

Expected: TypeScript 与 Vite 构建成功；生成 `dist/`。

- [x] **Step 3: 浏览器验收旅程隔离**

Run: `pnpm dev`

依次检查：

1. 首页只显示旅行档案月台，不直接平铺 10 个全局节点。
2. 打开“江南春行”，地图只显示北京、杭州、上海、嘉兴参与的该旅程路线与杭州、上海地点。
3. 打开“成都慢夏”，地图只显示北京与成都路线和成都地点。
4. 北京以空心双环显示“常居”，不计入目的地数量。
5. 在两段旅程间快速切换后，旧城市卡片、旧轨迹高亮与旧回放不残留。
6. “显示其他旅程”默认关闭；开启后只出现 6%–10% 的其他轨迹，不能 hover、点击或改变统计；切换旅程后自动关闭。
7. 章节轴只显示当前旅程节点，回放结束回到当前旅程而非全局档案。

结果：2026-10-22 使用本地 Vite 页面完成桌面与 390px 验收，7 项均通过；桌面与移动端无横向溢出。

- [x] **Step 4: 记录 Gate A 结果**

在 `docs/PLAN.md` 的 v0.3 阶段 A 下记录日期、测试结果、构建结果和 7 项浏览器验收结论。在 README 增加 `journeys` 与 `journeyId` 的录入说明。

- [ ] **Step 5: 提交阶段 A**

```bash
git add docs/PLAN.md README.md
git commit -m "docs: record journey foundation acceptance"
```
