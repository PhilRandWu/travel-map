# 五类交通体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将飞机、高铁、地铁、轮船和汽车统一为可编辑、可经停、可回放、可搜索的完整交通体系。

**Architecture:** 以 `transportModes.ts` 作为五类交通的唯一展示与运动配置源，以每条 `Trip` 一条 `TransportRoute` 为通用路线模型。编辑器、轨迹、载具、镜头、统计和全站文案只消费注册表及通用路线，不再默认“非飞机即高铁”。

**Tech Stack:** React 19、TypeScript 7、Vitest、Testing Library、Three.js、react-globe.gl、Tailwind CSS 4

---

## File Structure

### 新增

| 文件 | 责任 |
|---|---|
| `src/lib/transportModes.ts` | 五类交通的名称、图标、颜色、线型、阶段、时长、镜头和文案配置 |
| `src/lib/transportModes.test.ts` | 注册表完整性、阶段权重、资源路径和未知类型回退 |
| `src/lib/trackGeometry.ts` | 通用走廊键、地面车道偏移、分段采样和点串拼接 |
| `src/components/editor/TransportTypePicker.tsx` | 五类交通选择器 |
| `src/components/editor/TransportTypePicker.test.tsx` | 五类按钮、选中态和切换回调 |
| `src/components/editor/WaypointEditor.tsx` | 通用经停增删、排除冲突城市和排序 |
| `src/components/editor/WaypointEditor.test.tsx` | 经停上限、排除项、移动和删除 |
| `src/components/stats/TransportMix.tsx` | 五类交通数量和图标构成 |
| `src/components/stats/TransportMix.test.tsx` | 五类零值占位与计数 |
| `public/vehicle-icons/metro-3d.svg` | 地铁载具 |
| `public/vehicle-icons/ship-3d.svg` | 轮船载具 |
| `public/vehicle-icons/car-3d.svg` | 汽车载具 |

### 修改

| 文件 | 改动 |
|---|---|
| `src/types/index.ts` | 扩展 `TransportType`，更新 `Trip` 注释 |
| `src/lib/validate.ts` | 五类类型、重复路线节点、最多 4 个经停 |
| `src/lib/editorModel.ts` | 五类统一经停去重与城市持久化 |
| `src/components/editor/TripForm.tsx` | 接入交通选择器和通用经停编辑器 |
| `src/lib/tracks.ts` | 输出每 trip 一条 `TransportRoute` |
| `src/lib/journeyScene.ts` | 从注册表和通用路线构建场景线 |
| `src/lib/vehicleTiming.ts` | 注册表驱动的总时长和高度包络 |
| `src/lib/vehicle.ts` | 多 leg 载具路径、停靠和距离权重 |
| `src/lib/vehicleMotion.ts` | 每 leg 五阶段、700ms 停靠、姿态与文案 |
| `src/lib/routeCamera.ts` | 注册表镜头高度、前导角和准备文案 |
| `src/components/globe/hooks/useTrackPresentation.ts` | 飞机 leg 弧线与其他方式路径统一生成 |
| `src/components/globe/hooks/useVehiclePlayback.ts` | 从 `tracks.routes` 取播放路线 |
| `src/components/globe/VehicleOverlay.tsx` | 五类图标、颜色、拖尾和停靠波纹 |
| `src/components/globe/VehicleCameraStatus.tsx` | 注册表交通名称 |
| `src/components/globe/SceneRouteOverlay.tsx` | 注册表颜色与线型 |
| `src/components/globe/RouteFlowOverlay.tsx` | 注册表颜色 |
| `src/components/globe/vehicleTrail.ts` | 注册表轨迹材质、颜色和引导线 |
| `src/components/globe/useVehicleMotionEffects.ts` | 通用地面效果、经停波纹和到达波纹 |
| `src/components/globe/VehicleTrailLayer.tsx` | 模式色拖尾与地面效果节点 |
| `src/components/globe/cityMarkers.ts` | 经停节点标记 |
| `src/components/globe/hooks/useGlobeMarkers.ts` | 为当前路线补充经停节点 |
| `src/components/globe/TravelGlobe.tsx` | 传入当前路线并暴露通用轨迹计数 |
| `src/hooks/useTravelWorkspaceController.ts` | 用 `tracks.routes` 计算选中路线焦点 |
| `src/lib/derive.ts` | `tripCount` 与 `transportCounts` |
| `src/components/stats/StatsPanel.tsx` | 交通总数、累计里程和五类构成 |
| `src/components/timeline/items.ts` | 五类名称、完整路线和图标 |
| `src/components/timeline/TimelineNode.tsx` | 五类时间轴图标 |
| `src/components/city/CityCard.tsx` | 五类关联交通文案 |
| `src/components/journey/PlaceChapter.tsx` | 五类关联交通文案 |
| `src/components/hero/HeroPhoto.tsx` | 五类主图说明与空图图标 |
| `src/lib/travelSearch.ts` | 五种名称、常用词和经停路线搜索 |
| `src/components/editor/EditorListPanel.tsx` | 五类名称与经停数量 |
| `src/styles/motion-vehicle.css` | 模式色 HUD、拖尾和经停波纹 |
| `README.md` | 更新五类交通与经停说明 |
| `docs/PRD.md` | 更新交通模型、统计和回放验收 |

### 不修改

- `TravelMeta.version` 保持 `2`。
- 旧 `flight/train` 数据不做迁移。
- 经停城市不写 `visits`、不点亮城市、不进入到访统计。
- 不实现在线路线、真实道路/轨道/航道、发布、昼夜皮肤或移动端专项。

---

## Task 1: Domain Model and Transport Registry

**Files:**
- Modify: `src/types/index.ts:6-75`
- Create: `src/lib/transportModes.ts`
- Create: `src/lib/transportModes.test.ts`
- Modify: `src/lib/validate.ts:108-130`
- Modify: `src/lib/derive.test.ts:19-61`

- [ ] **Step 1: Write failing registry and validation tests**

Create `src/lib/transportModes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  FALLBACK_TRANSPORT_MODE,
  TRANSPORT_MODES,
  TRANSPORT_TYPES,
  getTransportMode,
  isTransportType,
} from '@/lib/transportModes'

describe('transport modes', () => {
  it('registers all five modes in display order', () => {
    expect(TRANSPORT_TYPES).toEqual(['flight', 'train', 'metro', 'ship', 'car'])
  })

  it.each(TRANSPORT_TYPES)('%s has a complete visual and motion profile', (type) => {
    const mode = TRANSPORT_MODES[type]
    expect(mode.label).not.toBe('')
    expect(mode.iconPath).toMatch(/^\/vehicle-icons\//)
    expect(mode.route.colorHex).toMatch(/^#[0-9A-F]{6}$/)
    expect(mode.motion.phases).toHaveLength(5)
    expect(mode.motion.phases.reduce((sum, phase) => sum + phase.weight, 0))
      .toBeCloseTo(1)
    expect(mode.motion.minDurationMs).toBeGreaterThan(0)
    expect(mode.motion.maxDurationMs).toBeGreaterThan(mode.motion.minDurationMs)
    expect(mode.camera.altitude).toBeGreaterThan(0)
  })

  it('falls back safely for unknown runtime values', () => {
    expect(isTransportType('metro')).toBe(true)
    expect(isTransportType('rocket')).toBe(false)
    expect(getTransportMode('rocket').label).toBe(FALLBACK_TRANSPORT_MODE.label)
  })
})
```

Append these validation tests to `src/lib/derive.test.ts` inside the
`validateTravelData` describe block:

```ts
it('accepts all five transport types and waypoints', () => {
  const valid = structuredClone(d)
  valid.trips = (['flight', 'train', 'metro', 'ship', 'car'] as const)
    .map((type, index) => ({
      id: `t-${type}`,
      journeyId: valid.journeys[0].id,
      date: '2025-05-01',
      type,
      from: 'beijing',
      to: 'hangzhou',
      waypoints: ['shanghai'],
    }))

  expect(validateTravelData(valid).filter((issue) => issue.level === 'error'))
    .toEqual([])
})

it('rejects repeated route nodes and more than four waypoints', () => {
  const broken = structuredClone(d)
  const trip = broken.trips[0]
  trip.from = 'beijing'
  trip.to = 'hangzhou'
  trip.waypoints = [
    'shanghai',
    'beijing',
    'jiaxing',
    'chengdu',
    'hangzhou',
  ]

  const messages = validateTravelData(broken)
    .filter((issue) => issue.subject === `trip:${trip.id}`)
    .map((issue) => issue.message)
  expect(messages.some((message) => message.includes('不能超过 4'))).toBe(true)
  expect(messages.some((message) => message.includes('不能重复'))).toBe(true)
})

it('rejects identical departure and arrival cities', () => {
  const broken = structuredClone(d)
  broken.trips[0].to = broken.trips[0].from
  expect(validateTravelData(broken).some((issue) =>
    issue.subject === `trip:${broken.trips[0].id}`
    && issue.message.includes('不能相同'))).toBe(true)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
rtk vitest src/lib/transportModes.test.ts src/lib/derive.test.ts
```

Expected: FAIL because `transportModes.ts` does not exist and validation only
accepts `flight` and `train`.

- [ ] **Step 3: Expand the domain type**

In `src/types/index.ts`, replace the transport type and trip comments with:

```ts
/** 交通方式：飞机 / 高铁 / 地铁 / 轮船 / 汽车 */
export type TransportType = 'flight' | 'train' | 'metro' | 'ship' | 'car'
```

```ts
/**
 * 一段行程（回放时视为一条交通路线）。
 * 五种方式统一按 from → waypoints[0] → … → to 渲染。
 */
export interface Trip {
  id: string
  journeyId: string
  /** 出行日期 YYYY-MM-DD */
  date: string
  type: TransportType
  from: string
  to: string
  /** 有序经停城市 id，最多 4 个 */
  waypoints: string[]
  /** 备注：航班号、车次、线路、船班或自驾路线 */
  note?: string
}
```

- [ ] **Step 4: Implement the transport registry**

Create `src/lib/transportModes.ts`:

