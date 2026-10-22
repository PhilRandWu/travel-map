# Photo Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在旅程数据边界之上实现四级照片资产、地点篇章、沉浸式回忆舞台、自动播放、缩放、回忆星图和 390px 最低可用布局。

**Architecture:** 先建立可预测的照片资产 URL 与纯数据回忆模型，再用独立 `MemoryOverlay` 管理舞台状态。地点篇章只读取当前旅程数据；舞台按当前、上一张缓存、下一张预加载控制图片；星图按视口挂载卡片，并在 390px 下降级为日期分组瀑布流。

**Tech Stack:** React 19、TypeScript、Sharp、Vitest、Testing Library、CSS、react-globe.gl 现有覆盖层。

---

## 执行约定

- 本计划中的 commit 是未来执行节点；本轮不提交 Git。
- 先写失败测试，再实现，再跑定向测试。
- 每个组件不超过约 220 行；超过时拆 hook 或子组件。
- 原图继续放在 `public/photos/<visitId>/<file>`，迁移不删除任何原图。

### Task B1: 生成四级照片资产

**Files:**
- Create: `scripts/build-photo-assets.mjs`
- Create: `src/lib/photoAssets.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Delete: `scripts/build-thumbs.mjs`
- Delete: `src/lib/thumbPipeline.test.ts`

- [ ] **Step 1: 写资产管线失败测试**

```ts
// src/lib/photoAssets.test.ts
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { TravelData } from '@/types'

const root = fileURLToPath(new URL('../..', import.meta.url))
const mediaRoot = join(root, 'public/media')
const data = JSON.parse(
  readFileSync(join(root, 'src/data/trips.json'), 'utf8'),
) as TravelData

describe('build:media', () => {
  it('generates blur, sm, md and preview variants', async () => {
    rmSync(mediaRoot, { recursive: true, force: true })
    mkdirSync(mediaRoot, { recursive: true })
    const stale = join(mediaRoot, 'stale.webp')
    writeFileSync(stale, '')

    execFileSync('node', ['scripts/build-photo-assets.mjs'], {
      cwd: root,
      stdio: 'pipe',
    })

    expect(existsSync(stale)).toBe(false)
    for (const visit of data.visits) {
      for (const photo of visit.photos) {
        const directory = join(mediaRoot, visit.id, photo.file)
        const widths = {
          blur: 32,
          'thumb-sm': 160,
          'thumb-md': 640,
          preview: 1600,
        } as const
        for (const [name, maxWidth] of Object.entries(widths)) {
          const output = join(directory, `${name}.webp`)
          expect(existsSync(output), output).toBe(true)
          const metadata = await sharp(output).metadata()
          expect(metadata.format).toBe('webp')
          expect(metadata.width).toBeGreaterThan(0)
          expect(metadata.width).toBeLessThanOrEqual(maxWidth)
        }
      }
    }
  }, 30_000)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/photoAssets.test.ts`

Expected: FAIL，脚本不存在。

- [ ] **Step 3: 实现 Sharp 四级资产管线**

```js
#!/usr/bin/env node
// scripts/build-photo-assets.mjs
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataFile = join(projectRoot, 'src/data/trips.json')
const photosRoot = join(projectRoot, 'public/photos')
const mediaRoot = join(projectRoot, 'public/media')

const VARIANTS = [
  { name: 'blur', width: 32, quality: 50 },
  { name: 'thumb-sm', width: 160, quality: 72 },
  { name: 'thumb-md', width: 640, quality: 78 },
  { name: 'preview', width: 1600, quality: 82 },
]

const isSafeSegment = (value) =>
  value.length > 0
  && value !== '.'
  && value !== '..'
  && !/[\\/]/.test(value)
  && !value.includes('\0')

function collectJobs(data) {
  if (!data || !Array.isArray(data.visits)) {
    throw new Error('trips.json 缺少 visits 数组')
  }
  const jobs = []
  const errors = []
  for (const visit of data.visits) {
    if (typeof visit?.id !== 'string' || !isSafeSegment(visit.id)) {
      errors.push(`到访 id 非法：${JSON.stringify(visit?.id)}`)
      continue
    }
    if (!Array.isArray(visit.photos)) {
      errors.push(`visit:${visit.id} 缺少 photos 数组`)
      continue
    }
    for (const photo of visit.photos) {
      if (typeof photo?.file !== 'string' || !isSafeSegment(photo.file)) {
        errors.push(`visit:${visit.id} 照片文件名非法：${JSON.stringify(photo?.file)}`)
        continue
      }
      const input = join(photosRoot, visit.id, photo.file)
      jobs.push({
        input,
        outputDirectory: join(mediaRoot, visit.id, photo.file),
        label: relative(projectRoot, input),
      })
    }
  }
  return { jobs, errors }
}

async function buildVariants(job) {
  try {
    await access(job.input)
  } catch {
    throw new Error(`缺少照片文件：${job.label}`)
  }
  await mkdir(job.outputDirectory, { recursive: true })
  for (const variant of VARIANTS) {
    const output = join(job.outputDirectory, `${variant.name}.webp`)
    try {
      await sharp(job.input, { failOn: 'error' })
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: variant.quality, effort: 5 })
        .toFile(output)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`处理失败：${job.label} → ${variant.name}（${message}）`)
    }
  }
}