```ts
import type { TransportType } from '@/types'

export const TRANSPORT_TYPES = ['flight', 'train', 'metro', 'ship', 'car'] as const
export const TRANSPORT_WAYPOINT_LIMIT = 4

export type TransportRouteShape = 'arc' | 'surface'
export type TransportPhaseId =
  | 'start'
  | 'accelerate'
  | 'cruise'
  | 'decelerate'
  | 'arrive'
export type TransportVehicleEffect =
  | 'contrail'
  | 'rail'
  | 'pulse'
  | 'wake'
  | 'road'

export interface TransportPhaseConfig {
  id: TransportPhaseId
  label: string
  weight: number
}

export interface TransportModeConfig {
  label: string
  icon: string
  iconPath: string
  searchTerms: readonly string[]
  noteHint: string
  notePlaceholder: string
  route: {
    shape: TransportRouteShape
    colorHex: string
    colorRgb: string
    colorNumber: number
    baseAltitude: number
    laneOffsetDeg: number
    stroke: number
    dashed: boolean
    dashLength: number
    dashGap: number
  }
  trail: {
    colorNumber: number
    guideStartColor: number
    guideEndColor: number
    dashSize: number
    gapSize: number
  }
  vehicle: {
    effect: TransportVehicleEffect
    haloColor: string
    haloShadow: string
  }
  motion: {
    minDurationMs: number
    maxDurationMs: number
    distanceStartKm: number
    distanceRangeKm: number
    phases: readonly TransportPhaseConfig[]
    maxPitchDeg: number
    maxRollDeg: number
    rollScale: number
    bobAmplitude: number
    bobPeriodMs: number
    stopLabel: string
    arrivalLabel: string
  }
  camera: {
    altitude: number
    northLeadDeg: number
    preparingLabel: string
  }
}

const phases = (
  labels: readonly [string, string, string, string, string],
  weights: readonly [number, number, number, number, number],
): readonly TransportPhaseConfig[] => (
  (['start', 'accelerate', 'cruise', 'decelerate', 'arrive'] as const)
    .map((id, index) => ({ id, label: labels[index], weight: weights[index] }))
)

export const TRANSPORT_MODES: Record<TransportType, TransportModeConfig> = {
  flight: {
    label: '飞机',
    icon: '✈',
    iconPath: '/vehicle-icons/flight-3d.svg',
    searchTerms: ['飞机', '航班', '航空', 'flight'],
    noteHint: '航班号',
    notePlaceholder: '例如：CA1234',
    route: {
      shape: 'arc',
      colorHex: '#A5F3FC',
      colorRgb: '165, 243, 252',
      colorNumber: 0xa5f3fc,
      baseAltitude: 0.004,
      laneOffsetDeg: 0,
      stroke: 1.6,
      dashed: true,
      dashLength: 0.045,
      dashGap: 0.014,
    },
    trail: {
      colorNumber: 0xa5f3fc,
      guideStartColor: 0xfbbf24,
      guideEndColor: 0xa5f3fc,
      dashSize: 1.8,
      gapSize: 1.1,
    },
    vehicle: {
      effect: 'contrail',
      haloColor: 'rgba(165,243,252,.3)',
      haloShadow: '0 0 22px 10px rgba(165,243,252,.22)',
    },
    motion: {
      minDurationMs: 5500,
      maxDurationMs: 8500,
      distanceStartKm: 300,
      distanceRangeKm: 9700,
      phases: phases(
        ['滑跑', '起飞', '巡航', '下降', '接地'],
        [0.14, 0.2, 0.42, 0.14, 0.1],
      ),
      maxPitchDeg: 10,
      maxRollDeg: 12,
      rollScale: 18,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '经停',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.62,
      northLeadDeg: 2.4,
      preparingLabel: '准备起飞',
    },
  },
  train: {
    label: '高铁',
    icon: '🚄',
    iconPath: '/vehicle-icons/train-3d.svg',
    searchTerms: ['高铁', '火车', '列车', 'train'],
    noteHint: '车次',
    notePlaceholder: '例如：G7558',
    route: {
      shape: 'surface',
      colorHex: '#FBBF24',
      colorRgb: '251, 191, 36',
      colorNumber: 0xfbbf24,
      baseAltitude: 0.004,
      laneOffsetDeg: 0.16,
      stroke: 1.5,
      dashed: false,
      dashLength: 0,
      dashGap: 0,
    },
    trail: {
      colorNumber: 0xfbbf24,
      guideStartColor: 0xfbbf24,
      guideEndColor: 0xfef3c7,
      dashSize: 1.6,
      gapSize: 1,
    },
    vehicle: {
      effect: 'rail',
      haloColor: 'rgba(251,191,36,.3)',
      haloShadow: '0 0 22px 10px rgba(251,191,36,.2)',
    },
    motion: {
      minDurationMs: 6000,
      maxDurationMs: 9000,
      distanceStartKm: 100,
      distanceRangeKm: 3900,
      phases: phases(
        ['发车', '加速', '区间巡航', '制动', '进站'],
        [0.12, 0.17, 0.44, 0.17, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 4,
      rollScale: 7,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '停站',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.34,
      northLeadDeg: 2.4,
      preparingLabel: '准备发车',
    },
  },
  metro: {
    label: '地铁',
    icon: '🚇',
    iconPath: '/vehicle-icons/metro-3d.svg',
    searchTerms: ['地铁', '轻轨', 'metro', 'subway'],
    noteHint: '线路 / 区间',
    notePlaceholder: '例如：2 号线',
    route: {
      shape: 'surface',
      colorHex: '#FDA4AF',
      colorRgb: '253, 164, 175',
      colorNumber: 0xfda4af,
      baseAltitude: 0.003,
      laneOffsetDeg: 0.11,
      stroke: 1.35,
      dashed: true,
      dashLength: 0.03,
      dashGap: 0.012,
    },
    trail: {
      colorNumber: 0xfda4af,
      guideStartColor: 0xfda4af,
      guideEndColor: 0xffe4e6,
      dashSize: 1.1,
      gapSize: 0.75,
    },
    vehicle: {
      effect: 'pulse',
      haloColor: 'rgba(253,164,175,.3)',
      haloShadow: '0 0 22px 10px rgba(253,164,175,.2)',
    },
    motion: {
      minDurationMs: 4800,
      maxDurationMs: 7000,
      distanceStartKm: 0,
      distanceRangeKm: 120,
      phases: phases(
        ['离站', '加速', '区间运行', '制动', '到站'],
        [0.1, 0.15, 0.47, 0.18, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 9,
      rollScale: 14,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '到站',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.25,
      northLeadDeg: 1.8,
      preparingLabel: '准备离站',
    },
  },
  ship: {
    label: '轮船',
    icon: '🚢',
    iconPath: '/vehicle-icons/ship-3d.svg',
    searchTerms: ['轮船', '邮轮', '渡轮', '船', 'ship', 'ferry'],
    noteHint: '船班 / 航线',
    notePlaceholder: '例如：外滩夜航',
    route: {
      shape: 'surface',
      colorHex: '#60A5FA',
      colorRgb: '96, 165, 250',
      colorNumber: 0x60a5fa,
      baseAltitude: 0.006,
      laneOffsetDeg: 0.2,
      stroke: 1.3,
      dashed: true,
      dashLength: 0.035,
      dashGap: 0.02,
    },
    trail: {
      colorNumber: 0x60a5fa,
      guideStartColor: 0x60a5fa,
      guideEndColor: 0xdbeafe,
      dashSize: 1.5,
      gapSize: 1,
    },
    vehicle: {
      effect: 'wake',
      haloColor: 'rgba(96,165,250,.3)',
      haloShadow: '0 0 22px 10px rgba(96,165,250,.2)',
    },
    motion: {
      minDurationMs: 7500,
      maxDurationMs: 10500,
      distanceStartKm: 200,
      distanceRangeKm: 8000,
      phases: phases(
        ['离港', '加速', '海上巡航', '减速', '靠港'],
        [0.12, 0.16, 0.48, 0.14, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 4,
      rollScale: 5,
      bobAmplitude: 0.0012,
      bobPeriodMs: 1800,
      stopLabel: '靠港',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.43,
      northLeadDeg: 2,
      preparingLabel: '准备离港',
    },
  },
  car: {
    label: '汽车',
    icon: '🚗',
    iconPath: '/vehicle-icons/car-3d.svg',
    searchTerms: ['汽车', '自驾', '驾车', '公路', 'car', 'drive'],
    noteHint: '自驾路线',
    notePlaceholder: '例如：环湖公路',
    route: {
      shape: 'surface',
      colorHex: '#86EFAC',
      colorRgb: '134, 239, 172',
      colorNumber: 0x86efac,
      baseAltitude: 0.004,
      laneOffsetDeg: 0.14,
      stroke: 1.2,
      dashed: false,
      dashLength: 0,
      dashGap: 0,
    },
    trail: {
      colorNumber: 0x86efac,
      guideStartColor: 0x86efac,
      guideEndColor: 0xdcfce7,
      dashSize: 1.2,
      gapSize: 0.8,
    },
    vehicle: {
      effect: 'road',
      haloColor: 'rgba(134,239,172,.3)',
      haloShadow: '0 0 22px 10px rgba(134,239,172,.2)',
    },
    motion: {
      minDurationMs: 5500,
      maxDurationMs: 8000,
      distanceStartKm: 50,
      distanceRangeKm: 2500,
      phases: phases(
        ['启动', '加速', '公路行驶', '减速', '抵达'],
        [0.1, 0.16, 0.48, 0.16, 0.1],
      ),
      maxPitchDeg: 0,
      maxRollDeg: 6,
      rollScale: 10,
      bobAmplitude: 0,
      bobPeriodMs: 0,
      stopLabel: '途经',
      arrivalLabel: '抵达',
    },
    camera: {
      altitude: 0.3,
      northLeadDeg: 2.1,
      preparingLabel: '准备出发',
    },
  },
}

export const FALLBACK_TRANSPORT_MODE: TransportModeConfig = {
  ...TRANSPORT_MODES.flight,
  label: '未知交通',
  icon: '◇',
  iconPath: '',
  searchTerms: ['未知交通', 'unknown'],
  noteHint: '备注',
  notePlaceholder: '交通备注',
  route: {
    ...TRANSPORT_MODES.flight.route,
    colorHex: '#94A3B8',
    colorRgb: '148, 163, 184',
    colorNumber: 0x94a3b8,
  },
  vehicle: {
    effect: 'road',
    haloColor: 'rgba(148,163,184,.24)',
    haloShadow: '0 0 18px 8px rgba(148,163,184,.16)',
  },
  motion: {
    ...TRANSPORT_MODES.flight.motion,
    stopLabel: '经停',
  },
  camera: {
    ...TRANSPORT_MODES.flight.camera,
    preparingLabel: '准备出发',
  },
}

export function isTransportType(value: unknown): value is TransportType {
  return typeof value === 'string'
    && (TRANSPORT_TYPES as readonly string[]).includes(value)
}

export function getTransportMode(type: string): TransportModeConfig {
  return isTransportType(type)
    ? TRANSPORT_MODES[type]
    : FALLBACK_TRANSPORT_MODE
}
```

- [ ] **Step 5: Implement five-mode validation**

In `src/lib/validate.ts`, import the registry:

```ts
import {
  TRANSPORT_WAYPOINT_LIMIT,
  isTransportType,
} from '@/lib/transportModes'
```

Replace the trip type and waypoint checks with:

```ts
const waypoints = Array.isArray(t.waypoints) ? t.waypoints : []
if (!Array.isArray(t.waypoints)) {
  issues.push({ level: 'error', subject, message: 'waypoints 必须是数组（无经停填 []）' })
} else {
  waypoints.forEach((w, index) => requireCity(w, subject, `waypoints[${index}]`))
}

if (!isTransportType(t.type)) {
  issues.push({
    level: 'error',
    subject,
    message: `type 非法：${String(t.type)}（仅 flight / train / metro / ship / car）`,
  })
}
if (t.from === t.to) {
  issues.push({ level: 'error', subject, message: '出发城市与到达城市不能相同' })
}
if (waypoints.length > TRANSPORT_WAYPOINT_LIMIT) {
  issues.push({
    level: 'error',
    subject,
    message: `经停城市不能超过 ${TRANSPORT_WAYPOINT_LIMIT} 个`,
  })
}

const routeIds = [t.from, ...waypoints, t.to]
const repeated = [...new Set(routeIds.filter((id, index) => (
  typeof id === 'string' && routeIds.indexOf(id) !== index
)))]
if (repeated.length > 0) {
  issues.push({
    level: 'error',
    subject,
    message: `路线节点不能重复：${repeated.join(', ')}`,
  })
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
rtk vitest src/lib/transportModes.test.ts src/lib/derive.test.ts src/types/contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/types/index.ts src/lib/transportModes.ts \
  src/lib/transportModes.test.ts src/lib/validate.ts src/lib/derive.test.ts
git commit -S -m "feat: define five transport modes"
```

---

## Task 2: Editor Selection, Waypoints, and Persistence