async function main() {
  const data = JSON.parse(await readFile(dataFile, 'utf8'))
  const { jobs, errors } = collectJobs(data)
  await rm(mediaRoot, { recursive: true, force: true })
  await mkdir(mediaRoot, { recursive: true })

  for (const job of jobs) {
    try {
      await buildVariants(job)
    } catch (error) {
      errors.push(error.message)
    }
  }
  if (errors.length > 0) {
    console.error(`✕ 照片资产生成失败：${errors.length} 个问题`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }
  console.log(`✓ 已生成 ${jobs.length * VARIANTS.length} 个照片派生资产`)
}

main().catch((error) => {
  console.error(`✕ 照片资产生成失败：${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
})
```

- [ ] **Step 4: 切换构建脚本与忽略目录**

```json
{
  "scripts": {
    "dev": "pnpm build:media && vite",
    "build": "pnpm build:media && tsc --noEmit && vite build",
    "preview": "vite preview",
    "build:media": "node scripts/build-photo-assets.mjs",
    "build:thumbs": "pnpm build:media",
    "build:geo": "node scripts/build-geo.mjs",
    "test": "vitest run"
  }
}
```

```gitignore
/public/media/
```

删除 `scripts/build-thumbs.mjs` 与 `src/lib/thumbPipeline.test.ts`，不删除 `public/photos/`。

- [ ] **Step 5: 运行资产测试**

Run: `pnpm test -- src/lib/photoAssets.test.ts`

Expected: 1 个测试通过；每个原图生成 4 个 WebP。

- [ ] **Step 6: 提交资产管线**

```bash
git add package.json pnpm-lock.yaml .gitignore scripts/build-photo-assets.mjs src/lib/photoAssets.test.ts
git rm scripts/build-thumbs.mjs src/lib/thumbPipeline.test.ts
git commit -m "build: generate responsive photo assets"
```

### Task B2: 建立照片 URL 与类型契约

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/photoUrls.ts`
- Modify: `src/lib/derive.ts`
- Modify: `src/lib/photoUrls.test.ts`

- [ ] **Step 1: 写 URL 测试**

```ts
// src/lib/photoUrls.test.ts
import { describe, expect, it } from 'vitest'
import {
  photoObjectPosition,
  photoOriginalUrl,
  photoVariantUrl,
} from '@/lib/photoUrls'

describe('photo URLs', () => {
  it('maps all variants into encoded media directories', () => {
    expect(photoVariantUrl('v001', '01 西湖.svg', 'sm'))
      .toBe('/media/v001/01%20%E8%A5%BF%E6%B9%96.svg/thumb-sm.webp')
    expect(photoVariantUrl('v001', '01.svg', 'md'))
      .toBe('/media/v001/01.svg/thumb-md.webp')
    expect(photoVariantUrl('v001', '01.svg', 'preview'))
      .toBe('/media/v001/01.svg/preview.webp')
    expect(photoVariantUrl('v001', '01.svg', 'blur'))
      .toBe('/media/v001/01.svg/blur.webp')
  })

  it('keeps originals in the legacy photo directory', () => {
    expect(photoOriginalUrl('v001', '01.svg')).toBe('/photos/v001/01.svg')
  })

  it('converts focal points into CSS object-position', () => {
    expect(photoObjectPosition({ x: 0.25, y: 0.75 })).toBe('25% 75%')
    expect(photoObjectPosition(undefined)).toBe('50% 50%')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/photoUrls.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 定义跨阶段类型**

```ts
// src/types/index.ts
export type PhotoVariant = 'blur' | 'sm' | 'md' | 'preview'
export type MemoryMode = 'featured' | 'all'
export type MemoryView = 'stage' | 'constellation'

export type MemorySource =
  | { kind: 'visit'; visitId: string }
  | { kind: 'journey'; journeyId: string }
```

- [ ] **Step 4: 实现 URL 纯函数**

```ts
// src/lib/photoUrls.ts
import type { PhotoVariant } from '@/types'

const VARIANT_FILES: Record<PhotoVariant, string> = {
  blur: 'blur.webp',
  sm: 'thumb-sm.webp',
  md: 'thumb-md.webp',
  preview: 'preview.webp',
}

const segment = (value: string) => encodeURIComponent(value)

export function photoVariantUrl(
  visitId: string,
  file: string,
  variant: PhotoVariant,
): string {
  const base = import.meta.env.BASE_URL
  return `${base}media/${segment(visitId)}/${segment(file)}/${VARIANT_FILES[variant]}`
}

export function photoOriginalUrl(visitId: string, file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}photos/${segment(visitId)}/${segment(file)}`
}

export function photoObjectPosition(
  focalPoint?: { x: number; y: number },
): string {
  if (!focalPoint) return '50% 50%'
  return `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
}
```

- [ ] **Step 5: 让旧 URL helper 委托新模块**

```ts
// src/lib/derive.ts
import { photoOriginalUrl, photoVariantUrl } from '@/lib/photoUrls'

export function photoUrl(visitId: string, file: string): string {
  return photoOriginalUrl(visitId, file)
}

export function photoThumbUrl(visitId: string, file: string): string {
  return photoVariantUrl(visitId, file, 'sm')
}
```

- [ ] **Step 6: 运行 URL 测试**

Run: `pnpm test -- src/lib/photoUrls.test.ts src/lib/derive.test.ts`

Expected: 全部通过；小卡旧 helper 自动切为 160px。

- [ ] **Step 7: 提交 URL 契约**

```bash
git add src/types/index.ts src/lib/photoUrls.ts src/lib/derive.ts src/lib/photoUrls.test.ts
git commit -m "feat: define responsive photo URL contract"
```

### Task B3: 构建回忆照片与章节模型

**Files:**
- Create: `src/lib/memory.ts`
- Test: `src/lib/memory.test.ts`

- [ ] **Step 1: 写回忆模型测试**

```ts
// src/lib/memory.test.ts
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData, Visit } from '@/types'
import {
  buildMemoryCollection,
  filterMemoryPhotos,
} from '@/lib/memory'

const data = dataJson as TravelData

describe('memory collection', () => {
  it('builds a journey collection grouped by visit chapter', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    expect(collection.photos).toHaveLength(5)
    expect(collection.chapters.map((chapter) => chapter.visitId)).toEqual(['v001', 'v002'])
    expect(collection.hasFeatured).toBe(true)
  })

  it('filters featured photos while preserving source order', () => {
    const collection = buildMemoryCollection(data, { kind: 'visit', visitId: 'v001' })
    expect(filterMemoryPhotos(collection, 'all').map((photo) => photo.file))
      .toEqual(['01.svg', '02.svg', '03.svg'])
    expect(filterMemoryPhotos(collection, 'featured').map((photo) => photo.file))
      .toEqual(['01.svg', '02.svg'])
  })

  it('keeps separate chapters for the same city in different visits', () => {
    const cloned = structuredClone(data)
    const repeated: Visit = {
      ...cloned.visits[0],
      id: 'v-repeat',
      arriveDate: '2025-05-04',
      leaveDate: '2025-05-04',
      photos: [{ ...cloned.visits[0].photos[0], file: 'repeat.svg' }],
    }
    cloned.visits.push(repeated)
    const collection = buildMemoryCollection(cloned, { kind: 'journey', journeyId: 'j001' })
    expect(collection.chapters.filter((chapter) => chapter.cityId === 'hangzhou'))
      .toHaveLength(2)
  })

  it('places untimed photos after timed photos while preserving their own order', () => {
    const cloned = structuredClone(data)
    cloned.visits[0].photos = [
      { file: 'unknown-a.svg' },
      { file: 'late.svg', takenAt: '2025-05-02T18:00:00+08:00' },
      { file: 'unknown-b.svg' },
      { file: 'early.svg', takenAt: '2025-05-01T08:00:00+08:00' },
    ]
    const collection = buildMemoryCollection(cloned, { kind: 'visit', visitId: 'v001' })
    expect(collection.photos.map((photo) => photo.file))
      .toEqual(['early.svg', 'late.svg', 'unknown-a.svg', 'unknown-b.svg'])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/memory.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现回忆模型**

```ts
// src/lib/memory.ts
import type { MemoryMode, MemorySource, TravelData, Visit } from '@/types'
import { resolveCity } from '@/lib/cities'
import { compareDate } from '@/lib/validate'

export interface MemoryPhoto {
  key: string
  visitId: string
  journeyId: string
  chapterKey: string
  cityId: string
  cityName: string
  file: string
  caption?: string
  takenAt?: string
  featured: boolean
  focalPoint?: { x: number; y: number }
  timeUnknown: boolean
  sourceIndex: number
}

export interface MemoryChapter {
  key: string
  visitId: string
  journeyId: string
  cityId: string
  cityName: string
  arriveDate: string
  leaveDate: string
  photos: MemoryPhoto[]
}

export interface MemoryCollection {
  source: MemorySource
  photos: MemoryPhoto[]
  chapters: MemoryChapter[]
  hasFeatured: boolean
}

function sourceVisits(data: TravelData, source: MemorySource): Visit[] {
  return data.visits
    .filter((visit) => source.kind === 'visit'
      ? visit.id === source.visitId
      : visit.journeyId === source.journeyId)
    .sort((a, b) =>
      compareDate(a.arriveDate, b.arriveDate) || a.id.localeCompare(b.id))
}

function sortVisitPhotos(visit: Visit, cityName: string): MemoryPhoto[] {
  const photos = visit.photos.map((photo, sourceIndex): MemoryPhoto => ({
    key: `${visit.id}:${photo.file}`,
    visitId: visit.id,
    journeyId: visit.journeyId,
    chapterKey: visit.id,
    cityId: visit.city,
    cityName,
    file: photo.file,
    caption: photo.caption,
    takenAt: photo.takenAt,
    featured: photo.featured === true,
    focalPoint: photo.focalPoint,
    timeUnknown: !photo.takenAt,
    sourceIndex,
  }))
  return photos.sort((a, b) => {
    if (a.takenAt && b.takenAt) {
      return a.takenAt.localeCompare(b.takenAt) || a.sourceIndex - b.sourceIndex
    }
    if (a.takenAt) return -1
    if (b.takenAt) return 1
    return a.sourceIndex - b.sourceIndex
  })
}

export function buildMemoryCollection(
  data: TravelData,
  source: MemorySource,
): MemoryCollection {
  const chapters = sourceVisits(data, source).map((visit): MemoryChapter => {
    const cityName = resolveCity(data, visit.city)?.name ?? visit.city
    return {
      key: visit.id,
      visitId: visit.id,
      journeyId: visit.journeyId,
      cityId: visit.city,
      cityName,
      arriveDate: visit.arriveDate,
      leaveDate: visit.leaveDate,
      photos: sortVisitPhotos(visit, cityName),
    }
  })
  const photos = chapters.flatMap((chapter) => chapter.photos)
  return {
    source,
    photos,
    chapters,
    hasFeatured: photos.some((photo) => photo.featured),
  }
}

export function filterMemoryPhotos(
  collection: MemoryCollection,
  mode: MemoryMode,
): MemoryPhoto[] {
  if (mode === 'featured' && collection.hasFeatured) {
    return collection.photos.filter((photo) => photo.featured)
  }
  return collection.photos
}

export function initialMemoryMode(collection: MemoryCollection): MemoryMode {
  return collection.hasFeatured ? 'featured' : 'all'
}

export function clampMemoryIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(count - 1, Math.max(0, index))
}
```

- [ ] **Step 4: 运行回忆模型测试**

Run: `pnpm test -- src/lib/memory.test.ts`

Expected: 4 个测试通过。

- [ ] **Step 5: 提交回忆模型**

```bash
git add src/lib/memory.ts src/lib/memory.test.ts
git commit -m "feat: build memory chapters and photo ordering"
```

### Task B4: 实现 MemoryOverlay 状态

**Files:**
- Create: `src/lib/memoryState.ts`
- Create: `src/lib/memoryState.test.ts`
- Create: `src/hooks/useMemoryOverlay.ts`

- [ ] **Step 1: 写 overlay reducer 测试**

```ts
// src/lib/memoryState.test.ts
import { describe, expect, it } from 'vitest'
import { memoryOverlayReducer, type MemoryOverlay } from '@/lib/memoryState'

const closed: MemoryOverlay = { status: 'closed' }

describe('memory overlay reducer', () => {
  it('opens stage with mode and index', () => {
    const next = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'featured',
      view: 'stage',
      photoIndex: 1,
    })
    expect(next).toEqual({
      status: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'featured',
      view: 'stage',
      photoIndex: 1,
    })
  })

  it('switches view without losing photo index', () => {
    const open = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'journey', journeyId: 'j001' },
      mode: 'all',
      view: 'stage',
      photoIndex: 3,
    })
    const next = memoryOverlayReducer(open, { type: 'set-view', view: 'constellation' })
    expect(next.status === 'open' && next.photoIndex).toBe(3)
  })

  it('closes to a completely empty overlay', () => {
    const open = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'all',
      view: 'stage',
      photoIndex: 0,
    })
    expect(memoryOverlayReducer(open, { type: 'close' })).toEqual(closed)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/memoryState.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 reducer**

```ts
// src/lib/memoryState.ts
import type { MemoryMode, MemorySource, MemoryView } from '@/types'
import { clampMemoryIndex } from '@/lib/memory'

export interface MemoryOverlayClosed {
  status: 'closed'
}

export interface MemoryOverlayOpen {
  status: 'open'
  source: MemorySource
  mode: MemoryMode
  view: MemoryView
  photoIndex: number
}

export type MemoryOverlay = MemoryOverlayClosed | MemoryOverlayOpen

export type MemoryOverlayAction =
  | {
      type: 'open'
      source: MemorySource
      mode: MemoryMode
      view: MemoryView
      photoIndex: number
    }
  | { type: 'close' }
  | { type: 'set-mode'; mode: MemoryMode; photoIndex: number }
  | { type: 'set-view'; view: MemoryView }
  | { type: 'set-photo'; photoIndex: number; photoCount: number }

export const CLOSED_MEMORY_OVERLAY: MemoryOverlay = { status: 'closed' }

export function memoryOverlayReducer(
  state: MemoryOverlay,
  action: MemoryOverlayAction,
): MemoryOverlay {
  switch (action.type) {
    case 'open':
      return {
        status: 'open',
        source: action.source,
        mode: action.mode,
        view: action.view,
        photoIndex: Math.max(0, action.photoIndex),
      }
    case 'close':
      return CLOSED_MEMORY_OVERLAY
    case 'set-mode':
      return state.status === 'open'
        ? { ...state, mode: action.mode, photoIndex: Math.max(0, action.photoIndex) }
        : state
    case 'set-view':
      return state.status === 'open' ? { ...state, view: action.view } : state
    case 'set-photo':
      return state.status === 'open'
        ? { ...state, photoIndex: clampMemoryIndex(action.photoIndex, action.photoCount) }
        : state
  }
}
```

- [ ] **Step 4: 实现 hook 与焦点返回**

```ts
// src/hooks/useMemoryOverlay.ts
import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { MemoryMode, MemorySource, MemoryView } from '@/types'
import {
  CLOSED_MEMORY_OVERLAY,
  memoryOverlayReducer,
} from '@/lib/memoryState'

interface OpenOptions {
  mode: MemoryMode
  view: MemoryView
  photoIndex: number
}

export function useMemoryOverlay(scopeKey: string) {
  const [overlay, dispatch] = useReducer(memoryOverlayReducer, CLOSED_MEMORY_OVERLAY)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const open = useCallback((source: MemorySource, options: OpenOptions) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    dispatch({ type: 'open', source, ...options })
  }, [])

  const close = useCallback(() => {
    dispatch({ type: 'close' })
    requestAnimationFrame(() => returnFocusRef.current?.focus())
  }, [])

  useEffect(() => {
    if (overlay.status === 'closed') return
    close()
    // scope 改变时关闭旧照片，下一次打开会记录新的焦点入口
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey])

  return {
    overlay,
    open,
    close,
    setMode: (mode: MemoryMode, photoIndex: number) =>
      dispatch({ type: 'set-mode', mode, photoIndex }),
    setView: (view: MemoryView) => dispatch({ type: 'set-view', view }),
    setPhotoIndex: (photoIndex: number, photoCount: number) =>
      dispatch({ type: 'set-photo', photoIndex, photoCount }),
  }
}
```

- [ ] **Step 5: 运行状态测试**

Run: `pnpm test -- src/lib/memoryState.test.ts`

Expected: 3 个测试通过。

- [ ] **Step 6: 提交回忆状态**

```bash
git add src/lib/memoryState.ts src/lib/memoryState.test.ts src/hooks/useMemoryOverlay.ts
git commit -m "feat: add memory overlay state"
```

### Task B5: 旅程封面拼图与回退封面

**Files:**
- Create: `src/components/journey/JourneyCoverMosaic.tsx`
- Create: `src/components/journey/JourneyCoverMosaic.test.tsx`
- Modify: `src/components/journey/JourneyCard.tsx`
- Modify: `src/components/journey/JourneyPassport.tsx`

- [ ] **Step 1: 写封面测试**

```tsx
// src/components/journey/JourneyCoverMosaic.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JourneyCoverPhoto } from '@/types'
import JourneyCoverMosaic from '@/components/journey/JourneyCoverMosaic'

describe('JourneyCoverMosaic', () => {
  it('renders up to five cover photos with md assets', () => {
    const covers: JourneyCoverPhoto[] = Array.from({ length: 6 }, (_, index) => ({
      visitId: 'v001',
      file: `${index + 1}.svg`,
    }))
    const { container } = render(
      <JourneyCoverMosaic covers={covers} title="江南春行" theme="cyan" />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(5)
    expect(container.querySelector('img')?.getAttribute('src'))
      .toContain('/media/v001/1.svg/thumb-md.webp')
  })

  it('renders a generated route cover without photos', () => {
    render(<JourneyCoverMosaic covers={[]} title="江南春行" theme="cyan" />)
    expect(screen.getByText('江南春行')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/journey/JourneyCoverMosaic.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现封面组件**

```tsx
// src/components/journey/JourneyCoverMosaic.tsx
import type { JourneyCoverPhoto, JourneyTheme } from '@/types'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  covers: JourneyCoverPhoto[]
  title: string
  theme: JourneyTheme
  large?: boolean
}

export default function JourneyCoverMosaic({
  covers,
  title,
  theme,
  large = false,
}: Props) {
  const visible = covers.slice(0, 5)
  if (visible.length === 0) {
    return (
      <div
        data-journey-theme={theme}
        className="relative flex h-full min-h-24 items-end overflow-hidden rounded-xl bg-[radial-gradient(circle_at_70%_20%,rgba(103,232,249,.22),transparent_50%),linear-gradient(135deg,#0b1730,#060b16)] p-3"
      >
        <svg aria-hidden viewBox="0 0 200 80" className="absolute inset-0 h-full w-full opacity-55">
          <path d="M-10 66 C40 18, 82 72, 122 34 S182 18, 216 42" fill="none" stroke="rgba(245,234,216,.32)" strokeWidth="1" />
          <circle cx="28" cy="47" r="3" fill="rgba(251,191,36,.9)" />
          <circle cx="122" cy="34" r="3" fill="rgba(103,232,249,.9)" />
        </svg>
        <span className="relative font-serif text-lg text-white/85">{title}</span>
      </div>
    )
  }

  return (
    <div
      data-journey-theme={theme}
      className={`grid h-full gap-1 overflow-hidden rounded-xl ${
        large ? 'grid-cols-4 grid-rows-2' : 'grid-cols-3 grid-rows-2'
      }`}
    >
      {visible.map((cover, index) => (
        <img
          key={`${cover.visitId}:${cover.file}`}
          src={photoVariantUrl(cover.visitId, cover.file, 'md')}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover ${
            index === 0 ? 'col-span-2 row-span-2' : ''
          }`}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: 在旅程卡与护照中复用**

`JourneyCard` 删除内联图片网格，改为：

```tsx
<div className={featured ? 'h-32 p-2' : 'h-24 p-2'}>
  <JourneyCoverMosaic
    covers={summary.coverSources.map(({ visitId, file }) => ({ visitId, file }))}
    title={journey.title}
    theme={journey.theme}
    large={featured}
  />
</div>
```

`JourneyPassport` 使用同样的 `JourneyCoverMosaic`，高度设为 `h-36`，不再自行渲染封面 `<img>`。

- [ ] **Step 5: 运行封面测试**

Run: `pnpm test -- src/components/journey/JourneyCoverMosaic.test.tsx src/components/journey/JourneyArchive.test.tsx src/components/journey/JourneyPassport.test.tsx`

Expected: 全部通过。

- [ ] **Step 6: 提交封面拼图**

```bash
git add src/components/journey/JourneyCoverMosaic.tsx src/components/journey/JourneyCoverMosaic.test.tsx src/components/journey/JourneyCard.tsx src/components/journey/JourneyPassport.tsx
git commit -m "feat: add journey cover mosaics"
```

### Task B6: 实现地点篇章

**Files:**
- Create: `src/components/journey/PlaceChapter.tsx`
- Create: `src/components/journey/PlaceChapter.test.tsx`

- [ ] **Step 1: 写地点篇章测试**

```tsx
// src/components/journey/PlaceChapter.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import PlaceChapter from '@/components/journey/PlaceChapter'

const data = dataJson as TravelData

describe('PlaceChapter', () => {
  it('shows the active visit collage and opens its memory', async () => {
    const onOpenMemory = vi.fn()
    render(
      <PlaceChapter
        data={data}
        cityId="hangzhou"
        activeVisitId="v001"
        selection={{ kind: 'visit', visitId: 'v001' }}
        onSelectVisit={() => undefined}
        onSelectTrip={() => undefined}
        onOpenMemory={onOpenMemory}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('heading', { name: '杭州' })).toBeTruthy()
    expect(screen.getByAltText('西湖暮色')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: '进入照片回忆' }))
    expect(onOpenMemory).toHaveBeenCalledWith({ kind: 'visit', visitId: 'v001' }, 0)
  })

  it('disables the memory action when the visit has no photos', () => {
    const cloned = structuredClone(data)
    cloned.visits[0].photos = []
    render(
      <PlaceChapter
        data={cloned}
        cityId="hangzhou"
        activeVisitId="v001"
        selection={{ kind: 'city', cityId: 'hangzhou' }}
        onSelectVisit={() => undefined}
        onSelectTrip={() => undefined}
        onOpenMemory={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: '暂无照片' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/journey/PlaceChapter.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现地点篇章**

```tsx
// src/components/journey/PlaceChapter.tsx
import { useMemo } from 'react'
import type { MemorySource, Selection, TravelData } from '@/types'
import { getCityTrips, getCityVisits } from '@/lib/derive'
import { resolveCity, resolveCities } from '@/lib/cities'
import { photoObjectPosition, photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  data: TravelData
  cityId: string
  activeVisitId?: string
  selection: Selection
  onSelectVisit: (visitId: string, cityId: string) => void
  onSelectTrip: (tripId: string) => void
  onOpenMemory: (source: MemorySource, photoIndex: number) => void
  onClose: () => void
}

const date = (value: string) => value.replaceAll('-', '.')

export default function PlaceChapter({
  data,
  cityId,
  activeVisitId,
  selection,
  onSelectVisit,
  onSelectTrip,
  onOpenMemory,
  onClose,
}: Props) {
  const city = resolveCity(data, cityId)
  const cities = useMemo(() => resolveCities(data), [data])
  const visits = useMemo(() => getCityVisits(data, cityId), [data, cityId])
  const trips = useMemo(() => getCityTrips(data, cityId), [data, cityId])
  const active = visits.find((visit) => visit.id === activeVisitId) ?? visits.at(-1)
  const hero = active?.photos.find((photo) => photo.featured) ?? active?.photos[0]
  const auxiliaries = active?.photos.filter((photo) => photo !== hero).slice(0, 4) ?? []
  const selectedTripId = selection.kind === 'trip' ? selection.tripId : null

  if (!city) return null

  return (
    <aside
      aria-label={`${city.name}地点篇章`}
      className="rg-card-in pointer-events-auto flex max-h-[min(calc(100vh-12rem),720px)] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(8,11,22,.84)] shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3.5">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-amber-100/45">PLACE CHAPTER</p>
          <h2 className="mt-1 font-serif text-2xl text-white">{city.name}</h2>
          <p className="text-[11px] tracking-wide text-white/42">
            {city.province} · {city.country}
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭地点篇章"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/60"
        >
          ×
        </button>
      </header>

      <div className="rg-scroll flex-1 overflow-y-auto px-4 py-3">
        {visits.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5" aria-label="到访日期">
            {visits.map((visit) => (
              <button
                key={visit.id}
                type="button"
                aria-pressed={visit.id === active?.id}
                onClick={() => onSelectVisit(visit.id, cityId)}
                className={`rounded-full border px-2.5 py-1.5 font-mono text-[10px] ${
                  visit.id === active?.id
                    ? 'border-amber-200/35 bg-amber-200/10 text-amber-50'
                    : 'border-white/9 text-white/42'
                }`}
              >
                {date(visit.arriveDate)}
              </button>
            ))}
          </div>
        )}

        {active && (
          <>
            <p className="font-mono text-[10px] tracking-[0.14em] text-white/45">
              {date(active.arriveDate)} — {date(active.leaveDate)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {active.note ?? '这一天，在这里停留。'}
            </p>

            {hero ? (
              <div className="mt-3 grid h-44 grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-xl">
                <img
                  src={photoVariantUrl(active.id, hero.file, 'md')}
                  alt={hero.caption ?? `${city.name}主图`}
                  style={{ objectPosition: photoObjectPosition(hero.focalPoint) }}
                  className="col-span-2 row-span-2 h-full w-full object-cover"
                />
                {auxiliaries.map((photo) => (
                  <img
                    key={photo.file}
                    src={photoVariantUrl(active.id, photo.file, 'md')}
                    alt={photo.caption ?? ''}
                    loading="lazy"
                    style={{ objectPosition: photoObjectPosition(photo.focalPoint) }}
                    className="h-full w-full object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 grid h-32 place-items-center rounded-xl border border-white/8 bg-white/[.025] font-serif text-3xl text-white/25">
                {city.name.slice(0, 1)}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.12em] text-white/35">
                {active.photos.length} 张照片
              </span>
              <button
                type="button"
                disabled={active.photos.length === 0}
                onClick={() => onOpenMemory({ kind: 'visit', visitId: active.id }, 0)}
                className="rounded-xl border border-cyan-200/22 bg-cyan-200/8 px-4 py-2 text-xs text-cyan-50 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {active.photos.length === 0 ? '暂无照片' : '进入照片回忆'}
              </button>
            </div>
          </>
        )}

        {trips.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-[10px] tracking-[0.2em] text-white/35">相关交通</h3>
            <div className="space-y-1.5">
              {trips.map((trip) => {
                const route = [trip.from, ...trip.waypoints, trip.to]
                  .map((id) => cities.get(id)?.name ?? id)
                  .join(' → ')
                return (
                  <button
                    key={trip.id}
                    type="button"
                    aria-pressed={trip.id === selectedTripId}
                    onClick={() => onSelectTrip(trip.id)}
                    className={`block w-full rounded-xl border px-3 py-2 text-left text-xs ${
                      trip.id === selectedTripId
                        ? 'border-cyan-200/35 bg-cyan-200/8 text-cyan-50'
                        : 'border-white/8 bg-white/[.025] text-white/58'
                    }`}
                  >
                    <span className="font-mono text-[9px] text-white/35">
                      {date(trip.date)}
                    </span>
                    <span className="mt-0.5 block">{route}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: 运行地点篇章测试**

Run: `pnpm test -- src/components/journey/PlaceChapter.test.tsx`

Expected: 2 个测试通过。

- [ ] **Step 5: 提交地点篇章**

```bash
git add src/components/journey/PlaceChapter.tsx src/components/journey/PlaceChapter.test.tsx
git commit -m "feat: add place chapters"
```

### Task B7: 实现回忆舞台核心与键盘闭环

**Files:**
- Create: `src/components/memory/MemoryToolbar.tsx`
- Create: `src/components/memory/MemoryPhoto.tsx`
- Create: `src/components/memory/MemoryFilmstrip.tsx`
- Create: `src/components/memory/MemoryStage.tsx`
- Create: `src/components/memory/MemoryStage.test.tsx`
- Create: `src/hooks/useFocusTrap.ts`
- Modify: `src/components/app/TravelWorkspace.tsx`
- Modify: `src/components/journey/JourneyPassport.tsx`

- [ ] **Step 1: 写舞台测试**

```tsx
// src/components/memory/MemoryStage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildMemoryCollection } from '@/lib/memory'
import MemoryStage from '@/components/memory/MemoryStage'

const data = dataJson as TravelData

describe('MemoryStage', () => {
  it('switches photos and closes with Escape', async () => {
    const collection = buildMemoryCollection(data, { kind: 'visit', visitId: 'v001' })
    const onClose = vi.fn()
    function Harness() {
      const [index, setIndex] = useState(0)
      return (
        <>
          <button type="button" onClick={() => undefined}>照片入口</button>
          {index < 100 && (
            <MemoryStage
              collection={collection}
              mode="all"
              view="stage"
              photoIndex={index}
              onPhotoIndex={setIndex}
              onMode={() => undefined}
              onView={() => undefined}
              onClose={onClose}
            />
          )}
        </>
      )
    }
    render(<Harness />)
    await waitFor(() => expect(screen.getByRole('dialog', { name: /照片回忆/ })).toBeTruthy())
    await userEvent.click(screen.getByRole('button', { name: '下一张' }))
    expect(screen.getByText('西湖暮色')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/memory/MemoryStage.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现焦点陷阱**

```ts
// src/hooks/useFocusTrap.ts
import { useEffect, type RefObject } from 'react'

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const elements = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
    elements[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => root.removeEventListener('keydown', onKeyDown)
  }, [ref])
}
```

- [ ] **Step 4: 实现舞台子组件**

```tsx
// src/components/memory/MemoryToolbar.tsx
import type { MemoryMode, MemoryView } from '@/types'

interface Props {
  mode: MemoryMode
  view: MemoryView
  hasFeatured: boolean
  onMode: (mode: MemoryMode) => void
  onView: (view: MemoryView) => void
  onClose: () => void
}

export default function MemoryToolbar({
  mode,
  view,
  hasFeatured,
  onMode,
  onView,
  onClose,
}: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-4 text-[#f5ead8]">
      <div className="flex items-center gap-2">
        {hasFeatured && (
          <>
            <button type="button" aria-pressed={mode === 'featured'} onClick={() => onMode('featured')}>
              精选
            </button>
            <button type="button" aria-pressed={mode === 'all'} onClick={() => onMode('all')}>
              全部
            </button>
          </>
        )}
        <button type="button" aria-pressed={view === 'constellation'} onClick={() => onView('constellation')}>
          回忆星图
        </button>
        <button type="button" aria-pressed={view === 'stage'} onClick={() => onView('stage')}>
          逐张回忆
        </button>
      </div>
      <button type="button" onClick={onClose}>关闭</button>
    </header>
  )
}
```

```tsx
// src/components/memory/MemoryPhoto.tsx
import type { MemoryPhoto as MemoryPhotoModel } from '@/lib/memory'
import { photoObjectPosition, photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  photo: MemoryPhotoModel
  direction: 'next' | 'previous' | 'none'
}

export default function MemoryPhoto({ photo, direction }: Props) {
  return (
    <figure data-photo-direction={direction} className="rg-memory-photo relative flex min-h-0 flex-1 items-center justify-center px-4">
      <div
        aria-hidden
        className="absolute inset-4 rounded-[2rem] opacity-40 blur-2xl"
        style={{
          backgroundImage: `url(${photoVariantUrl(photo.visitId, photo.file, 'blur')})`,
          backgroundPosition: photoObjectPosition(photo.focalPoint),
          backgroundSize: 'cover',
          opacity: zoomed ? 0.16 : 0.4,
          transition: 'opacity 180ms ease-out',
        }}
      />
      <img
        key={photo.key}
        src={photoVariantUrl(photo.visitId, photo.file, 'preview')}
        alt={photo.caption ?? `${photo.cityName}旅行照片`}
        style={{ objectPosition: photoObjectPosition(photo.focalPoint) }}
        className="relative max-h-[66vh] max-w-[min(88vw,1180px)] rounded-xl object-contain shadow-[0_28px_100px_rgba(0,0,0,.7)]"
      />
      <figcaption
        className="absolute inset-x-0 bottom-2 text-center text-sm tracking-wide text-[#f5ead8]/85 transition-opacity duration-200"
        style={{ opacity: zoomed ? 0.18 : 1 }}
      >
        {photo.caption}
      </figcaption>
    </figure>
  )
}
```

```tsx
// src/components/memory/MemoryFilmstrip.tsx
import type { MemoryPhoto } from '@/lib/memory'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  photos: MemoryPhoto[]
  index: number
  onIndex: (index: number) => void
}

export default function MemoryFilmstrip({ photos, index, onIndex }: Props) {
  return (
    <div role="list" aria-label="照片胶片条" className="rg-scroll flex gap-2 overflow-x-auto px-5 pb-5 pt-2">
      {photos.map((photo, photoIndex) => (
        <button
          key={photo.key}
          type="button"
          role="listitem"
          aria-label={`查看第 ${photoIndex + 1} 张照片`}
          aria-current={photoIndex === index ? 'true' : undefined}
          onClick={() => onIndex(photoIndex)}
          className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border ${
            photoIndex === index ? 'border-amber-100/75 opacity-100' : 'border-white/10 opacity-45'
          }`}
        >
          <img
            src={photoVariantUrl(photo.visitId, photo.file, 'sm')}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 实现舞台容器**

```tsx
// src/components/memory/MemoryStage.tsx
import { useEffect, useRef, useState } from 'react'
import type { MemoryMode, MemoryView } from '@/types'
import {
  clampMemoryIndex,
  filterMemoryPhotos,
  type MemoryCollection,
} from '@/lib/memory'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import MemoryToolbar from '@/components/memory/MemoryToolbar'
import MemoryPhoto from '@/components/memory/MemoryPhoto'
import MemoryFilmstrip from '@/components/memory/MemoryFilmstrip'

interface Props {
  collection: MemoryCollection
  mode: MemoryMode
  view: MemoryView
  photoIndex: number
  onPhotoIndex: (index: number) => void
  onMode: (mode: MemoryMode) => void
  onView: (view: MemoryView) => void
  onClose: () => void
}

export default function MemoryStage({
  collection,
  mode,
  view,
  photoIndex,
  onPhotoIndex,
  onMode,
  onView,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState<'next' | 'previous' | 'none'>('none')
  useFocusTrap(rootRef)
  const photos = filterMemoryPhotos(collection, mode)
  const index = clampMemoryIndex(photoIndex, photos.length)
  const photo = photos[index]

  const go = (delta: number) => {
    if (photos.length <= 1) return
    setDirection(delta > 0 ? 'next' : 'previous')
    onPhotoIndex((index + delta + photos.length) % photos.length)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (!photo || view !== 'stage') return null

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`照片回忆：${photo.cityName}`}
      className="fixed inset-0 z-[70] flex flex-col bg-[#090707]/94 text-[#f5ead8] backdrop-blur-xl"
    >
      <MemoryToolbar
        mode={mode}
        view={view}
        hasFeatured={collection.hasFeatured}
        onMode={onMode}
        onView={onView}
        onClose={onClose}
      />
      <div className="relative flex min-h-0 flex-1 items-center">
        <MemoryPhoto photo={photo} direction={direction} />
        <button type="button" aria-label="上一张" onClick={() => go(-1)} className="absolute left-5 h-12 w-12">
          ‹
        </button>
        <button type="button" aria-label="下一张" onClick={() => go(1)} className="absolute right-5 h-12 w-12">
          ›
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        第 {index + 1} 张，共 {photos.length} 张，{photo.cityName}，{photo.takenAt ?? '拍摄时间未知'}
      </p>
      {photos.length > 1 && (
        <MemoryFilmstrip photos={photos} index={index} onIndex={onPhotoIndex} />
      )}
    </div>
  )
}
```

- [ ] **Step 6: 集成地点篇章与舞台**

`TravelWorkspace` 增加：

```tsx
const memory = useMemoryOverlay(
  state.scope.kind === 'journey' ? state.scope.journeyId : 'archive',
)
const collection = memory.overlay.status === 'open'
  ? buildMemoryCollection(data, memory.overlay.source)
  : null
```

把 `CityCard` 替换为 `PlaceChapter`。打开入口：

```tsx
onOpenMemory={(source) => {
  const next = buildMemoryCollection(data, source)
  memory.open(source, {
    mode: initialMemoryMode(next),
    view: 'stage',
    photoIndex: 0,
  })
}}
```

在根节点末尾渲染：

```tsx
{memory.overlay.status === 'open' && collection && (
  <MemoryStage
    collection={collection}
    mode={memory.overlay.mode}
    view={memory.overlay.view}
    photoIndex={memory.overlay.photoIndex}
    onPhotoIndex={(index) => memory.setPhotoIndex(
      index,
      filterMemoryPhotos(collection, memory.overlay.status === 'open' ? memory.overlay.mode : 'all').length,
    )}
    onMode={(mode) => {
      memory.setMode(mode, 0)
    }}
    onView={memory.setView}
    onClose={memory.close}
  />
)}
```

`JourneyPassport` 的“全部照片”入口打开 `{ kind: 'journey', journeyId }`，默认 `mode: initialMemoryMode(collection)`。

- [ ] **Step 7: 运行舞台测试**

Run: `pnpm test -- src/components/memory/MemoryStage.test.tsx src/components/journey/PlaceChapter.test.tsx`

Expected: 全部通过；Esc 关闭回调触发。

- [ ] **Step 8: 提交舞台核心**

```bash
git add src/components/memory src/hooks/useFocusTrap.ts src/components/app/TravelWorkspace.tsx src/components/journey/JourneyPassport.tsx
git commit -m "feat: add immersive memory stage"
```

### Task B8: 自动播放、滑动与缩放

**Files:**
- Create: `src/lib/gesture.ts`
- Create: `src/lib/gesture.test.ts`
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/components/memory/hooks/useMemoryPlayback.ts`
- Create: `src/components/memory/hooks/useSwipeNavigation.ts`
- Create: `src/components/memory/hooks/usePhotoZoom.ts`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/components/memory/MemoryPhoto.tsx`

- [ ] **Step 1: 写手势纯函数测试**

```ts
// src/lib/gesture.test.ts
import { describe, expect, it } from 'vitest'
import { clampZoom, getSwipeDirection } from '@/lib/gesture'

describe('memory gestures', () => {
  it('detects horizontal swipes and ignores vertical motion', () => {
    expect(getSwipeDirection(200, 60, 80, 64)).toBe('next')
    expect(getSwipeDirection(80, 60, 200, 62)).toBe('previous')
    expect(getSwipeDirection(100, 20, 100, 180)).toBeNull()
  })

  it('clamps zoom to 1–3x', () => {
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(2.2)).toBe(2.2)
    expect(clampZoom(4)).toBe(3)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/gesture.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现手势纯函数**

```ts
// src/lib/gesture.ts
export type SwipeDirection = 'next' | 'previous'

export function getSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): SwipeDirection | null {
  const dx = endX - startX
  const dy = endY - startY
  if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) return null
  return dx < 0 ? 'next' : 'previous'
}

export function clampZoom(value: number): number {
  return Math.min(3, Math.max(1, value))
}
```

- [ ] **Step 4: 实现自动播放**

```ts
// src/components/memory/hooks/useMemoryPlayback.ts
import { useEffect, useRef, useState } from 'react'

interface Options {
  photoCount: number
  index: number
  onIndex: (index: number) => void
  reducedMotion: boolean
}

const SLIDE_MS = 5000
const TICK_MS = 100

export function useMemoryPlayback({
  photoCount,
  index,
  onIndex,
  reducedMotion,
}: Options) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState<0.5 | 1 | 2>(1)
  const [progress, setProgress] = useState(0)
  const [finished, setFinished] = useState(false)
  const elapsedRef = useRef(0)

  const pause = () => setPlaying(false)
  const toggle = () => {
    if (reducedMotion || photoCount <= 1) return
    if (finished) setFinished(false)
    setPlaying((value) => !value)
  }
  const setSpeed = (value: 0.5 | 1 | 2) => {
    setSpeedState(value)
    elapsedRef.current = 0
    setProgress(0)
  }

  useEffect(() => {
    elapsedRef.current = 0
    setProgress(0)
    if (index < photoCount - 1) setFinished(false)
  }, [index, photoCount])

  useEffect(() => {
    if (!playing) return
    const onVisibility = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => {
      elapsedRef.current += TICK_MS * speed
      const nextProgress = Math.min(1, elapsedRef.current / SLIDE_MS)
      setProgress(nextProgress)
      if (nextProgress < 1) return
      if (index >= photoCount - 1) {
        pause()
        setFinished(true)
        return
      }
      onIndex(index + 1)
    }, TICK_MS)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [index, onIndex, photoCount, playing, speed])

  return {
    playing,
    speed,
    progress,
    finished,
    toggle,
    pause,
    setSpeed,
  }
}
```

- [ ] **Step 5: 实现滑动与缩放 hook**

```ts
// src/hooks/useReducedMotion.ts
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}
```

```ts
// src/components/memory/hooks/useSwipeNavigation.ts
import { useRef, type PointerEventHandler } from 'react'
import { getSwipeDirection } from '@/lib/gesture'

export function useSwipeNavigation(
  onPrevious: () => void,
  onNext: () => void,
) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: ((event) => {
      startRef.current = { x: event.clientX, y: event.clientY }
    }) satisfies PointerEventHandler<HTMLElement>,
    onPointerUp: ((event) => {
      const start = startRef.current
      startRef.current = null
      if (!start) return
      const direction = getSwipeDirection(start.x, start.y, event.clientX, event.clientY)
      if (direction === 'next') onNext()
      if (direction === 'previous') onPrevious()
    }) satisfies PointerEventHandler<HTMLElement>,
  }
}
```

```ts
// src/components/memory/hooks/usePhotoZoom.ts
import { useState, type MouseEvent } from 'react'
import { clampZoom } from '@/lib/gesture'

export function usePhotoZoom() {
  const [scale, setScale] = useState(1)
  const [origin, setOrigin] = useState('50% 50%')

  const onDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (scale > 1) {
      setScale(1)
      setOrigin('50% 50%')
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setOrigin(
      `${((event.clientX - rect.left) / rect.width) * 100}% ${
        ((event.clientY - rect.top) / rect.height) * 100
      }%`,
    )
    setScale(2)
  }

  return {
    scale,
    origin,
    zoomed: scale > 1,
    reset: () => setScale(1),
    setScale: (value: number) => setScale(clampZoom(value)),
    onDoubleClick,
  }
}
```

- [ ] **Step 6: 接入舞台**

```tsx
// src/components/memory/MemoryPhoto.tsx
import type { MouseEventHandler, PointerEventHandler } from 'react'
import type { MemoryPhoto as MemoryPhotoModel } from '@/lib/memory'
import {
  photoObjectPosition,
  photoOriginalUrl,
  photoVariantUrl,
} from '@/lib/photoUrls'

interface Props {
  photo: MemoryPhotoModel
  direction: 'next' | 'previous' | 'none'
  scale: number
  origin: string
  zoomed: boolean
  onDoubleClick: MouseEventHandler<HTMLElement>
  onPointerDown: PointerEventHandler<HTMLElement>
  onPointerUp: PointerEventHandler<HTMLElement>
}

export default function MemoryPhoto({
  photo,
  direction,
  scale,
  origin,
  zoomed,
  onDoubleClick,
  onPointerDown,
  onPointerUp,
}: Props) {
  const source = zoomed
    ? photoOriginalUrl(photo.visitId, photo.file)
    : photoVariantUrl(photo.visitId, photo.file, 'preview')
  return (
    <figure
      data-photo-direction={direction}
      className="rg-memory-photo relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        aria-hidden
        className="absolute inset-4 rounded-[2rem] opacity-40 blur-2xl"
        style={{
          backgroundImage: `url(${photoVariantUrl(photo.visitId, photo.file, 'blur')})`,
          backgroundPosition: photoObjectPosition(photo.focalPoint),
          backgroundSize: 'cover',
        }}
      />
      <img
        key={photo.key}
        src={source}
        alt={photo.caption ?? `${photo.cityName}旅行照片`}
        style={{
          objectPosition: photoObjectPosition(photo.focalPoint),
          transform: `scale(${scale})`,
          transformOrigin: origin,
        }}
        className="relative max-h-[66vh] max-w-[min(88vw,1180px)] rounded-xl object-contain shadow-[0_28px_100px_rgba(0,0,0,.7)]"
      />
      <figcaption className="absolute inset-x-0 bottom-2 text-center text-sm tracking-wide text-[#f5ead8]/85">
        {photo.caption}
      </figcaption>
    </figure>
  )
}
```

`MemoryStage` 在现有 `go` helper 之后接入：

```tsx
const reducedMotion = useReducedMotion()
const zoom = usePhotoZoom()
const swipe = useSwipeNavigation(() => go(-1), () => go(1))
const playback = useMemoryPlayback({
  photoCount: photos.length,
  index,
  onIndex: onPhotoIndex,
  reducedMotion,
})

const goManually = (delta: number) => {
  playback.pause()
  zoom.reset()
  go(delta)
}
```

把上一张、下一张按钮改调 `goManually`。`MemoryPhoto` 调用改为：

```tsx
<MemoryPhoto
  photo={photo}
  direction={direction}
  scale={zoom.scale}
  origin={zoom.origin}
  zoomed={zoom.zoomed}
  onDoubleClick={zoom.onDoubleClick}
  onPointerDown={swipe.onPointerDown}
  onPointerUp={swipe.onPointerUp}
/>
```

新增控制条：

```tsx
<div className="flex items-center gap-3 px-5 pb-2">
  {photos.length > 1 && (
    <>
      <button type="button" aria-label={playback.playing ? '暂停自动回忆' : '播放自动回忆'} onClick={playback.toggle}>
        {playback.playing ? '暂停' : '播放'}
      </button>
      {[0.5, 1, 2].map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={playback.speed === value}
          onClick={() => playback.setSpeed(value as 0.5 | 1 | 2)}
        >
          {value}x
        </button>
      ))}
    </>
  )}
  <input
    type="range"
    aria-label="回忆进度"
    min={0}
    max={Math.max(0, photos.length - 1)}
    value={index}
    onChange={(event) => {
      playback.pause()
      zoom.reset()
      onPhotoIndex(Number(event.target.value))
    }}
    className="min-w-0 flex-1 accent-amber-100"
  />
</div>
```

任意手动上一张、下一张、胶片条点击、滑动或切换筛选都先调用 `playback.pause()`。

在舞台底部渲染播放结束文案：

```tsx
{playback.finished && index === photos.length - 1 && (
  <p className="pb-3 text-center font-serif text-lg text-[#f5ead8]/70">
    旅程会继续。
  </p>
)}
```

- [ ] **Step 7: 运行手势与舞台测试**

Run: `pnpm test -- src/lib/gesture.test.ts src/components/memory/MemoryStage.test.tsx`

Expected: 全部通过。

- [ ] **Step 8: 提交自动回忆与手势**

```bash
git add src/lib/gesture.ts src/lib/gesture.test.ts src/hooks/useReducedMotion.ts src/components/memory src/components/memory/hooks
git commit -m "feat: add memory autoplay swipe and zoom"
```

### Task B9: 回忆星图与移动端瀑布流

**Files:**
- Create: `src/lib/constellation.ts`
- Create: `src/lib/constellation.test.ts`
- Create: `src/components/memory/MemoryConstellation.tsx`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/components/journey/JourneyPassport.tsx`
- Modify: `src/components/app/TravelWorkspace.tsx`

- [ ] **Step 1: 写布局测试**

```ts
// src/lib/constellation.test.ts
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildMemoryCollection } from '@/lib/memory'
import {
  buildConstellationLayout,
  filterConstellationNodes,
} from '@/lib/constellation'

const data = dataJson as TravelData

describe('constellation layout', () => {
  it('is deterministic and stays inside the canvas', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    const first = buildConstellationLayout(collection, { width: 1200, height: 760 })
    const second = buildConstellationLayout(collection, { width: 1200, height: 760 })
    expect(first).toEqual(second)
    for (const node of first) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(1200)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(760)
    }
  })

  it('groups every photo under a real chapter', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j002' })
    const layout = buildConstellationLayout(collection, { width: 900, height: 600 })
    expect(layout.map((node) => node.photo.chapterKey)).toEqual(
      collection.photos.map((photo) => photo.chapterKey),
    )
  })

  it('mounts only nodes inside the viewport plus overscan', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    const layout = buildConstellationLayout(collection, { width: 1200, height: 760 })
    const first = layout[0]
    const visible = filterConstellationNodes(layout, {
      left: first.x - 10,
      top: first.y - 10,
      width: 20,
      height: 20,
      overscan: 100,
    })
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.every((node) =>
      node.x >= first.x - 110
      && node.x <= first.x + 110
      && node.y >= first.y - 110
      && node.y <= first.y + 110,
    )).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/constellation.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现确定性星座布局**

```ts
// src/lib/constellation.ts
import type { MemoryCollection, MemoryPhoto } from '@/lib/memory'

export interface ConstellationSize {
  width: number
  height: number
}

export interface ConstellationNode {
  photo: MemoryPhoto
  chapterIndex: number
  photoIndex: number
  x: number
  y: number
  rotation: number
  scale: number
}

export interface ConstellationViewport {
  left: number
  top: number
  width: number
  height: number
  overscan: number
}

export function buildConstellationLayout(
  collection: MemoryCollection,
  size: ConstellationSize,
): ConstellationNode[] {
  const chapters = collection.chapters.filter((chapter) => chapter.photos.length > 0)
  const centerX = size.width / 2
  const centerY = size.height / 2
  const radiusX = Math.max(120, size.width * 0.32)
  const radiusY = Math.max(80, size.height * 0.28)
  return chapters.flatMap((chapter, chapterIndex) => {
    const angle = -Math.PI / 2 + (chapterIndex / Math.max(1, chapters.length)) * Math.PI * 2
    const chapterX = centerX + Math.cos(angle) * radiusX
    const chapterY = centerY + Math.sin(angle) * radiusY
    return chapter.photos.map((photo, photoIndex) => {
      const ring = 34 + Math.floor(photoIndex / 8) * 54
      const itemAngle = (photoIndex / Math.max(1, chapter.photos.length)) * Math.PI * 2
      return {
        photo,
        chapterIndex,
        photoIndex,
        x: Math.min(size.width - 80, Math.max(80, chapterX + Math.cos(itemAngle) * ring)),
        y: Math.min(size.height - 60, Math.max(60, chapterY + Math.sin(itemAngle) * ring * 0.7)),
        rotation: ((photoIndex * 7 + chapterIndex * 3) % 9) - 4,
        scale: 0.9 + Math.min(0.16, photoIndex * 0.015),
      }
    })
  })
}

export function filterConstellationNodes(
  nodes: ConstellationNode[],
  viewport: ConstellationViewport,
): ConstellationNode[] {
  return nodes.filter((node) =>
    node.x >= viewport.left - viewport.overscan
    && node.x <= viewport.left + viewport.width + viewport.overscan
    && node.y >= viewport.top - viewport.overscan
    && node.y <= viewport.top + viewport.height + viewport.overscan)
}
```

- [ ] **Step 4: 实现星图组件**

```tsx
// src/components/memory/MemoryConstellation.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MemoryCollection } from '@/lib/memory'
import {
  buildConstellationLayout,
  filterConstellationNodes,
} from '@/lib/constellation'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  collection: MemoryCollection
  onOpenPhoto: (index: number) => void
}

export default function MemoryConstellation({ collection, onOpenPhoto }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [mobile, setMobile] = useState(() => window.innerWidth < 640)
  const [viewport, setViewport] = useState({
    left: 0,
    top: 0,
    width: 1200,
    height: 760,
    overscan: 160,
  })
  const nodes = useMemo(
    () => buildConstellationLayout(collection, { width: 1400, height: 900 }),
    [collection],
  )
  const visibleNodes = useMemo(
    () => filterConstellationNodes(nodes, viewport),
    [nodes, viewport],
  )

  useEffect(() => {
    const updateMode = () => setMobile(window.innerWidth < 640)
    const host = hostRef.current
    const syncViewport = () => {
      if (!host) return
      setViewport({
        left: host.scrollLeft,
        top: host.scrollTop,
        width: host.clientWidth,
        height: host.clientHeight,
        overscan: 160,
      })
    }
    window.addEventListener('resize', updateMode)
    host?.addEventListener('scroll', syncViewport, { passive: true })
    syncViewport()
    return () => {
      window.removeEventListener('resize', updateMode)
      host?.removeEventListener('scroll', syncViewport)
    }
  }, [])

  if (mobile) {
    return (
      <div className="rg-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {collection.chapters.map((chapter) => (
          <section key={chapter.key} className="mb-6">
            <h3 className="mb-2 font-serif text-lg text-[#f5ead8]">
              {chapter.arriveDate.slice(5).replace('-', '.')} · {chapter.cityName}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {chapter.photos.map((photo) => (
                <button
                  key={photo.key}
                  type="button"
                  onClick={() => onOpenPhoto(collection.photos.findIndex((item) => item.key === photo.key))}
                  className="overflow-hidden rounded-lg border border-white/10 text-left"
                >
                  <img
                    src={photoVariantUrl(photo.visitId, photo.file, 'sm')}
                    alt={photo.caption ?? `${photo.cityName}照片`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <span className="block px-2 py-1.5 text-[10px] text-[#f5ead8]/60">
                    {photo.caption ?? photo.file}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div ref={hostRef} className="rg-memory-constellation relative min-h-0 flex-1 overflow-auto">
      <div
        className="relative mx-auto h-[900px] w-[1400px]"
        style={{
          background:
            'radial-gradient(circle at 50% 45%,rgba(126,92,49,.15),transparent 34%),radial-gradient(circle at 20% 70%,rgba(46,90,111,.12),transparent 30%)',
        }}
      >
        <svg aria-hidden viewBox="0 0 1400 900" className="absolute inset-0 h-full w-full">
          {visibleNodes.slice(1).map((node, index) => (
            <line
              key={node.photo.key}
              x1={visibleNodes[index].x}
              y1={visibleNodes[index].y}
              x2={node.x}
              y2={node.y}
              stroke="rgba(245,234,216,.09)"
            />
          ))}
        </svg>
        {visibleNodes.map((node) => {
          const index = collection.photos.findIndex((photo) => photo.key === node.photo.key)
          return (
            <button
              key={node.photo.key}
              type="button"
              aria-label={`打开${node.photo.cityName}照片：${node.photo.caption ?? node.photo.file}`}
              onClick={() => onOpenPhoto(index)}
              className="absolute w-28 overflow-hidden rounded-lg border border-white/12 bg-black/40 shadow-[0_12px_36px_rgba(0,0,0,.45)] transition hover:z-10 hover:scale-105 hover:border-amber-100/35"
              style={{
                left: node.x - 56,
                top: node.y - 38,
                transform: `rotate(${node.rotation}deg) scale(${node.scale})`,
              }}
            >
              <img
                src={photoVariantUrl(node.photo.visitId, node.photo.file, 'md')}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="block truncate px-2 py-1 text-left text-[9px] text-[#f5ead8]/65">
                {node.photo.cityName}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 在舞台中切换星图并保留位置**

`MemoryStage` 不再在 `view !== 'stage'` 时返回 null。增加：

```tsx
const scrollMemoryRef = useRef(0)
const constellationHostRef = useRef<HTMLDivElement>(null)

const switchView = (next: 'stage' | 'constellation') => {
  if (view === 'constellation' && constellationHostRef.current) {
    scrollMemoryRef.current = constellationHostRef.current.scrollTop
  }
  onView(next)
  requestAnimationFrame(() => {
    if (next === 'constellation' && constellationHostRef.current) {
      constellationHostRef.current.scrollTop = scrollMemoryRef.current
    }
  })
}
```

view 为 `constellation` 时渲染 `<MemoryConstellation collection={collection} onOpenPhoto={(index) => { onPhotoIndex(index); onView('stage') }} />`。

- [ ] **Step 6: 从旅程护照进入全部照片与星图**

`JourneyPassport` 增加 `onOpenMemory: (view: MemoryView) => void`，在底部增加两个按钮：

```tsx
<div className="mt-2 grid grid-cols-2 gap-2">
  <button type="button" onClick={() => onOpenMemory('stage')}>全部照片</button>
  <button type="button" onClick={() => onOpenMemory('constellation')}>回忆星图</button>
</div>
```

`TravelWorkspace` 为旅程级 source 构造 collection，按 `initialMemoryMode` 打开。

390px 以下直接使用上面的日期分组瀑布流，不创建 3D 视差上下文。

- [ ] **Step 7: 运行星图测试**

Run: `pnpm test -- src/lib/constellation.test.ts src/components/memory/MemoryStage.test.tsx`

Expected: 全部通过。

- [ ] **Step 8: 提交回忆星图**

```bash
git add src/lib/constellation.ts src/lib/constellation.test.ts src/components/memory/MemoryConstellation.tsx src/components/memory/MemoryStage.tsx src/components/journey/JourneyPassport.tsx src/components/app/TravelWorkspace.tsx src/styles/index.css
git commit -m "feat: add memory constellation"
```

### Task B10: 390px、焦点与照片性能闸门

**Files:**
- Modify: `src/styles/index.css`
- Modify: `src/components/journey/PlaceChapter.tsx`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/components/memory/MemoryToolbar.tsx`
- Modify: `README.md`
- Modify: `docs/PLAN.md`

- [ ] **Step 1: 加入 390px 布局保障**

```css
@media (max-width: 639px) {
  .rg-place-chapter {
    width: calc(100vw - 1rem);
    max-height: calc(100vh - 1rem);
  }

  .rg-memory-toolbar {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .rg-memory-toolbar button,
  .rg-memory-controls button {
    min-width: 40px;
    min-height: 40px;
  }

  .rg-memory-photo img {
    max-width: 94vw;
    max-height: 56vh;
  }
}
```

给 `PlaceChapter` 根节点增加 `rg-place-chapter`，给工具栏和控制条增加对应 class。

- [ ] **Step 2: 运行完整测试**

Run: `pnpm test && pnpm build`

Expected: 全部测试通过；生产构建成功。

- [ ] **Step 3: 浏览器验证首屏网络**

Run: `pnpm dev`

使用浏览器 Network 面板确认：

1. 档案小卡与章节轴请求 `thumb-sm.webp`。
2. 旅程封面拼图与地点相册请求 `thumb-md.webp`。
3. 打开舞台后当前张请求 `preview.webp`，下一张被预加载，上一张保留缓存。
4. `photos/` 原图请求只在双击放大后出现。
5. 胶片条不请求 preview。

- [ ] **Step 4: 浏览器验证 390px 与键盘**

把视口设为 `390 × 844`，确认：

1. 页面无横向滚动。
2. 旅行档案可横向滑动。
3. 地点篇章以全高底部面板显示。
4. 舞台关闭、上一张、下一张、播放、倍速和胶片条触控目标至少 40px。
5. Tab 焦点不会离开舞台；Esc 关闭后回到“进入照片回忆”按钮。
6. 左右方向键、触屏横向滑动与筛选切换均可用。

- [ ] **Step 5: 记录 Gate B**

在 `docs/PLAN.md` 阶段 B 下记录测试、构建、网络与 390px 验收结果。README 更新：

```markdown
## 照片资产

`pnpm build:media` 会从 `public/photos/<visit-id>/<file>` 生成：

- `blur.webp`：32px 占位
- `thumb-sm.webp`：160px 章节与胶片条
- `thumb-md.webp`：640px 拼图与星图
- `preview.webp`：1600px 舞台预览

原图仍在 `public/photos/`，仅在双击放大时请求。
```

- [ ] **Step 6: 提交照片阶段闸门**

```bash
git add src/styles/index.css src/components/journey/PlaceChapter.tsx src/components/memory/MemoryStage.tsx src/components/memory/MemoryToolbar.tsx README.md docs/PLAN.md
git commit -m "docs: record photo memory acceptance"
```