**Files:**
- Create: `src/components/editor/TransportTypePicker.tsx`
- Create: `src/components/editor/TransportTypePicker.test.tsx`
- Create: `src/components/editor/WaypointEditor.tsx`
- Create: `src/components/editor/WaypointEditor.test.tsx`
- Modify: `src/components/editor/TripForm.tsx`
- Modify: `src/lib/editorModel.ts:190-230`
- Modify: `src/lib/editorModel.test.ts:135-163`
- Modify: `src/components/editor/EditorListPanel.tsx:132-180`
- Modify: `src/components/editor/TravelEditor.test.tsx`

- [ ] **Step 1: Write failing editor component tests**

Create `src/components/editor/TransportTypePicker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TransportTypePicker from '@/components/editor/TransportTypePicker'

describe('TransportTypePicker', () => {
  it('renders five accessible choices and reports a change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TransportTypePicker value="flight" onChange={onChange} />)

    expect(screen.getAllByRole('button')).toHaveLength(5)
    expect(screen.getByRole('button', { name: '飞机' }).getAttribute('aria-pressed'))
      .toBe('true')

    await user.click(screen.getByRole('button', { name: '轮船' }))
    expect(onChange).toHaveBeenCalledWith('ship')
  })
})
```

Create `src/components/editor/WaypointEditor.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import tripsJson from '@/data/trips.json'
import type { City, TravelData } from '@/types'
import WaypointEditor from '@/components/editor/WaypointEditor'

const data = tripsJson as TravelData
const beijing = data.cities.find((city) => city.id === 'beijing')!
const hangzhou = data.cities.find((city) => city.id === 'hangzhou')!
const jiaxing = data.cities.find((city) => city.id === 'jiaxing')!

describe('WaypointEditor', () => {
  it('adds, reorders and removes waypoints', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[jiaxing]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '下移经停 1' }))
    expect(onChange).toHaveBeenLastCalledWith([jiaxing])
    await user.click(screen.getByRole('button', { name: '移除经停 1' }))
    expect(onChange).toHaveBeenLastCalledWith([])

    rerender(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[]}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: '+ 添加经停' }))
    expect(onChange).toHaveBeenLastCalledWith([null])
  })

  it('disables adding when four waypoints already exist', () => {
    render(
      <WaypointEditor
        data={data}
        from={beijing}
        to={hangzhou}
        value={[jiaxing, null, null, null]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '+ 添加经停' }))
      .toHaveProperty('disabled', true)
  })
})
```

Replace the old saveTrip test in `src/lib/editorModel.test.ts` with:

```ts
it('keeps ordered unique waypoints for every transport type', () => {
  const data = clone()
  const journey = data.journeys[0]
  const draft = createTripDraft(data, journey)
  const from = findBuiltinCity('hangzhou')!
  const to = findBuiltinCity('shanghai')!
  const jiaxing = findBuiltinCity('jiaxing')!

  for (const type of ['flight', 'train', 'metro', 'ship', 'car'] as const) {
    const next = saveTrip(data, {
      ...draft,
      type,
      from,
      to,
      waypoints: [jiaxing, from, jiaxing],
      date: '2025-05-02',
    })
    expect(next.trips.find((trip) => trip.id === draft.id)?.waypoints)
      .toEqual(['jiaxing'])
    expect(next.cities.some((city) => city.id === 'jiaxing')).toBe(true)
  }
})
```

Append to `src/components/editor/TravelEditor.test.tsx`:

```tsx
it('creates a ship trip with a waypoint and preserves it when changing modes', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(
    <TravelEditor
      data={clone()}
      storageError={null}
      initialJourneyId="j001"
      onChange={onChange}
      onClose={vi.fn()}
    />,
  )

  await user.click(screen.getByRole('button', { name: '+ 新增行程' }))
  await user.click(screen.getByRole('button', { name: '轮船' }))
  await user.click(screen.getByRole('button', { name: '+ 添加经停' }))
  await user.type(screen.getByLabelText(/出发城市/), '北京')
  await user.click(screen.getByRole('option', { name: /北京/ }))
  await user.type(screen.getByLabelText(/经停 1/), '嘉兴')
  await user.click(screen.getByRole('option', { name: /嘉兴/ }))
  await user.type(screen.getByLabelText(/到达城市/), '杭州')
  await user.click(screen.getByRole('option', { name: /杭州/ }))
  await user.click(screen.getByRole('button', { name: '汽车' }))
  await user.click(screen.getByRole('button', { name: '保存行程' }))

  const next = onChange.mock.calls[0][0] as TravelData
  expect(next.trips.find((trip) => trip.id === 't006')).toMatchObject({
    type: 'car',
    from: 'beijing',
    to: 'hangzhou',
    waypoints: ['jiaxing'],
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk vitest src/components/editor/TransportTypePicker.test.tsx \
  src/components/editor/WaypointEditor.test.tsx \
  src/lib/editorModel.test.ts src/components/editor/TravelEditor.test.tsx
```

Expected: FAIL because the new components do not exist and `saveTrip` clears
flight waypoints.

- [ ] **Step 3: Implement the five-mode picker**

Create `src/components/editor/TransportTypePicker.tsx`:

```tsx
import type { TransportType } from '@/types'
import { TRANSPORT_MODES, TRANSPORT_TYPES } from '@/lib/transportModes'

interface Props {
  value: TransportType
  onChange: (type: TransportType) => void
}

export default function TransportTypePicker({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="交通方式"
      className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[.025] p-1 sm:grid-cols-5"
    >
      {TRANSPORT_TYPES.map((type) => {
        const mode = TRANSPORT_MODES[type]
        return (
          <button
            key={type}
            type="button"
            aria-label={mode.label}
            aria-pressed={value === type}
            onClick={() => onChange(type)}
            className={`min-h-11 cursor-pointer rounded-lg px-2 text-xs transition ${
              value === type
                ? 'bg-cyan-100/10 text-cyan-50'
                : 'text-white/55 hover:bg-white/5 hover:text-white/82'
            }`}
          >
            <span aria-hidden>{mode.icon}</span>
            <span className="ml-1">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Implement the generic waypoint editor**

Create `src/components/editor/WaypointEditor.tsx`:

```tsx
import type { City, TravelData } from '@/types'
import { TRANSPORT_WAYPOINT_LIMIT } from '@/lib/transportModes'
import CityCombobox from '@/components/editor/CityCombobox'

interface Props {
  data: TravelData
  from: City | null
  to: City | null
  value: Array<City | null>
  onChange: (value: Array<City | null>) => void
}

export default function WaypointEditor({
  data,
  from,
  to,
  value,
  onChange,
}: Props) {
  const update = (index: number, city: City | null) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? city : item)))
  }

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.12em] text-white/62">经停城市</p>
        <button
          type="button"
          disabled={value.length >= TRANSPORT_WAYPOINT_LIMIT}
          onClick={() => onChange([...value, null])}
          className="min-h-9 cursor-pointer rounded-full border border-white/12 px-3 text-[11px] text-white/60 transition hover:border-white/24 hover:text-white/84 disabled:cursor-not-allowed disabled:opacity-35"
        >
          + 添加经停
        </button>
      </div>
      {value.length === 0 && (
        <p className="rounded-lg border border-white/9 bg-white/[.025] px-3 py-2.5 text-[11px] leading-relaxed text-white/46">
          可留空；添加后路线会按出发 → 经停 → 到达分段，并在经停城市短暂停靠。
        </p>
      )}
      {value.map((waypoint, index) => {
        const excluded = [
          from?.id,
          to?.id,
          ...value.filter((_, itemIndex) => itemIndex !== index)
            .map((city) => city?.id),
        ].filter((id): id is string => Boolean(id))
        return (
          <div key={index} className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <CityCombobox
                data={data}
                label={`经停 ${index + 1}`}
                value={waypoint}
                excludeCityIds={excluded}
                onChange={(city) => update(index, city)}
              />
            </div>
            <div className="mt-7 flex">
              <button
                type="button"
                aria-label={`上移经停 ${index + 1}`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="grid h-9 w-8 cursor-pointer place-items-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-20"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`下移经停 ${index + 1}`}
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
                className="grid h-9 w-8 cursor-pointer place-items-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-20"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`移除经停 ${index + 1}`}
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                className="grid h-9 w-8 cursor-pointer place-items-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80"
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Wire the TripForm components without clearing waypoints**

In `src/components/editor/TripForm.tsx`, replace the inline transport selector
with:

```tsx
<TransportTypePicker value={form.type} onChange={changeType} />
```

Replace the type-change handler with:

```tsx
const changeType = (type: TripDraft['type']) => {
  setForm((current) => ({ ...current, type }))
}
```

Replace the entire train-only waypoint block with:

```tsx
<WaypointEditor
  data={data}
  from={form.from}
  to={form.to}
  value={waypoints}
  onChange={(next) => {
    setWaypoints(next)
    setForm((current) => ({
      ...current,
      waypoints: next.filter((city): city is City => city !== null),
    }))
  }}
/>
```

Use registry copy for the note field:

```tsx
const mode = getTransportMode(form.type)
```

```tsx
<EditorField id="trip-note" label="交通备注" hint={mode.noteHint}>
  <input
    id="trip-note"
    type="text"
    maxLength={60}
    value={form.note}
    placeholder={mode.notePlaceholder}
    onChange={(event) => setForm({ ...form, note: event.target.value })}
    className={editorInputClass}
  />
</EditorField>
```

- [ ] **Step 6: Make saveTrip type-independent**

In `src/lib/editorModel.ts`, replace the waypoint branch in `saveTrip` with:

```ts
const seen = new Set<string>([draft.from.id, draft.to.id])
const waypoints = draft.waypoints
  .filter((city) => {
    if (seen.has(city.id)) return false
    seen.add(city.id)
    return true
  })
  .slice(0, 4)
```

Add the import:

```ts
import { TRANSPORT_WAYPOINT_LIMIT } from '@/lib/transportModes'
```

Use `.slice(0, TRANSPORT_WAYPOINT_LIMIT)` instead of the literal `4`.

- [ ] **Step 7: Update the editor trip list**

In `src/components/editor/EditorListPanel.tsx`, import:

```ts
import { getTransportMode } from '@/lib/transportModes'
```

Render the mode label in the trip metadata:

```tsx
{formatDate(trip.date)} · {getTransportMode(trip.type).label}
{trip.waypoints.length > 0 ? ` · 经停 ${trip.waypoints.length}` : ''}
```

- [ ] **Step 8: Run focused editor tests**

Run:

```bash
rtk vitest src/components/editor/TransportTypePicker.test.tsx \
  src/components/editor/WaypointEditor.test.tsx \
  src/lib/editorModel.test.ts src/components/editor/TravelEditor.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add src/components/editor/TransportTypePicker.tsx \
  src/components/editor/TransportTypePicker.test.tsx \
  src/components/editor/WaypointEditor.tsx \
  src/components/editor/WaypointEditor.test.tsx \
  src/components/editor/TripForm.tsx src/components/editor/EditorListPanel.tsx \
  src/components/editor/TravelEditor.test.tsx \
  src/lib/editorModel.ts src/lib/editorModel.test.ts
git commit -S -m "feat: edit five transport modes with waypoints"
```

---

## Task 3: Unified Routes and Scene Geometry

**Files:**
- Create: `src/lib/trackGeometry.ts`
- Modify: `src/lib/tracks.ts`
- Modify: `src/lib/tracks.test.ts`
- Modify: `src/lib/journeyScene.ts`
- Modify: `src/lib/journeyScene.test.ts`

- [ ] **Step 1: Rewrite the track tests around one route per trip**

Replace `src/lib/tracks.test.ts` with tests that use the same `base` fixture and
these assertions:

```ts
import { describe, expect, it } from 'vitest'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'

const base: TravelData = {
  meta: { owner: 't', homeCity: 'beijing', version: 2 },
  cities: [
    { id: 'beijing', name: '北京', lat: 39.9042, lng: 116.4074, province: '北京', country: '中国' },
    { id: 'shanghai', name: '上海', lat: 31.2304, lng: 121.4737, province: '上海', country: '中国' },
    { id: 'jiaxing', name: '嘉兴', lat: 30.7522, lng: 120.7555, province: '浙江', country: '中国' },
  ],
  journeys: [],
  trips: [],
  visits: [],
}

const withTrips = (trips: TravelData['trips']): TravelData => ({ ...base, trips })

describe('buildTracks', () => {
  it('makes one route with full stops and ordered legs', () => {
    const [route] = buildTracks(withTrips([
      { id: 't1', journeyId: 'j-test', date: '2025-05-01', type: 'ship', from: 'beijing', to: 'shanghai', waypoints: ['jiaxing'], note: '夜航' },
    ])).routes

    expect(route.type).toBe('ship')
    expect(route.stops.map((city) => city.id))
      .toEqual(['beijing', 'jiaxing', 'shanghai'])
    expect(route.legs.map((leg) => [leg.from.id, leg.to.id]))
      .toEqual([['beijing', 'jiaxing'], ['jiaxing', 'shanghai']])
    expect(route.label).toBe('2025-05-01 · 北京 → 嘉兴 → 上海 · 夜航')
    expect(route.points[0]).toEqual([39.9042, 116.4074])
    expect(route.points.at(-1)).toEqual([31.2304, 121.4737])
    expect(route.points).toContainEqual([30.7522, 120.7555])
  })

  it.each(['flight', 'train', 'metro', 'ship', 'car'] as const)(
    'uses registry styling for %s',
    (type) => {
      const [route] = buildTracks(withTrips([
        { id: 't1', journeyId: 'j-test', date: '2025-05-01', type, from: 'beijing', to: 'shanghai', waypoints: [] },
      ])).routes
      expect(route.color).toBe(getTransportMode(type).route.colorHex)
      expect(route.routeShape).toBe(getTransportMode(type).route.shape)
    },
  )

  it('separates each flight leg and repeated surface corridors', () => {
    const flights = buildTracks(withTrips([
      { id: 'f1', journeyId: 'j-test', date: '2025-05-01', type: 'flight', from: 'beijing', to: 'shanghai', waypoints: ['jiaxing'] },
      { id: 'f2', journeyId: 'j-test', date: '2025-05-02', type: 'flight', from: 'shanghai', to: 'beijing', waypoints: ['jiaxing'] },
    ])).routes
    expect(flights[0].legs).toHaveLength(2)
    expect(flights[1].legs[0].altitude)
      .toBeGreaterThan(flights[0].legs[0].altitude)

    const surface = buildTracks(withTrips([
      { id: 's1', journeyId: 'j-test', date: '2025-05-01', type: 'train', from: 'beijing', to: 'shanghai', waypoints: [] },
      { id: 's2', journeyId: 'j-test', date: '2025-05-02', type: 'car', from: 'shanghai', to: 'beijing', waypoints: [] },
    ])).routes
    expect(surface[0].points[16]).not.toEqual(surface[1].points[16])
  })

  it('skips routes with any missing city', () => {
    expect(buildTracks(withTrips([
      { id: 't1', journeyId: 'j-test', date: '2025-05-01', type: 'car', from: 'beijing', to: 'nowhere', waypoints: [] },
    ])).routes).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk vitest src/lib/tracks.test.ts src/lib/journeyScene.test.ts
```

Expected: FAIL because `Tracks` still exposes separate `flights` and `trains`.

- [ ] **Step 3: Implement reusable corridor geometry**

Create `src/lib/trackGeometry.ts`:

```ts
import type { City } from '@/types'
import { greatCirclePoints } from '@/lib/geo'

const DEG = Math.PI / 180

export function corridorKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

export function laneOffsetDegrees(duplicateIndex: number, spacing: number): number {
  if (duplicateIndex === 0 || spacing === 0) return 0
  const lane = Math.ceil(duplicateIndex / 2)
  return (duplicateIndex % 2 === 1 ? lane : -lane) * spacing
}

export function offsetSurfaceSegment(
  from: City,
  to: City,
  offsetDeg: number,
): [number, number][] {
  const points = greatCirclePoints(from, to, 32)
  if (offsetDeg === 0 || points.length <= 2) return points
  const dLat = to.lat - from.lat
  const dLng = (((to.lng - from.lng + 540) % 360) - 180)
  const length = Math.hypot(dLat, dLng)
  if (length === 0) return points

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point
    const distance = Math.sin(Math.PI * index / (points.length - 1)) * offsetDeg
    const lat = point[0] + (-dLng / length) * distance
    const lngScale = Math.max(0.2, Math.cos(point[0] * DEG))
    const lng = point[1] + (dLat / length) * distance / lngScale
    return [
      Math.max(-89.999, Math.min(89.999, lat)),
      ((lng + 540) % 360) - 180,
    ]
  })
}

export function appendSegment(
  target: [number, number][],
  segment: [number, number][],
): void {
  target.push(...(target.length === 0 ? segment : segment.slice(1)))
}
```

- [ ] **Step 4: Replace the track model with TransportRoute**

Rewrite `src/lib/tracks.ts` around these public types and core loop:

```ts
import type { City, TravelData, TransportType, Trip } from '@/types'
import { resolveCities } from '@/lib/cities'
import { compareDate } from '@/lib/date'
import { flightArcAltitude, greatCirclePoints, haversineKm } from '@/lib/geo'
import { getTransportMode } from '@/lib/transportModes'
import {
  appendSegment,
  corridorKey,
  laneOffsetDegrees,
  offsetSurfaceSegment,
} from '@/lib/trackGeometry'

export interface TransportRouteLeg {
  from: City
  to: City
  points: [number, number][]
  altitude: number
  midLat: number
  midLng: number
}

export interface TransportRoute {
  trip: Trip
  type: TransportType
  routeShape: 'arc' | 'surface'
  color: string
  stops: City[]
  legs: TransportRouteLeg[]
  points: [number, number][]
  altitude: number
  label: string
  midLat: number
  midLng: number
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface Tracks {
  routes: TransportRoute[]
}

export function buildTracks(data: TravelData): Tracks {
  const cityMap = resolveCities(data)
  const corridorCounts = new Map<string, number>()
  const routes: TransportRoute[] = []

  for (const trip of [...data.trips].sort((a, b) =>
    compareDate(a.date, b.date) || a.id.localeCompare(b.id))) {
    const ids = [trip.from, ...trip.waypoints, trip.to]
    const stops = ids.map((id) => cityMap.get(id))
    if (stops.some((city) => !city)) continue
    const cities = stops as City[]
    const mode = getTransportMode(trip.type)
    const legs: TransportRouteLeg[] = []

    for (let index = 1; index < cities.length; index += 1) {
      const from = cities[index - 1]
      const to = cities[index]
      const countKey = `${mode.route.shape}|${corridorKey(from.id, to.id)}`
      const duplicate = corridorCounts.get(countKey) ?? 0
      corridorCounts.set(countKey, duplicate + 1)
      const distance = haversineKm(from, to)
      const points = mode.route.shape === 'arc'
        ? greatCirclePoints(from, to, 32)
        : offsetSurfaceSegment(
            from,
            to,
            laneOffsetDegrees(duplicate, mode.route.laneOffsetDeg),
          )
      const altitude = mode.route.shape === 'arc'
        ? flightArcAltitude(distance) * (1 + duplicate * 0.18)
        : mode.route.baseAltitude
      const mid = points[Math.floor(points.length / 2)]
      legs.push({ from, to, points, altitude, midLat: mid[0], midLng: mid[1] })
    }

    const points: [number, number][] = []
    for (const leg of legs) appendSegment(points, leg.points)
    const midpoint = points[Math.floor(points.length / 2)]
    const names = cities.map((city) => city.name).join(' → ')

    routes.push({
      trip,
      type: trip.type,
      routeShape: mode.route.shape,
      color: mode.route.colorHex,
      stops: cities,
      legs,
      points,
      altitude: Math.max(...legs.map((leg) => leg.altitude)),
      label: `${trip.date} · ${names}${trip.note ? ` · ${trip.note}` : ''}`,
      midLat: midpoint[0],
      midLng: midpoint[1],
      fromLat: cities[0].lat,
      fromLng: cities[0].lng,
      toLat: cities.at(-1)!.lat,
      toLng: cities.at(-1)!.lng,
    })
  }

  return { routes }
}
```

- [ ] **Step 5: Make scene routes registry-driven**

Replace `src/lib/journeyScene.ts` with:

```ts
import type { TransportType } from '@/types'
import type { Tracks } from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'

export interface SceneRoutePoint {
  lat: number
  lng: number
  altitude: number
}

export interface SceneRoute {
  id: string
  type: TransportType
  color: number
  dashed: boolean
  points: SceneRoutePoint[]
}

export function buildJourneySceneRoutes(tracks: Tracks): SceneRoute[] {
  return tracks.routes.map((route) => {
    const mode = getTransportMode(route.type)
    const points = route.legs.flatMap((leg) => leg.points.map(
      ([lat, lng], index) => {
        const progress = index / Math.max(1, leg.points.length - 1)
        return {
          lat,
          lng,
          altitude: mode.route.shape === 'arc'
            ? mode.route.baseAltitude
              + Math.sin(progress * Math.PI) * leg.altitude
            : mode.route.baseAltitude,
        }
      },
    ))
    return {
      id: route.trip.id,
      type: route.type,
      color: mode.route.colorNumber,
      dashed: mode.route.dashed,
      points,
    }
  })
}
```

- [ ] **Step 6: Update scene tests**

In `src/lib/journeyScene.test.ts`, assert all five types from a fixture and:

```ts
expect(routes).toHaveLength(5)
expect(routes.find((route) => route.type === 'flight')?.dashed).toBe(true)
expect(routes.find((route) => route.type === 'metro')?.dashed).toBe(true)
expect(routes.find((route) => route.type === 'ship')?.color).toBe(0x60a5fa)
expect(routes.find((route) => route.type === 'car')?.color).toBe(0x86efac)
```

- [ ] **Step 7: Run focused geometry tests**

Run:

```bash
rtk vitest src/lib/tracks.test.ts src/lib/journeyScene.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/lib/trackGeometry.ts src/lib/tracks.ts src/lib/tracks.test.ts \
  src/lib/journeyScene.ts src/lib/journeyScene.test.ts
git commit -S -m "feat: build unified transport routes"
```

---

## Task 4: Vehicle Paths, Per-Leg Motion, and Stop Holds

**Files:**
- Modify: `src/lib/vehicleTiming.ts`
- Modify: `src/lib/vehicle.ts`
- Modify: `src/lib/vehicleMotion.ts`
- Modify: `src/lib/vehicle.test.ts`
- Modify: `src/lib/vehicleMotion.test.ts`
- Modify: `src/lib/vehicleRuntime.test.ts`
- Modify: `src/components/globe/hooks/useVehicleRuntime.test.tsx`

- [ ] **Step 1: Write failing multi-leg motion tests**

Replace the fixtures in `src/lib/vehicleMotion.test.ts` with:

```ts
const travelData = data as TravelData
const routes = buildTracks(travelData).routes
const flightRoute = buildVehicleRoute(
  routes.find((route) => route.type === 'flight')!,
)
const trainRoute = buildVehicleRoute(
  routes.find((route) => route.type === 'train')!,
)
const shipRoute = buildVehicleRoute(
  routes.find((route) => route.type === 'ship') ??
  routes.find((route) => route.type === 'train')!,
)
```

Add:

```ts
it.each(['flight', 'train', 'metro', 'ship', 'car'] as const)(
  'keeps %s duration, attitude and stop timing inside the registry bounds',
  (type) => {
    const mode = getTransportMode(type)
    const track = routes.find((route) => route.type === type)
      ?? routes[0]
    const route = buildVehicleRoute({ ...track, type })
    expect(route.durationMs - route.stopHoldMs)
      .toBeGreaterThanOrEqual(mode.motion.minDurationMs)
    expect(route.durationMs - route.stopHoldMs)
      .toBeLessThanOrEqual(mode.motion.maxDurationMs)
    for (const ratio of [0, 0.1, 0.5, 0.9, 1]) {
      const frame = vehicleMotionAt(route, route.durationMs * ratio)
      expect(Math.abs(frame.pitchDeg)).toBeLessThanOrEqual(mode.motion.maxPitchDeg)
      expect(Math.abs(frame.rollDeg)).toBeLessThanOrEqual(mode.motion.maxRollDeg)
    }
  },
)

it('holds a multi-leg route at each waypoint before continuing', () => {
  const route = trainRoute
  expect(route.legs.length).toBeGreaterThan(1)
  expect(route.stopHoldMs).toBe(700)
  const firstStop = route.legs[0].endProgress
  const stopAt = route.legs[0].endMs
  const frame = vehicleMotionAt(route, stopAt + 10)
  expect(frame.phase).toBe('stopped')
  expect(frame.progress).toBeCloseTo(firstStop, 8)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk vitest src/lib/vehicle.test.ts src/lib/vehicleMotion.test.ts \
  src/lib/vehicleRuntime.test.ts
```

Expected: FAIL because `VehicleRoute` still represents a single path and
motion only supports flight/train phase tables.

- [ ] **Step 3: Move duration calculation to the registry**

Replace `src/lib/vehicleTiming.ts` with:

```ts
import type { TransportType } from '@/types'
import { getTransportMode } from '@/lib/transportModes'

export const VEHICLE_STOP_HOLD_MS = 700

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export function smoothstep(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function vehicleDurationForDistance(
  type: TransportType,
  distanceKm: number,
): number {
  const motion = getTransportMode(type).motion
  const ratio = clamp01(
    (Math.max(0, distanceKm) - motion.distanceStartKm)
      / Math.max(1, motion.distanceRangeKm),
  )
  return Math.round(
    motion.minDurationMs
      + ratio * (motion.maxDurationMs - motion.minDurationMs),
  )
}

export function legAltitudeEnvelope(
  type: TransportType,
  localProgress: number,
  cruiseAltitude: number,
): number {
  const mode = getTransportMode(type)
  if (mode.route.shape !== 'arc') return cruiseAltitude
  const phases = mode.motion.phases
  const climbEnd = phases[0].weight + phases[1].weight
  const descentStart = 1 - phases[4].weight - phases[3].weight
  const t = clamp01(localProgress)
  if (t <= 0 || t >= 1) return 0
  if (t < climbEnd) return smoothstep(t / climbEnd) * cruiseAltitude
  if (t <= descentStart) return cruiseAltitude
  return (1 - smoothstep((t - descentStart) / (1 - descentStart)))
    * cruiseAltitude
}
```

- [ ] **Step 4: Implement multi-leg vehicle paths**

In `src/lib/vehicle.ts`, replace the public route types and builders with:

```ts
import type { TransportType } from '@/types'
import type { TransportRoute } from '@/lib/tracks'
import { greatCirclePoints, haversineKm } from '@/lib/geo'
import { getTransportMode } from '@/lib/transportModes'
import {
  VEHICLE_STOP_HOLD_MS,
  legAltitudeEnvelope,
  vehicleDurationForDistance,
} from '@/lib/vehicleTiming'

export interface VehicleRouteLeg {
  points: [number, number][]
  altitude: number
  distanceKm: number
  startProgress: number
  endProgress: number
  startMs: number
  durationMs: number
  toName: string
}

export interface VehicleRoute {
  type: TransportType
  points: [number, number][]
  legs: VehicleRouteLeg[]
  altitude: number
  distanceKm: number
  movementDurationMs: number
  stopHoldMs: number
  durationMs: number
}

export interface VehiclePlayback {
  key: number
  tripId: string
  type: TransportType
  route: VehicleRoute
  label: string
}

function pathDistanceKm(points: [number, number][]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    total += haversineKm(
      { lat: previous[0], lng: previous[1] },
      { lat: current[0], lng: current[1] },
    )
  }
  return total
}

function resampleByDistance(
  points: [number, number][],
): [number, number][] {
  if (points.length <= 2) return points.map((point) => [...point])
  const targetCount = Math.max(2, points.length)
  const distances = points.slice(1).map((point, index) => haversineKm(
    { lat: points[index][0], lng: points[index][1] },
    { lat: point[0], lng: point[1] },
  ))
  const total = distances.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return points.map((point) => [...point])

  const result: [number, number][] = [[...points[0]]]
  let segment = 0
  let covered = 0
  for (let index = 1; index < targetCount - 1; index += 1) {
    const target = total * index / (targetCount - 1)
    while (segment < distances.length - 1 && covered + distances[segment] < target) {
      covered += distances[segment]
      segment += 1
    }
    const from = points[segment]
    const to = points[segment + 1]
    const t = distances[segment] <= 0
      ? 0
      : (target - covered) / distances[segment]
    const rawLng = to[1] - from[1]
    const lngDelta = rawLng > 180 ? rawLng - 360 : rawLng < -180 ? rawLng + 360 : rawLng
    result.push([
      from[0] + (to[0] - from[0]) * t,
      ((from[1] + lngDelta * t + 540) % 360) - 180,
    ])
  }
  result.push([...points.at(-1)!])
  return result
}

function allocateLegDurations(
  totalMs: number,
  distances: number[],
): number[] {
  if (distances.length === 1) return [totalMs]
  const floor = Math.min(900, Math.floor(totalMs / (distances.length * 2)))
  const flex = totalMs - floor * distances.length
  const distanceTotal = distances.reduce((sum, value) => sum + value, 0) || 1
  const durations = distances.map((distance) =>
    floor + Math.floor(flex * distance / distanceTotal))
  const remaining = totalMs - durations.reduce((sum, value) => sum + value, 0)
  durations[durations.length - 1] += remaining
  return durations
}

export function buildVehicleRoute(track: TransportRoute): VehicleRoute {
  const mode = getTransportMode(track.type)
  const legPoints = track.legs.map((leg) => {
    const points = mode.route.shape === 'arc'
      ? greatCirclePoints(leg.from, leg.to, 64)
      : resampleByDistance(leg.points)
    return {
      points,
      altitude: leg.altitude,
      distanceKm: pathDistanceKm(points),
      toName: leg.to.name,
    }
  })
  const distanceKm = legPoints.reduce((sum, leg) => sum + leg.distanceKm, 0)
  const movementDurationMs = vehicleDurationForDistance(track.type, distanceKm)
  const legDurations = allocateLegDurations(
    movementDurationMs,
    legPoints.map((leg) => leg.distanceKm),
  )
  const stopHoldMs = (legPoints.length - 1) * VEHICLE_STOP_HOLD_MS
  const points: [number, number][] = []
  let distanceCursor = 0
  let elapsedCursor = 0
  const legs = legPoints.map((leg, index) => {
    const startProgress = distanceKm <= 0 ? 0 : distanceCursor / distanceKm
    distanceCursor += leg.distanceKm
    const endProgress = distanceKm <= 0 ? 1 : distanceCursor / distanceKm
    if (index > 0) elapsedCursor += VEHICLE_STOP_HOLD_MS
    const startMs = elapsedCursor
    elapsedCursor += legDurations[index]
    points.push(...(points.length === 0 ? leg.points : leg.points.slice(1)))
    return {
      ...leg,
      startProgress,
      endProgress,
      startMs,
      durationMs: legDurations[index],
    }
  })

  return {
    type: track.type,
    points,
    legs,
    altitude: Math.max(...legs.map((leg) => leg.altitude)),
    distanceKm,
    movementDurationMs,
    stopHoldMs,
    durationMs: movementDurationMs + stopHoldMs,
  }
}

export interface VehiclePosition {
  lat: number
  lng: number
  altitude: number
}

function samplePath(
  points: [number, number][],
  progress: number,
): [number, number] {
  if (points.length === 0) return [0, 0]
  const t = Math.max(0, Math.min(1, progress))
  if (t <= 0) return points[0]
  if (t >= 1) return points.at(-1)!
  const index = Math.floor(t * (points.length - 1))
  const fraction = t * (points.length - 1) - index
  const from = points[index]
  const to = points[index + 1]
  const rawLng = to[1] - from[1]
  const lngDelta = rawLng > 180 ? rawLng - 360 : rawLng < -180 ? rawLng + 360 : rawLng
  return [
    from[0] + (to[0] - from[0]) * fraction,
    ((from[1] + lngDelta * fraction + 540) % 360) - 180,
  ]
}

function legAtProgress(route: VehicleRoute, progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  return route.legs.find((leg, index) =>
    index === route.legs.length - 1
      || (t >= leg.startProgress && t < leg.endProgress))
    ?? route.legs.at(-1)!
}

export function vehicleAltitudeAt(
  route: VehicleRoute,
  progress: number,
): number {
  const leg = legAtProgress(route, progress)
  if (!leg) return 0
  const span = Math.max(1e-9, leg.endProgress - leg.startProgress)
  const local = (Math.max(0, Math.min(1, progress)) - leg.startProgress) / span
  const mode = getTransportMode(route.type)
  return mode.route.shape === 'arc'
    ? legAltitudeEnvelope(route.type, local, leg.altitude)
    : leg.altitude
}

export function sampleVehicleRoute(
  route: VehicleRoute,
  progress: number,
): VehiclePosition {
  const t = Math.max(0, Math.min(1, progress))
  const leg = legAtProgress(route, t)
  if (!leg) return { lat: 0, lng: 0, altitude: 0 }
  const span = Math.max(1e-9, leg.endProgress - leg.startProgress)
  const local = (t - leg.startProgress) / span
  const [lat, lng] = samplePath(leg.points, local)
  return { lat, lng, altitude: vehicleAltitudeAt(route, t) }
}
```

Remove the old `TRAIN_ALTITUDE` export and update tests to assert registry
base altitude through `getTransportMode(type).route.baseAltitude`.

- [ ] **Step 5: Implement the five-phase schedule and stop holds**

Rewrite `src/lib/vehicleMotion.ts` around a schedule exported for tests:

```ts
import type { TransportType } from '@/types'
import {
  getTransportMode,
  type TransportPhaseId,
} from '@/lib/transportModes'
import {
  sampleVehicleRoute,
  vehicleAltitudeAt,
  type VehiclePosition,
  type VehicleRoute,
} from '@/lib/vehicle'

export const VEHICLE_PRE_ROLL_MS = 650
export const VEHICLE_ARRIVAL_HOLD_MS = 1000
export const VEHICLE_ARRIVAL_RETURN_MS = 900
export const VEHICLE_ARRIVAL_TOTAL_MS =
  VEHICLE_ARRIVAL_HOLD_MS + VEHICLE_ARRIVAL_RETURN_MS

export function vehicleNodeDurationMs(motionDurationMs: number): number {
  return VEHICLE_PRE_ROLL_MS + motionDurationMs + VEHICLE_ARRIVAL_TOTAL_MS
}

export type VehicleMotionPhase =
  | TransportPhaseId
  | 'stopped'
  | 'arrived'

export interface VehicleMotionFrame {
  elapsedMs: number
  durationMs: number
  phase: VehicleMotionPhase
  phaseLabel: string
  phaseProgress: number
  progress: number
  altitude: number
  pitchDeg: number
  rollDeg: number
  position: VehiclePosition
}

interface ScheduledPhase {
  phase: VehicleMotionPhase
  label: string
  startMs: number
  endMs: number
  startProgress: number
  endProgress: number
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function headingAt(route: VehicleRoute, progress: number): number {
  const before = sampleVehicleRoute(route, Math.max(0, progress - 0.004))
  const after = sampleVehicleRoute(route, Math.min(1, progress + 0.004))
  const deltaLng = ((after.lng - before.lng + 540) % 360) - 180
  return Math.atan2(
    after.lat - before.lat,
    deltaLng * Math.cos(((before.lat + after.lat) / 2) * Math.PI / 180),
  )
}

function rollAt(type: TransportType, route: VehicleRoute, progress: number, elapsedMs: number) {
  const mode = getTransportMode(type)
  if (progress <= 0 || progress >= 1) return 0
  const before = headingAt(route, Math.max(0, progress - 0.01))
  const after = headingAt(route, Math.min(1, progress + 0.01))
  const turn = ((after - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  const bobRoll = mode.motion.bobPeriodMs > 0
    ? Math.sin(elapsedMs / mode.motion.bobPeriodMs * Math.PI * 2) * 2
    : 0
  return Math.max(
    -mode.motion.maxRollDeg,
    Math.min(mode.motion.maxRollDeg, turn * mode.motion.rollScale + bobRoll),
  )
}

export function buildVehicleMotionSchedule(route: VehicleRoute): ScheduledPhase[] {
  const mode = getTransportMode(route.type)
  const schedule: ScheduledPhase[] = []

  route.legs.forEach((leg, legIndex) => {
    let cursor = leg.startMs
    for (const phase of mode.motion.phases) {
      const duration = phase.weight * leg.durationMs
      const startProgress = leg.startProgress
        + (leg.endProgress - leg.startProgress)
          * ((cursor - leg.startMs) / leg.durationMs)
      const endProgress = phase === mode.motion.phases.at(-1)
        ? leg.endProgress
        : leg.startProgress
          + (leg.endProgress - leg.startProgress)
            * ((cursor + duration - leg.startMs) / leg.durationMs)
      schedule.push({
        phase: phase.id,
        label: phase.label,
        startMs: cursor,
        endMs: cursor + duration,
        startProgress,
        endProgress,
      })
      cursor += duration
    }
    if (legIndex < route.legs.length - 1) {
      schedule.push({
        phase: 'stopped',
        label: `${mode.motion.stopLabel} ${leg.toName}`,
        startMs: cursor,
        endMs: cursor + 700,
        startProgress: leg.endProgress,
        endProgress: leg.endProgress,
      })
    }
  })
  return schedule
}

export function vehicleMotionAt(
  route: VehicleRoute,
  elapsedMs: number,
): VehicleMotionFrame {
  const mode = getTransportMode(route.type)
  const elapsed = Math.max(0, Math.min(route.durationMs, elapsedMs))
  if (elapsed >= route.durationMs) {
    return {
      elapsedMs: elapsed,
      durationMs: route.durationMs,
      phase: 'arrived',
      phaseLabel: mode.motion.arrivalLabel,
      phaseProgress: 1,
      progress: 1,
      altitude: vehicleAltitudeAt(route, 1),
      pitchDeg: 0,
      rollDeg: 0,
      position: sampleVehicleRoute(route, 1),
    }
  }

  const schedule = buildVehicleMotionSchedule(route)
  const item = schedule.find((phase, index) =>
    elapsed < phase.endMs || index === schedule.length - 1)!
  const phaseProgress = clamp01(
    (elapsed - item.startMs) / Math.max(1, item.endMs - item.startMs),
  )
  const progress = item.startProgress
    + (item.endProgress - item.startProgress) * phaseProgress
  const altitudeBase = vehicleAltitudeAt(route, progress)
  const bob = mode.motion.bobPeriodMs > 0
    ? Math.sin(elapsed / mode.motion.bobPeriodMs * Math.PI * 2)
      * mode.motion.bobAmplitude
    : 0
  const pitchDeg = item.phase === 'accelerate' && route.type === 'flight'
    ? Math.sin(Math.PI * phaseProgress) * mode.motion.maxPitchDeg
    : item.phase === 'decelerate' && route.type === 'flight'
      ? -Math.sin(Math.PI * phaseProgress) * mode.motion.maxPitchDeg
      : 0

  return {
    elapsedMs: elapsed,
    durationMs: route.durationMs,
    phase: item.phase,
    phaseLabel: item.label,
    phaseProgress,
    progress,
    altitude: altitudeBase + bob,
    pitchDeg,
    rollDeg: item.phase === 'stopped' ? 0 : rollAt(route.type, route, progress, elapsed),
    position: {
      ...sampleVehicleRoute(route, progress),
      altitude: altitudeBase + bob,
    },
  }
}
```

- [ ] **Step 6: Run focused path and motion tests**

Run:

```bash
rtk vitest src/lib/vehicle.test.ts src/lib/vehicleMotion.test.ts \
  src/lib/vehicleRuntime.test.ts \
  src/components/globe/hooks/useVehicleRuntime.test.tsx
```

Expected: PASS, including a stop phase at each intermediate city.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/lib/vehicleTiming.ts src/lib/vehicle.ts \
  src/lib/vehicleMotion.ts src/lib/vehicle.test.ts \
  src/lib/vehicleMotion.test.ts src/lib/vehicleRuntime.test.ts \
  src/components/globe/hooks/useVehicleRuntime.test.tsx
git commit -S -m "feat: animate five transport modes across waypoints"
```

---

## Task 5: Globe Presentation, Cameras, Assets, and Stop Markers

**Files:**
- Create: `public/vehicle-icons/metro-3d.svg`
- Create: `public/vehicle-icons/ship-3d.svg`
- Create: `public/vehicle-icons/car-3d.svg`
- Modify: `src/lib/routeCamera.ts`
- Modify: `src/lib/routeCamera.test.ts`
- Modify: `src/components/globe/hooks/useTrackPresentation.ts`
- Modify: `src/components/globe/hooks/useVehiclePlayback.ts`
- Modify: `src/components/globe/hooks/useVehicleDirectorCamera.ts`
- Modify: `src/components/globe/VehicleOverlay.tsx`
- Modify: `src/components/globe/VehicleCameraStatus.tsx`
- Modify: `src/components/globe/SceneRouteOverlay.tsx`
- Modify: `src/components/globe/RouteFlowOverlay.tsx`
- Modify: `src/components/globe/vehicleTrail.ts`
- Modify: `src/components/globe/VehicleTrailLayer.tsx`
- Modify: `src/components/globe/useVehicleMotionEffects.ts`
- Modify: `src/components/globe/cityMarkers.ts`
- Modify: `src/components/globe/cityMarkers.test.tsx`
- Modify: `src/components/globe/hooks/useGlobeMarkers.ts`
- Modify: `src/components/globe/TravelGlobe.tsx`
- Modify: `src/hooks/useTravelWorkspaceController.ts`
- Modify: `src/styles/motion-vehicle.css`
- Modify: `src/styles/motion-replay.css`

- [ ] **Step 1: Write failing camera and stop-marker tests**

In `src/lib/routeCamera.test.ts`, replace the hand-built route shape and add:

```ts
it.each([
  ['flight', 0.62],
  ['train', 0.34],
  ['metro', 0.25],
  ['ship', 0.43],
  ['car', 0.3],
] as const)('uses the registry camera altitude for %s', (type, altitude) => {
  const route = buildVehicleRoute({
    ...flightTrack,
    type,
  })
  const pose = buildRouteCameraPose(
    fakeGlobe,
    route,
    vehicleMotionAt(route, route.durationMs * 0.5),
  )
  expect(Math.hypot(...pose.position)).toBeCloseTo(RADIUS * (1 + altitude), 4)
})
```

In `src/components/globe/cityMarkers.test.tsx`, add:

```tsx
it('renders a non-interactive mode-colored waypoint marker', () => {
  const element = buildWaypointMarker({
    id: 'jiaxing',
    name: '嘉兴',
    lat: 30.75,
    lng: 120.75,
    type: 'train',
  })
  expect(element.dataset.waypointId).toBe('jiaxing')
  expect(element.textContent).toContain('嘉兴')
  expect(element.querySelector('button')).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk vitest src/lib/routeCamera.test.ts \
  src/components/globe/cityMarkers.test.tsx
```

Expected: FAIL because camera profiles are hard-coded and waypoint markers do
not exist.

- [ ] **Step 3: Make the camera registry-driven**

In `src/lib/routeCamera.ts`, replace `CAMERA_PROFILE` with:

```ts
const mode = getTransportMode(route.type)
const position = globe.getCoords(
  focusLat,
  current.lng,
  mode.camera.altitude,
)
```

Use `mode.camera.northLeadDeg` for `focusLat`.

In `useVehicleDirectorCamera.ts`, replace `preparationLabel` with:

```ts
const nextLabel = frame.stage === 'preparing'
  ? getTransportMode(frame.playback.type).camera.preparingLabel
  : frame.motion.phaseLabel
```

- [ ] **Step 4: Switch track and playback selectors to routes**

In `useVehiclePlayback.ts`, replace the track lookup with:

```ts
const track = tracks.routes.find((item) => item.trip.id === selectedTripId)
```

In `useTrackPresentation.ts`, build:

```ts
interface ArcItem {
  route: TransportRoute
  leg: TransportRouteLeg
  stardust: boolean
}

interface PathItem {
  route: TransportRoute
  stardust: boolean
}
```

Filter visible routes with `replayTrackState.completedTripIds`, then:

```ts
const flightItems = [
  ...visibleRoutes.flatMap((route) => (
    route.routeShape === 'arc'
      ? route.legs.map((leg) => ({ route, leg, stardust: false }))
      : []
  )),
  ...(replaying ? [] : (stardustTracks?.routes ?? []).flatMap((route) => (
    route.routeShape === 'arc'
      ? route.legs.map((leg) => ({ route, leg, stardust: true }))
      : []
  ))),
]

const pathItems = [
  ...visibleRoutes
    .filter((route) => route.routeShape === 'surface')
    .map((route) => ({ route, stardust: false })),
  ...(replaying ? [] : (stardustTracks?.routes ?? [])
    .filter((route) => route.routeShape === 'surface')
    .map((route) => ({ route, stardust: true }))),
]
```

For arc and path callbacks, obtain colors and widths from
`getTransportMode(item.route.type).route`. Keep stardust alpha at `0.075`
for arcs and `0.065` for paths.

Return:

```ts
return {
  trackProps,
  activeCityIds,
  activeRoute,
  visibleTrackCounts: {
    total: visibleRoutes.length,
    surface: visibleRoutes.filter((route) => route.routeShape === 'surface').length,
    stardust: flightItems.filter((item) => item.stardust).length
      + pathItems.filter((item) => item.stardust).length,
  },
}
```

where `activeRoute` is:

```ts
const activeRoute = activeTripId
  ? tracks.routes.find((route) => route.trip.id === activeTripId) ?? null
  : null
```

- [ ] **Step 5: Update scene and flow colors**

In `SceneRouteOverlay.tsx`:

```ts
const lines = routes.map((route) => createSceneLine(globe, route, {
  color: route.color,
  dashed: route.dashed,
  opacity: 0.92,
}))
```

In `RouteFlowOverlay.tsx`, use `route.color` for both flow and breath lines,
with the existing opacity values.

- [ ] **Step 6: Drive trails and vehicle marker styling from the registry**

In `vehicleTrail.ts`:

```ts
const mode = getTransportMode(route.type)
const material = mode.route.dashed
  ? new LineDashedMaterial({
      color: mode.trail.colorNumber,
      dashSize: mode.trail.dashSize,
      gapSize: mode.trail.gapSize,
      opacity: 0.92,
      transparent: true,
    })
  : new LineBasicMaterial({
      color: mode.trail.colorNumber,
      opacity: 0.88,
      transparent: true,
    })
```

Use `mode.trail.guideStartColor` and `mode.trail.guideEndColor` for the two
guide lines. Call `computeLineDistances()` when `mode.route.dashed` is true.

In `VehicleOverlay.tsx`, replace the icon map with:

```ts
const VEHICLE_ICONS = Object.fromEntries(
  TRANSPORT_TYPES.map((type) => [type, TRANSPORT_MODES[type].iconPath]),
) as Record<TransportType, string>
```

Use `const mode = getTransportMode(playback.type)` and apply:

```tsx
style={{
  background: mode.vehicle.haloColor,
  boxShadow: mode.vehicle.haloShadow,
}}
```

Do not render the `<img>` when `mode.iconPath === ''`.

Pass mode data into `VehicleTrailLayer`:

```tsx
<VehicleTrailLayer
  {...effects.refs}
  type={playback.type}
  color={mode.route.colorRgb}
/>
```

`VehicleTrailLayer` applies `rgba(${color}, .7)` inline to trail dots and sets
`data-vehicle-effect={getTransportMode(type).vehicle.effect}` on the friction
layer.

- [ ] **Step 7: Generalize surface effects and add stop ripple**

In `useVehicleMotionEffects.ts`:

- Rename the friction logic as the generic surface effect.
- Show it whenever `mode.vehicle.effect !== 'contrail'`.
- Use `mode.route.colorRgb` to set each dot's background and box shadow.
- Add `stopRippleRef`, `stopRippledRef`, and:

```ts
const markStop = (
  globe: GlobeMethods,
  route: VehicleRoute,
  progress: number,
  stopKey: string,
) => {
  if (stopRippledRef.current === stopKey) return
  stopRippledRef.current = stopKey
  const host = stopRippleRef.current
  if (!host) return
  const point = screenPoint(globe, sampleVehicleRoute(route, progress))
  host.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
  host.style.setProperty(
    '--rg-stop-color',
    getTransportMode(route.type).route.colorHex,
  )
  host.classList.remove('rg-waypoint-ripple-active')
  void host.offsetWidth
  host.classList.add('rg-waypoint-ripple-active')
}
```

Expose `stopRippleRef` and `markStop`. In `VehicleOverlay`, when
`motion.phase === 'stopped'`, call:

```ts
effects.markStop(
  globe,
  playback.route,
  motion.progress,
  `${playback.tripId}:${motion.progress.toFixed(4)}`,
)
```

Reset that key when playback key changes.

- [ ] **Step 8: Add vehicle-trail and waypoint CSS**

In `motion-replay.css`, add:

```css
.rg-waypoint-ripple {
  display: none;
}

.rg-waypoint-ripple-active {
  display: block;
}

.rg-waypoint-ripple span {
  position: absolute;
  left: -15px;
  top: -15px;
  width: 30px;
  height: 30px;
  border: 1px solid var(--rg-stop-color, rgb(165 243 252 / 0.9));
  border-radius: 999px;
  animation: rg-waypoint-ripple 700ms ease-out both;
}

@keyframes rg-waypoint-ripple {
  from {
    opacity: 0.9;
    transform: scale(0.35);
  }
  to {
    opacity: 0;
    transform: scale(2.2);
  }
}
```

In `motion-vehicle.css`, replace the train-only HUD selectors with generic
`--rg-vehicle-color` variables set inline by `VehicleCameraStatus`.

- [ ] **Step 9: Add waypoint markers to the globe**

In `cityMarkers.ts`, add:

```ts
export interface WaypointMarkerDatum {
  id: string
  name: string
  lat: number
  lng: number
  type: TransportType
}
```

Add `({ kind: 'waypoint' } & WaypointMarkerDatum)` to `GlobeMarker` and:

```ts
export function buildWaypointMarker(d: WaypointMarkerDatum): HTMLElement {
  const mode = getTransportMode(d.type)
  const el = document.createElement('div')
  el.dataset.waypointId = d.id
  el.style.cssText = 'position:relative;width:0;height:0;transform:translate(-50%,-50%);pointer-events:none;'
  el.innerHTML = `
    <span style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;
      border:1.5px solid ${mode.route.colorHex};border-radius:999px;
      box-shadow:0 0 10px rgba(${mode.route.colorRgb},.45);"></span>
    <span style="position:absolute;left:50%;bottom:12px;transform:translateX(-50%);
      padding:2px 7px;border-radius:999px;white-space:nowrap;font-size:10px;
      color:rgba(255,255,255,.82);background:rgba(5,8,17,.72);
      border:1px solid rgba(${mode.route.colorRgb},.3);">${d.name}</span>
  `
  return el
}
```

Modify `useGlobeMarkers` to accept `activeRoute: TransportRoute | null` and append:

```ts
for (const city of activeRoute?.stops.slice(1, -1) ?? []) {
  list.push({
    kind: 'waypoint',
    id: city.id,
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    type: activeRoute!.type,
  })
}
```

In `TravelGlobe.tsx`, destructure `activeRoute` from `useTrackPresentation`,
pass it to `useGlobeMarkers`, and handle:

```ts
: m.kind === 'waypoint'
  ? buildWaypointMarker(m)
  : buildRegionDot(m)
```

Update data attributes:

```tsx
data-visible-transport-tracks={visibleTrackCounts.total}
data-visible-surface-tracks={visibleTrackCounts.surface}
data-visible-stardust-tracks={visibleTrackCounts.stardust}
```

Update `useTravelWorkspaceController.ts`:

```ts
const track = tracks.routes.find((item) => item.trip.id === selectedTripId)
```

- [ ] **Step 10: Create the three vehicle SVG assets**

Create each SVG with a `viewBox="0 0 128 128"`, transparent background,
diagonal three-quarter perspective, two-tone body, window highlights, a white
rim light, and a soft elliptical shadow. Use these stable accents:

```xml
<!-- metro-3d.svg: coral body #FDA4AF, deep #7F1D2D -->
<!-- ship-3d.svg: sea blue hull #60A5FA, deep #1E3A8A -->
<!-- car-3d.svg: sage body #86EFAC, deep #166534 -->
```

Each file must be a standalone `<svg xmlns="http://www.w3.org/2000/svg">`
without scripts, external images, or embedded fonts.

- [ ] **Step 11: Run focused presentation tests and typecheck**

Run:

```bash
rtk vitest src/lib/routeCamera.test.ts \
  src/components/globe/cityMarkers.test.tsx \
  src/components/globe/hooks/useVehicleDirectorCamera.test.tsx \
  src/components/globe/hooks/useVehicleRuntime.test.tsx
pnpm typecheck
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 12: Commit Task 5**

```bash
git add public/vehicle-icons/metro-3d.svg \
  public/vehicle-icons/ship-3d.svg public/vehicle-icons/car-3d.svg \
  src/lib/routeCamera.ts src/lib/routeCamera.test.ts \
  src/components/globe/hooks/useTrackPresentation.ts \
  src/components/globe/hooks/useVehiclePlayback.ts \
  src/components/globe/hooks/useVehicleDirectorCamera.ts \
  src/components/globe/VehicleOverlay.tsx \
  src/components/globe/VehicleCameraStatus.tsx \
  src/components/globe/SceneRouteOverlay.tsx \
  src/components/globe/RouteFlowOverlay.tsx \
  src/components/globe/vehicleTrail.ts \
  src/components/globe/VehicleTrailLayer.tsx \
  src/components/globe/useVehicleMotionEffects.ts \
  src/components/globe/cityMarkers.ts \
  src/components/globe/cityMarkers.test.tsx \
  src/components/globe/hooks/useGlobeMarkers.ts \
  src/components/globe/TravelGlobe.tsx \
  src/hooks/useTravelWorkspaceController.ts \
  src/styles/motion-vehicle.css src/styles/motion-replay.css
git commit -S -m "feat: present five transport vehicles on the globe"
```

---

## Task 6: Stats, Timeline, Cards, Hero, Search, and Editor List

**Files:**
- Modify: `src/lib/derive.ts:80-126`
- Modify: `src/lib/derive.test.ts:93-113`
- Create: `src/components/stats/TransportMix.tsx`
- Create: `src/components/stats/TransportMix.test.tsx`
- Modify: `src/components/stats/StatsPanel.tsx`
- Modify: `src/components/timeline/items.ts`
- Modify: `src/components/timeline/TimelineNode.tsx`
- Modify: `src/lib/timelineItems.test.ts`
- Modify: `src/components/city/CityCard.tsx:140-180`
- Modify: `src/components/journey/PlaceChapter.tsx:160-190`
- Modify: `src/components/hero/HeroPhoto.tsx:45-75`
- Modify: `src/lib/travelSearch.ts:135-166`
- Modify: `src/lib/travelSearch.test.ts`

- [ ] **Step 1: Write failing 5-mode statistics and search tests**

Replace the count assertions in `src/lib/derive.test.ts` with:

```ts
expect(s.tripCount).toBe(5)
expect(s.transportCounts).toEqual({
  flight: 4,
  train: 1,
  metro: 0,
  ship: 0,
  car: 0,
})
expect(Object.values(s.transportCounts).reduce((sum, count) => sum + count, 0))
  .toBe(s.tripCount)
```

Create `src/components/stats/TransportMix.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransportMix from '@/components/stats/TransportMix'

describe('TransportMix', () => {
  it('always renders all five modes, including zero counts', () => {
    render(
      <TransportMix
        counts={{ flight: 2, train: 1, metro: 0, ship: 3, car: 0 }}
      />,
    )
    expect(screen.getByLabelText('飞机 2')).toBeTruthy()
    expect(screen.getByLabelText('地铁 0')).toBeTruthy()
    expect(screen.getByLabelText('轮船 3')).toBeTruthy()
    expect(screen.getByLabelText('汽车 0')).toBeTruthy()
  })
})
```

Add to `src/lib/travelSearch.test.ts`:

```ts
it('matches mode names and common transport terms', () => {
  const metroData = structuredClone(data)
  metroData.trips[1].type = 'metro'
  metroData.trips[1].note = '2 号线'
  expect(searchTravelData(metroData, '地铁')[0].tripId).toBe('t002')
  expect(searchTravelData(metroData, 'subway')[0].tripId).toBe('t002')
  expect(searchTravelData(metroData, '2 号线')[0].tripId).toBe('t002')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk vitest src/lib/derive.test.ts \
  src/components/stats/TransportMix.test.tsx \
  src/lib/travelSearch.test.ts
```

Expected: FAIL because `TravelStats` still exposes `flightCount` and
`trainCount`, and `TransportMix` does not exist.

- [ ] **Step 3: Replace binary statistics**

In `src/lib/derive.ts`:

```ts
import type {
  City,
  TimelineNodeKind,
  TransportType,
  TravelData,
  Trip,
  Visit,
} from '@/types'
import { TRANSPORT_TYPES } from '@/lib/transportModes'
```

```ts
export interface TravelStats {
  cityCount: number
  provinceCount: number
  countryCount: number
  tripCount: number
  transportCounts: Record<TransportType, number>
  totalDistanceKm: number
  firstDate: string | null
  lastDate: string | null
}
```

Inside `computeStats`:

```ts
const transportCounts = Object.fromEntries(
  TRANSPORT_TYPES.map((type) => [type, 0]),
) as Record<TransportType, number>
for (const trip of data.trips) transportCounts[trip.type] += 1
```

Return:

```ts
tripCount: data.trips.length,
transportCounts,
```

- [ ] **Step 4: Implement the five-column mix**

Create `src/components/stats/TransportMix.tsx`:

```tsx
import type { TransportType } from '@/types'
import { TRANSPORT_MODES, TRANSPORT_TYPES } from '@/lib/transportModes'

interface Props {
  counts: Record<TransportType, number>
}

export default function TransportMix({ counts }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1" aria-label="交通构成">
      {TRANSPORT_TYPES.map((type) => {
        const mode = TRANSPORT_MODES[type]
        return (
          <div
            key={type}
            aria-label={`${mode.label} ${counts[type]}`}
            className="rounded-lg border border-white/7 bg-white/[.025] px-1 py-1.5 text-center"
          >
            <span className="block text-[11px]" aria-hidden>{mode.icon}</span>
            <span
              className="mt-0.5 block text-xs font-semibold tabular-nums"
              style={{ color: mode.route.colorHex }}
            >
              {counts[type]}
            </span>
            <span className="block text-[8px] tracking-wide text-white/34">
              {mode.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

In `StatsPanel.tsx`, change the metric grid to:

```tsx
<Metric index={0} value={stats ? `${stats.cityCount}` : '—'} label="城市" />
<Metric
  index={1}
  value={stats ? `${stats.provinceCount}/${stats.countryCount}` : '—'}
  label="省 · 国"
/>
<Metric index={2} value={stats ? `${stats.tripCount}` : '—'} label="交通段" />
<Metric
  index={3}
  value={stats ? `${stats.totalDistanceKm.toLocaleString()} km` : '—'}
  label="累计里程"
  accent
/>
```

Place below it:

```tsx
{stats && <TransportMix counts={stats.transportCounts} />}
```

- [ ] **Step 5: Update timeline and card copy through the registry**

In `src/components/timeline/items.ts`:

```ts
import { getTransportMode } from '@/lib/transportModes'
```

```ts
detail: trip?.note || (trip ? getTransportMode(trip.type).label : ''),
icon: trip?.type ?? 'flight',
```

In `TimelineNode.tsx`:

```ts
import type { TransportType } from '@/types'
import { TRANSPORT_MODES } from '@/lib/transportModes'
```

```ts
icon: TransportType | 'visit'
```

```ts
const ICONS = {
  ...Object.fromEntries(
    Object.entries(TRANSPORT_MODES).map(([type, mode]) => [type, mode.icon]),
  ),
  visit: '●',
} as Record<TransportType | 'visit', string>
```

In `CityCard.tsx`, replace icon and fallback label with:

```tsx
const mode = getTransportMode(t.type)
```

```tsx
<span className="text-sm" aria-hidden>{mode.icon}</span>
```

```tsx
{t.note ?? mode.label}
```

Apply the same registry lookup in `PlaceChapter.tsx`, and include mode label:

```tsx
<span className="font-mono text-[9px] text-white/35">
  {date(trip.date)} · {getTransportMode(trip.type).label}
</span>
```

In `HeroPhoto.tsx`, use:

```ts
const mode = getTransportMode(trip.type)
```

```ts
meta: `${fmtDate(trip.date)} · ${mode.label}`,
```

Use `getTransportMode('flight').icon` only as the no-photo neutral sample;
when a trip is selected, use its mode icon in the empty-photo block.

- [ ] **Step 6: Extend global search across all mode terms**

In `src/lib/travelSearch.ts`, replace the binary transport label with:

```ts
const mode = getTransportMode(trip.type)
const transport = mode.label
```

Include mode terms and IDs:

```ts
const score = resultScore([
  route,
  trip.note ?? '',
  trip.date,
  transport,
  trip.type,
  ...mode.searchTerms,
  ...trip.waypoints.map((cityId) => cities.get(cityId)?.name ?? cityId),
], query)
```

- [ ] **Step 7: Update timeline and search tests for registry labels**

In `src/lib/timelineItems.test.ts`, add assertions:

```ts
expect(items.find((item) => item.icon === 'train')?.detail).toBe('G7558')
expect(items.find((item) => item.icon === 'train')?.headline)
  .toBe('杭州 → 嘉兴 → 上海')
```

Keep existing photo and route assertions unchanged.

- [ ] **Step 8: Run the full UI-linkage test set**

Run:

```bash
rtk vitest src/lib/derive.test.ts src/lib/timelineItems.test.ts \
  src/lib/travelSearch.test.ts src/components/stats/TransportMix.test.tsx \
  src/components/journey/PlaceChapter.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Task 6**

```bash
git add src/lib/derive.ts src/lib/derive.test.ts \
  src/components/stats/TransportMix.tsx \
  src/components/stats/TransportMix.test.tsx \
  src/components/stats/StatsPanel.tsx \
  src/components/timeline/items.ts src/components/timeline/TimelineNode.tsx \
  src/lib/timelineItems.test.ts src/components/city/CityCard.tsx \
  src/components/journey/PlaceChapter.tsx src/components/hero/HeroPhoto.tsx \
  src/lib/travelSearch.ts src/lib/travelSearch.test.ts
git commit -S -m "feat: show five transport modes across the product"
```

---

## Task 7: Residual Branch Audit, Documentation, and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/PRD.md`
- Modify: `docs/PLAN.md` only where the working tree has no unrelated user edit
- Test: full repository

- [ ] **Step 1: Audit residual binary transport branches**

Run:

```bash
rg -n "type === 'flight'|type !== 'flight'|type === 'train'|type !== 'train'|flights|trains|飞行段|高铁段" src
```

Expected: no product-code matches outside transport registry runtime
defenses, tests that intentionally cover legacy data, or flight-only curve
geometry selected by `route.shape`.

If a match is a product display branch, replace it with
`getTransportMode(type)` before continuing.

- [ ] **Step 2: Update README**

Replace the transport-only sections with:

```markdown
## 交通方式与经停

支持飞机、高铁、地铁、轮船和汽车五种交通方式。五种方式都可以记录出发、最多 4 个有序经停和到达城市；经停城市只参与路线与载具停靠，不点亮城市，也不计入到访统计。

交通回放由统一注册表驱动：每种方式拥有独立颜色、线型、SVG 载具、五阶段运动、拖尾、停靠波纹与导演镜头。

- 飞机：滑跑 → 起飞 → 巡航 → 下降 → 接地
- 高铁：发车 → 加速 → 区间巡航 → 制动 → 进站
- 地铁：离站 → 加速 → 区间运行 → 制动 → 到站
- 轮船：离港 → 加速 → 海上巡航 → 减速 → 靠港
- 汽车：启动 → 加速 → 公路行驶 → 减速 → 抵达

数据中 `trip.type` 取值为 `flight | train | metro | ship | car`；
`trip.waypoints` 为最多 4 个经停城市 id，旧 `flight/train` 数据无需迁移。
```

- [ ] **Step 3: Update PRD traffic sections**

In `docs/PRD.md`, update the transport table, trip schema, stats, replay
acceptance, and search requirements to the five values and
`from → waypoints → to` semantics used in the registry and tests. Keep the
existing document style and section numbering.

- [ ] **Step 4: Update PLAN only if safe**

If `docs/PLAN.md` still contains unrelated uncommitted edits, do not add or
commit that file. If it is clean, add a short completed section:

```markdown
## 五类交通（v0.4）

- [x] 飞机、高铁、地铁、轮船、汽车统一交通注册表。
- [x] 五种方式支持最多 4 个有序经停。
- [x] 独立载具、五阶段运动、停靠波纹和导演镜头。
- [x] 统计、时间轴、卡片、篇章、封面说明和搜索联动。
```

- [ ] **Step 5: Run all tests and typecheck**

Run:

```bash
pnpm check
```

Expected: typecheck passes and all tests pass.

- [ ] **Step 6: Build production assets**

Run:

```bash
pnpm build
```

Expected: Vite build succeeds.

- [ ] **Step 7: Verify the initial bundle boundary**

Run:

```bash
rg -l "雷克雅未克|Cape Town|tokyo-jp" dist/assets
rg -l "metro-3d.svg|ship-3d.svg|car-3d.svg" dist/assets
```

Expected: the city catalog matches only the lazy editor chunk. Vehicle icon
paths may be in the globe/vehicle chunk but not fetched until the vehicle
overlay mounts.

- [ ] **Step 8: Run desktop Chrome smoke**

Use the existing `webapp-testing` server helper at `1440×900` with isolated
localStorage data. Verify:

1. Editor shows five transport buttons and switching among them keeps waypoints.
2. Add a flight with one stop, a train with one stop, a metro trip with two
   legs, a ship route, and a car route.
3. Each mode displays its own icon, color, line style, HUD name, preparation
   copy and camera altitude.
4. Waypoint names appear while its route is selected.
5. A short stop ripple appears at each intermediate city.
6. Pause, 2× speed and replay seek keep vehicle, trail, camera and HUD in sync.
7. Stats show `tripCount` equal to the sum of five mode counts.
8. Search finds entries by `地铁`, `轮船`, `自驾`, `CA1234`, `G7558` and a
   waypoint city name.
9. No page errors or actionable console errors.

Expected: all checks pass.

- [ ] **Step 9: Commit documentation**

```bash
git add README.md docs/PRD.md
git commit -S -m "docs: document five transport modes"
```

If `docs/PLAN.md` was clean and updated, add it to this commit.

---

## Self-Review

**Spec coverage**

- Five transport types, legacy compatibility and waypoints: Tasks 1, 2 and 4.
- Unified registry, names, icons, colors, line styles, phases and copy: Tasks 1, 5 and 6.
- Editor selector and waypoint add/remove/reorder/exclusion: Task 2.
- Save-time dedupe, ordering, maximum four stops and city persistence: Task 2.
- Per-trip ordered stops and legs, arcs per flight leg, shared surface corridors: Task 3.
- Independent vehicle resources and per-leg motion: Tasks 4 and 5.
- Stop holds, labels, ripples and non-lighting semantics: Tasks 4 and 5.
- Director cameras and HUD: Task 5.
- Stats, timeline, city card, place chapter, hero, search and editor list: Task 6.
- Unknown transport fallback, missing route skip and error handling: Tasks 1, 3 and 5.
- Full tests, build, bundle boundary and desktop smoke: Task 7.

**Placeholder scan**

Every task names exact files, test code, implementation code and verification
commands. No deferred implementation markers remain.

**Type consistency**

- `TransportType` is the five-value union everywhere.
- `TRANSPORT_TYPES`, `TRANSPORT_MODES`, `getTransportMode` and `isTransportType`
  are defined before use.
- `TransportRoute` is one route per trip; `TransportRouteLeg` is one from-to
  segment.
- `Tracks.routes` replaces `Tracks.flights` and `Tracks.trains`.
- `VehicleRouteLeg.startProgress/endProgress` are used by motion sampling.
- `TravelStats.transportCounts` is a five-key record and `tripCount` is the
  total.
