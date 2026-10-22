# Motion And Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已经稳定的旅程与照片结构加入完整电影化动效、三档强度、旅程回放收束、后台暂停和低帧率自动降级，同时保持页面可读、可操作且不眩晕。

**Architecture:** 以 CSS 动效令牌和 `MotionProvider` 统一控制强度；场景动画由 Three.js 覆盖层和 globe.gl 相机驱动，转场动画由 React 状态与 CSS 驱动，环境动画由独立合成层驱动。所有动画都只表达一个主运动，并共享后台可见性、减少动态和低帧率降级规则。

**Tech Stack:** CSS animations/transitions、React 19、Three.js、react-globe.gl、Vitest、Testing Library、浏览器 Performance/Network 面板。

---

## 执行约定

- 本计划中的 commit 是未来执行节点；本轮不提交 Git。
- 阶段 C 只增强 A/B 已稳定的结构，不修改 `JourneyScope`、照片筛选和原图加载规则。
- 动画优先使用 `transform`、`opacity` 和短时 `filter`；禁止动画化大面积布局属性。
- `prefers-reduced-motion: reduce` 始终覆盖用户档位。

### Task C1: 动效令牌、偏好与设置

**Files:**
- Create: `src/lib/motion.ts`
- Create: `src/lib/motion.test.ts`
- Create: `src/components/motion/MotionProvider.tsx`
- Create: `src/components/motion/MotionSettings.tsx`
- Create: `src/styles/motion.css`
- Modify: `src/styles/index.css`
- Modify: `src/App.tsx`
- Modify: `src/components/app/TravelWorkspace.tsx`

- [ ] **Step 1: 写动效纯函数测试**

```ts
// src/lib/motion.test.ts
import { describe, expect, it } from 'vitest'
import {
  downgradeMotionLevel,
  normalizeMotionLevel,
  resolveMotionLevel,
} from '@/lib/motion'

describe('motion level selection', () => {
  it('forces calm when reduced motion is enabled', () => {
    expect(resolveMotionLevel('immersive', false, true)).toBe('calm')
  })

  it('uses the lower of user preference and performance cap', () => {
    expect(resolveMotionLevel('immersive', false, false, 'cinematic')).toBe('cinematic')
    expect(resolveMotionLevel('calm', false, false, 'immersive')).toBe('calm')
  })

  it('normalizes persisted values and downgrades one step', () => {
    expect(normalizeMotionLevel('unknown')).toBe('cinematic')
    expect(downgradeMotionLevel('immersive')).toBe('cinematic')
    expect(downgradeMotionLevel('cinematic')).toBe('calm')
    expect(downgradeMotionLevel('calm')).toBe('calm')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/motion.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现动效纯函数与令牌**

```ts
// src/lib/motion.ts
export type MotionLevel = 'calm' | 'cinematic' | 'immersive'

export const MOTION_LEVELS: MotionLevel[] = ['calm', 'cinematic', 'immersive']
export const MOTION_STORAGE_KEY = 'travel-map.motion-level'

export const MOTION_MS = {
  feedback: 160,
  panel: 280,
  photo: 700,
  chapter: 900,
  lightGate: 900,
  routeGrow: 900,
  camera: 800,
  return: 360,
  ambient: 15_000,
} as const

export function normalizeMotionLevel(value: unknown): MotionLevel {
  return MOTION_LEVELS.includes(value as MotionLevel)
    ? value as MotionLevel
    : 'cinematic'
}

export function resolveMotionLevel(
  userLevel: MotionLevel,
  touchDevice: boolean,
  reducedMotion: boolean,
  performanceCap: MotionLevel = 'immersive',
): MotionLevel {
  if (reducedMotion) return 'calm'
  const order: MotionLevel[] = ['calm', 'cinematic', 'immersive']
  const userIndex = order.indexOf(userLevel)
  const capIndex = order.indexOf(performanceCap)
  const effective = order[Math.min(userIndex, capIndex)]
  return touchDevice && effective === 'immersive' ? 'cinematic' : effective
}

export function downgradeMotionLevel(level: MotionLevel): MotionLevel {
  if (level === 'immersive') return 'cinematic'
  return 'calm'
}
```

- [ ] **Step 4: 实现 Provider 与设置**

```tsx
// src/components/motion/MotionProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  MOTION_STORAGE_KEY,
  normalizeMotionLevel,
  resolveMotionLevel,
  type MotionLevel,
} from '@/lib/motion'

interface MotionContextValue {
  userLevel: MotionLevel
  effectiveLevel: MotionLevel
  reducedMotion: boolean
  touchDevice: boolean
  setUserLevel: (level: MotionLevel) => void
}

const MotionContext = createContext<MotionContextValue | null>(null)

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [userLevel, setUserLevelState] = useState<MotionLevel>(() =>
    normalizeMotionLevel(localStorage.getItem(MOTION_STORAGE_KEY)))
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const touchDevice = useMedia('(pointer: coarse)')
  const effectiveLevel = resolveMotionLevel(userLevel, touchDevice, reducedMotion)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = effectiveLevel
    root.dataset.reducedMotion = String(reducedMotion)
  }, [effectiveLevel, reducedMotion])

  const value = useMemo(() => ({
    userLevel,
    effectiveLevel,
    reducedMotion,
    touchDevice,
    setUserLevel: (level: MotionLevel) => {
      setUserLevelState(level)
      localStorage.setItem(MOTION_STORAGE_KEY, level)
    },
  }), [effectiveLevel, reducedMotion, touchDevice, userLevel])

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function useMotion() {
  const value = useContext(MotionContext)
  if (!value) throw new Error('useMotion must be used inside MotionProvider')
  return value
}
```

```tsx
// src/components/motion/MotionSettings.tsx
import { MOTION_LEVELS, type MotionLevel } from '@/lib/motion'
import { useMotion } from '@/components/motion/MotionProvider'

const LABELS: Record<MotionLevel, string> = {
  calm: '静谧',
  cinematic: '电影感',
  immersive: '沉浸',
}

export default function MotionSettings() {
  const { userLevel, effectiveLevel, reducedMotion, setUserLevel } = useMotion()
  return (
    <div aria-label="动效强度" className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5">
      {MOTION_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={userLevel === level}
          disabled={reducedMotion && level !== 'calm'}
          onClick={() => setUserLevel(level)}
          className={`min-h-8 rounded-full px-2.5 text-[10px] ${
            effectiveLevel === level ? 'bg-amber-100/15 text-amber-50' : 'text-white/42'
          }`}
        >
          {LABELS[level]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 建立 CSS 动效令牌**

```css
/* src/styles/motion.css */
:root {
  --rg-ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --rg-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --rg-fast: 160ms;
  --rg-panel: 280ms;
  --rg-photo: 700ms;
  --rg-chapter: 900ms;
}

html[data-motion='calm'] {
  --rg-photo: 200ms;
  --rg-chapter: 240ms;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
  }

  .rg-ambient,
  .rg-parallax,
  .rg-route-flow,
  .rg-photo-sweep {
    animation: none !important;
    transition: none !important;
  }
}
```

在 `src/styles/index.css` 顶部导入：

```css
@import './motion.css';
```

- [ ] **Step 6: 包裹应用并显示设置**

```tsx
// src/App.tsx
import { MotionProvider } from '@/components/motion/MotionProvider'
import TravelWorkspace from '@/components/app/TravelWorkspace'
import { useTravelData } from '@/hooks/useTravelData'

function AppContent() {
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

export default function App() {
  return (
    <MotionProvider>
      <AppContent />
    </MotionProvider>
  )
}
```

在 `TravelWorkspace` import 区加入：

```tsx
import MotionSettings from '@/components/motion/MotionSettings'
```

在顶栏右侧的 `<StatsPanel stats={stats} />` 前加入：

```tsx
<MotionSettings />
```

- [ ] **Step 7: 运行动效测试与构建**

Run: `pnpm test -- src/lib/motion.test.ts && pnpm build`

Expected: 3 个测试通过；构建成功。

- [ ] **Step 8: 提交动效偏好**

```bash
git add src/lib/motion.ts src/lib/motion.test.ts src/components/motion src/styles/motion.css src/styles/index.css src/App.tsx src/components/app/TravelWorkspace.tsx
git commit -m "feat: add motion levels and settings"
```

### Task C2: 页面唤醒、星点层次与轻视差

**Files:**
- Create: `src/components/motion/WakeTitle.tsx`
- Create: `src/components/motion/usePointerParallax.ts`
- Create: `src/components/motion/useJourneyCardMotion.ts`
- Create: `src/components/motion/AmbientDust.tsx`
- Modify: `src/components/globe/Starfield.tsx`
- Modify: `src/components/app/TravelWorkspace.tsx`
- Modify: `src/components/journey/JourneyCard.tsx`
- Modify: `src/components/journey/JourneyCoverMosaic.tsx`
- Modify: `src/components/journey/JourneyPassport.tsx`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/styles/motion.css`

- [ ] **Step 1: 实现唤醒标题**

```tsx
// src/components/motion/WakeTitle.tsx
export default function WakeTitle() {
  return (
    <h1 className="rg-wake-title font-serif text-sm tracking-[0.26em] text-white/82">
      我的旅行足迹
    </h1>
  )
}
```

```css
.rg-wake-title {
  animation: rg-title-wake 1050ms var(--rg-ease-enter) both;
}

@keyframes rg-title-wake {
  from {
    opacity: 0;
    letter-spacing: 0.4em;
    transform: translateY(-7px);
  }
  to {
    opacity: 1;
    letter-spacing: 0.26em;
    transform: none;
  }
}

html[data-motion='calm'] .rg-wake-title {
  animation-duration: 220ms;
}
```

- [ ] **Step 2: 实现桌面轻视差**

```ts
// src/components/motion/usePointerParallax.ts
import { useEffect, type RefObject } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'

export function usePointerParallax(ref: RefObject<HTMLElement | null>) {
  const { effectiveLevel, touchDevice } = useMotion()
  useEffect(() => {
    const element = ref.current
    if (!element || effectiveLevel !== 'immersive' || touchDevice) return
    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5
        const y = event.clientY / window.innerHeight - 0.5
        element.style.setProperty('--rg-parallax-x', `${x * 8}px`)
        element.style.setProperty('--rg-parallax-y', `${y * 6}px`)
      })
    }
    const reset = () => {
      element.style.setProperty('--rg-parallax-x', '0px')
      element.style.setProperty('--rg-parallax-y', '0px')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', reset)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', reset)
    }
  }, [effectiveLevel, ref, touchDevice])
}
```

- [ ] **Step 3: 把星点拆为三层**

```tsx
// src/components/globe/Starfield.tsx
import { useMemo, useRef, type CSSProperties } from 'react'
import { usePointerParallax } from '@/components/motion/usePointerParallax'

interface Star {
  top: string
  left: string
  size: number
  opacity: number
  color: string
  twinkle: number
  delay: number
  glow: boolean
  layer: number
}

export default function Starfield() {
  const hostRef = useRef<HTMLDivElement>(null)
  usePointerParallax(hostRef)

  const { stars, nebulae } = useMemo(() => {
    let seed = 20261020
    const rand = () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const palette = ['#ffffff', '#ffffff', '#ffffff', '#cdd9ff', '#a9c4ff', '#ffe6c2']
    const pickColor = () => palette[Math.floor(rand() * palette.length)]
    const layers = [
      { count: 260, size: 1, opacity: 0.7, glow: false },
      { count: 110, size: 1.6, opacity: 0.85, glow: false },
      { count: 26, size: 2.4, opacity: 1, glow: true },
    ]
    const stars: Star[] = layers.flatMap(({ count, size, opacity, glow }, layer) =>
      Array.from({ length: count }, () => {
        const r = rand()
        return {
          top: `${(rand() * 100).toFixed(2)}%`,
          left: `${(rand() * 100).toFixed(2)}%`,
          size: size + (r > 0.88 ? 0.8 : 0),
          opacity: opacity * (0.45 + rand() * 0.55),
          color: pickColor(),
          glow,
          twinkle: glow || r > 0.92 ? 2.6 + rand() * 3.4 : 0,
          delay: rand() * 5,
          layer,
        }
      }),
    )
    const nebulae = [
      { top: '12%', left: '68%', size: 560, color: 'rgba(86,120,220,0.10)' },
      { top: '58%', left: '8%', size: 640, color: 'rgba(120,90,200,0.07)' },
    ]
    return { stars, nebulae }
  }, [])

  return (
    <div
      ref={hostRef}
      className="rg-starfield pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#0c1330_0%,#070b1c_55%,#02030a_100%)]"
    >
      {nebulae.map((nebula, index) => (
        <span
          key={`nebula-${index}`}
          className="absolute rounded-full"
          style={{
            top: nebula.top,
            left: nebula.left,
            width: nebula.size,
            height: nebula.size,
            transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, ${nebula.color} 0%, transparent 68%)`,
          }}
        />
      ))}
      {[0, 1, 2].map((layer) => (
        <div
          key={layer}
          className="rg-star-layer absolute inset-0"
          data-star-layer={layer}
          style={{
            transform: `translate3d(calc(var(--rg-parallax-x,0px) * ${(layer + 1) / 3}), calc(var(--rg-parallax-y,0px) * ${(layer + 1) / 3}),0)`,
          }}
        >
          {stars.filter((star) => star.layer === layer).map((star, index) => {
            const style: CSSProperties = {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              backgroundColor: star.color,
              boxShadow: star.glow
                ? `0 0 ${star.size * 3}px ${star.size * 0.7}px rgba(190,205,255,0.35)`
                : undefined,
            }
            if (star.twinkle) {
              style.animationDuration = `${star.twinkle}s`
              style.animationDelay = `${star.delay}s`
              ;(style as Record<string, string | number>)['--rg-star-o'] = star.opacity
            }
            return (
              <span
                key={index}
                className={star.twinkle
                  ? 'rg-twinkle absolute rounded-full'
                  : 'absolute rounded-full'}
                style={style}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

`rg-star-layer` 在沉浸档使用不同速度的 `rg-star-drift`：

```css
html[data-motion='immersive'] .rg-star-layer[data-star-layer='0'] {
  animation: rg-star-drift 18s ease-in-out infinite alternate;
}
html[data-motion='immersive'] .rg-star-layer[data-star-layer='1'] {
  animation: rg-star-drift 15s ease-in-out infinite alternate-reverse;
}
html[data-motion='immersive'] .rg-star-layer[data-star-layer='2'] {
  animation: rg-star-drift 12s ease-in-out infinite alternate;
}

@keyframes rg-star-drift {
  from { translate: -2px 0; }
  to { translate: 3px -2px; }
}
```

- [ ] **Step 4: 在顶栏替换标题**

用 `<WakeTitle />` 替换 `TravelWorkspace` 中的静态产品标题，并保留点击返回档案的按钮语义：把 `WakeTitle` 包在既有返回按钮内。

- [ ] **Step 5: 加入旅程卡视差、边框光与微尘层**

新增 `useJourneyCardMotion`，在桌面电影感/沉浸档响应指针，触屏和静谧档不产生倾斜；
沉浸档的位移略强，但两种档位都不超过 3px / 2°：

```ts
// src/components/motion/useJourneyCardMotion.ts
import { useEffect, type RefObject } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'

export function useJourneyCardMotion(ref: RefObject<HTMLElement | null>) {
  const { effectiveLevel, touchDevice } = useMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || touchDevice || effectiveLevel === 'calm') return
    let frame = 0
    const intensity = effectiveLevel === 'immersive' ? 1 : 0.65

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--rg-card-x', `${x * 3 * intensity}px`)
        element.style.setProperty('--rg-card-y', `${y * 2 * intensity}px`)
        element.style.setProperty('--rg-card-rotate-x', `${-y * 2 * intensity}deg`)
        element.style.setProperty('--rg-card-rotate-y', `${x * 2 * intensity}deg`)
      })
    }
    const reset = () => {
      element.style.setProperty('--rg-card-x', '0px')
      element.style.setProperty('--rg-card-y', '0px')
      element.style.setProperty('--rg-card-rotate-x', '0deg')
      element.style.setProperty('--rg-card-rotate-y', '0deg')
    }

    element.addEventListener('pointermove', onMove, { passive: true })
    element.addEventListener('pointerleave', reset)
    reset()
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', reset)
    }
  }, [effectiveLevel, ref, touchDevice])
}
```

在 `JourneyCard` 上挂载 `ref`；`JourneyCoverMosaic` 给前 3 张封面写
`data-cover-layer="0|1|2"`。CSS 只移动封面层，不移动文字：

```css
.rg-journey-card {
  --rg-card-x: 0px;
  --rg-card-y: 0px;
  --rg-card-rotate-x: 0deg;
  --rg-card-rotate-y: 0deg;
  position: relative;
  transform: perspective(900px) rotateX(var(--rg-card-rotate-x))
    rotateY(var(--rg-card-rotate-y));
  transition: transform 280ms var(--rg-ease-enter), border-color 180ms ease;
}

.rg-journey-card [data-cover-layer='0'] {
  transform: translate3d(
    calc(var(--rg-card-x) * 0.55),
    calc(var(--rg-card-y) * 0.55),
    0
  );
}

.rg-journey-card [data-cover-layer='1'] {
  transform: translate3d(
    calc(var(--rg-card-x) * -0.8),
    calc(var(--rg-card-y) * 0.8),
    0
  );
}

.rg-journey-card [data-cover-layer='2'] {
  transform: translate3d(
    calc(var(--rg-card-x) * 1),
    calc(var(--rg-card-y) * -0.45),
    0
  );
}

.rg-journey-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.3) 50%, transparent 80%);
}

.rg-journey-card:hover::after {
  animation: rg-card-edge 320ms var(--rg-ease-enter) both;
}

@keyframes rg-card-edge {
  from { opacity: 0; translate: -100% 0; }
  35% { opacity: 0.42; }
  to { opacity: 0; translate: 100% 0; }
}

@media (pointer: coarse) {
  .rg-journey-card,
  .rg-journey-card [data-cover-layer] {
    transform: none !important;
  }
}
```

新增 `AmbientDust`，最多 20 个粒子，只挂载在旅程护照和照片回忆舞台：

```tsx
// src/components/motion/AmbientDust.tsx
const DUST = Array.from({ length: 20 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 19) % 100}%`,
  delay: `${-(index % 7) * 1.7}s`,
  duration: `${12 + (index % 5) * 1.4}s`,
}))

export default function AmbientDust() {
  return (
    <div aria-hidden className="rg-ambient-dust pointer-events-none absolute inset-0 overflow-hidden">
      {DUST.map((dust, index) => (
        <span
          key={index}
          data-animation="ambient-dust"
          style={{
            left: dust.left,
            top: dust.top,
            animationDelay: dust.delay,
            animationDuration: dust.duration,
          }}
        />
      ))}
    </div>
  )
}
```

```css
.rg-ambient-dust span {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 999px;
  background: rgba(245, 234, 216, 0.38);
  box-shadow: 0 0 7px rgba(245, 234, 216, 0.16);
  animation: rg-dust-float 14s ease-in-out infinite alternate;
}

@keyframes rg-dust-float {
  from { opacity: 0.15; translate: -3px 4px; }
  50% { opacity: 0.42; }
  to { opacity: 0.2; translate: 5px -6px; }
}

html[data-motion='calm'] .rg-ambient-dust {
  display: none;
}
```

在 `JourneyPassport` 与 `MemoryStage` 的根节点内渲染 `<AmbientDust />`；C8 负责在页面后台时统一暂停它们。

- [ ] **Step 6: 浏览器验收唤醒、卡片与微尘**

Run: `pnpm dev`

Expected:

1. 页面加载后星点从暗到亮、标题字距收拢、地球轻微回到 1 倍尺度。
2. 整个过程不阻塞滚动、点击与地球交互。
3. 静谧档只保留 220ms 淡入；减少动态时无位移动画。
4. 桌面悬停旅程卡时三层封面位移不超过 3px，卡片倾斜不超过 2°，光边只扫过一次。
5. 触屏设备不产生倾斜、卡片视差；护照和照片回忆舞台的微尘最多 20 个。
6. 页面失焦或进入后台时，微尘可被 C8 的全局暂停开关冻结。

- [ ] **Step 7: 提交页面唤醒与卡片环境层**

```bash
git add src/components/motion/WakeTitle.tsx src/components/motion/usePointerParallax.ts src/components/motion/useJourneyCardMotion.ts src/components/motion/AmbientDust.tsx src/components/globe/Starfield.tsx src/components/app/TravelWorkspace.tsx src/components/journey/JourneyCard.tsx src/components/journey/JourneyCoverMosaic.tsx src/components/journey/JourneyPassport.tsx src/components/memory/MemoryStage.tsx src/styles/motion.css
git commit -m "feat: add page wake, card parallax and ambient dust"
```

### Task C3: 旅程展开与路线生长

**Files:**
- Create: `src/lib/journeyScene.ts`
- Create: `src/lib/journeyScene.test.ts`
- Create: `src/lib/sceneLine.ts`
- Create: `src/components/globe/hooks/useJourneyEntrance.ts`
- Create: `src/components/globe/SceneRouteOverlay.tsx`
- Modify: `src/components/globe/TravelGlobe.tsx`
- Modify: `src/components/globe/hooks/useTrackPresentation.ts`
- Modify: `src/components/globe/hooks/useGlobeMarkers.ts`
- Modify: `src/components/globe/cityMarkers.ts`
- Modify: `src/components/app/TravelWorkspace.tsx`

- [ ] **Step 1: 写场景路线测试**

```ts
// src/lib/journeyScene.test.ts
import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import { buildJourneySceneRoutes } from '@/lib/journeyScene'

const data = dataJson as TravelData

describe('journey scene routes', () => {
  it('creates drawable routes for flights and trains', () => {
    const routes = buildJourneySceneRoutes(buildTracks(data))
    expect(routes.length).toBe(data.trips.length)
    expect(routes.find((route) => route.type === 'flight')?.points.length).toBeGreaterThan(20)
    expect(routes.find((route) => route.type === 'train')?.points.length).toBeGreaterThan(20)
  })

  it('keeps route endpoints at ground altitude and flight middle lifted', () => {
    const route = buildJourneySceneRoutes(buildTracks(data))
      .find((item) => item.type === 'flight')!
    expect(route.points[0].altitude).toBeCloseTo(0.004)
    expect(route.points.at(-1)?.altitude).toBeCloseTo(0.004)
    expect(route.points[Math.floor(route.points.length / 2)].altitude).toBeGreaterThan(0.01)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/journeyScene.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现场景路线纯函数**

```ts
// src/lib/journeyScene.ts
import type { Tracks } from '@/lib/tracks'
import { greatCirclePoints } from '@/lib/geo'

export interface SceneRoutePoint {
  lat: number
  lng: number
  altitude: number
}

export interface SceneRoute {
  id: string
  type: 'flight' | 'train'
  points: SceneRoutePoint[]
}

export function buildJourneySceneRoutes(tracks: Tracks): SceneRoute[] {
  const flights = tracks.flights.map((track): SceneRoute => {
    const points = greatCirclePoints(
      { lat: track.startLat, lng: track.startLng },
      { lat: track.endLat, lng: track.endLng },
      64,
    )
    return {
      id: track.trip.id,
      type: 'flight',
      points: points.map(([lat, lng], index) => ({
        lat,
        lng,
        altitude: 0.004 + Math.sin((index / (points.length - 1)) * Math.PI) * track.altitude,
      })),
    }
  })
  const trains = tracks.trains.map((track): SceneRoute => ({
    id: track.trip.id,
    type: 'train',
    points: track.points.map(([lat, lng]) => ({ lat, lng, altitude: 0.004 })),
  }))
  return [...flights, ...trains]
}
```

- [ ] **Step 4: 实现可复用 Three.js 生长线**

```ts
// src/lib/sceneLine.ts
import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
} from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import type { SceneRoute } from '@/lib/journeyScene'

export interface SceneLine {
  setProgress: (progress: number) => void
  setWindow: (start: number, length: number) => void
  setOpacity: (opacity: number) => void
  dispose: () => void
}

export function createSceneLine(
  globe: GlobeMethods,
  route: SceneRoute,
  style: { color: number; dashed?: boolean; opacity?: number },
): SceneLine {
  const positions = new Float32Array(route.points.length * 3)
  route.points.forEach((point, index) => {
    const vector = globe.getCoords(point.lat, point.lng, point.altitude)
    positions[index * 3] = vector.x
    positions[index * 3 + 1] = vector.y
    positions[index * 3 + 2] = vector.z
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = style.dashed
    ? new LineDashedMaterial({
        color: style.color,
        dashSize: 1.8,
        gapSize: 1.2,
        transparent: true,
        opacity: style.opacity ?? 0.9,
      })
    : new LineBasicMaterial({
        color: style.color,
        transparent: true,
        opacity: style.opacity ?? 0.9,
      })
  const line = new Line(geometry, material)
  line.frustumCulled = false
  line.renderOrder = 6
  if (style.dashed) line.computeLineDistances()
  globe.scene().add(line)

  return {
    setProgress(progress) {
      const count = progress <= 0
        ? 0
        : Math.ceil(Math.max(0, Math.min(1, progress)) * route.points.length)
      geometry.setDrawRange(0, count)
    },
    setWindow(start, length) {
      const normalizedStart = Math.max(0, Math.min(route.points.length, Math.floor(start)))
      const count = Math.max(0, Math.min(route.points.length - normalizedStart, Math.ceil(length)))
      geometry.setDrawRange(normalizedStart, count)
    },
    setOpacity(opacity) {
      material.opacity = opacity
    },
    dispose() {
      globe.scene().remove(line)
      geometry.dispose()
      material.dispose()
    },
  }
}
```

- [ ] **Step 5: 实现旅程入场 hook**

```ts
// src/components/globe/hooks/useJourneyEntrance.ts
import { useEffect, useState } from 'react'
import { MOTION_MS } from '@/lib/motion'
import { useMotion } from '@/components/motion/MotionProvider'

export interface JourneyEntranceState {
  active: boolean
  progress: number
  routesVisible: boolean
}

export function useJourneyEntrance(journeyId: string | null): JourneyEntranceState {
  const { effectiveLevel, reducedMotion } = useMotion()
  const [progress, setProgress] = useState(1)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!journeyId || reducedMotion || effectiveLevel === 'calm') {
      setProgress(1)
      setActive(false)
      return
    }
    let frame = 0
    const start = performance.now()
    setProgress(0)
    setActive(true)
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / MOTION_MS.routeGrow)
      setProgress(next)
      if (next < 1) frame = requestAnimationFrame(tick)
      else setActive(false)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [effectiveLevel, journeyId, reducedMotion])

  return {
    active,
    progress,
    routesVisible: !active,
  }
}
```

- [ ] **Step 6: 实现路线覆盖层**

```tsx
// src/components/globe/SceneRouteOverlay.tsx
import { useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { SceneRoute } from '@/lib/journeyScene'
import { createSceneLine, type SceneLine } from '@/lib/sceneLine'

interface Props {
  routes: SceneRoute[]
  progress: number
  globeRef: RefObject<GlobeMethods | undefined>
}

export default function SceneRouteOverlay({ routes, progress, globeRef }: Props) {
  const linesRef = useRef<SceneLine[]>([])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const lines = routes.map((route) => createSceneLine(globe, route, {
      color: route.type === 'flight' ? 0xa5f3fc : 0xfbbf24,
      dashed: route.type === 'flight',
      opacity: 0.92,
    }))
    linesRef.current = lines
    return () => {
      lines.forEach((line) => line.dispose())
      linesRef.current = []
    }
  }, [globeRef, routes])

  useEffect(() => {
    linesRef.current.forEach((line) => line.setProgress(progress))
  }, [progress])

  return null
}
```

- [ ] **Step 7: 接入旅行地球**

`TravelGlobe` 新增 `journeyId: string | null` 和 `cityRevealIds: string[]`：

```tsx
const [globeReady, setGlobeReady] = useState(false)
const entrance = useJourneyEntrance(journeyId)
const sceneRoutes = useMemo(() => buildJourneySceneRoutes(tracks), [tracks])
```

`onGlobeReady` 中在现有初始化后调用 `setGlobeReady(true)`。

静态轨迹需在入场期间隐藏：

```ts
const { trackProps, activeCityIds, visibleTrackCounts } = useTrackPresentation({
  tracks: entrance.routesVisible ? tracks : { flights: [], trains: [] },
  selectedTripId,
  replayRuntime,
  lastInteractRef,
  onSelectTripRef,
})
```

渲染：

```tsx
{globeReady && entrance.active && (
  <SceneRouteOverlay
    routes={sceneRoutes}
    progress={entrance.progress}
    globeRef={globeRef}
  />
)}
```

`useGlobeMarkers` 增加 `revealedCityIds`。入场中只渲染达到阈值的城市：

```ts
const revealRatio = 0.35 + index / Math.max(1, cityRevealIds.length) * 0.4
const revealed = !entrance.active || entrance.progress >= revealRatio
```

`buildCityMarker` 在新城市首次出现时添加 `rg-city-arrival`，CSS 只执行一次扩散波纹；常居城市只加一次轻微呼吸。

- [ ] **Step 8: 运行场景测试与快捷键中止验收**

Run: `pnpm test -- src/lib/journeyScene.test.ts`

Expected: 2 个测试通过。

浏览器连续快速切换两段旅程，确认旧路线线对象立即停止增长，新路线从当前镜头继续，不在 120ms 后仍更新旧场景。

- [ ] **Step 9: 提交旅程展开**

```bash
git add src/lib/journeyScene.ts src/lib/journeyScene.test.ts src/lib/sceneLine.ts src/components/globe/hooks/useJourneyEntrance.ts src/components/globe/SceneRouteOverlay.tsx src/components/globe/TravelGlobe.tsx src/components/globe/hooks/useTrackPresentation.ts src/components/globe/hooks/useGlobeMarkers.ts src/components/globe/cityMarkers.ts src/components/app/TravelWorkspace.tsx
git commit -m "feat: animate journey entrances and route growth"
```

### Task C4: 路线流光、轨迹呼吸与一次性城市波纹

**Files:**
- Create: `src/lib/routeFlow.ts`
- Create: `src/lib/routeFlow.test.ts`
- Create: `src/components/globe/RouteFlowOverlay.tsx`
- Modify: `src/components/globe/TravelGlobe.tsx`
- Modify: `src/components/globe/cityMarkers.ts`
- Modify: `src/styles/motion.css`

- [ ] **Step 1: 写流光窗口测试**

```ts
// src/lib/routeFlow.test.ts
import { describe, expect, it } from 'vitest'
import { getRouteFlowWindow, getTrackBreathOpacity } from '@/lib/routeFlow'

describe('route flow window', () => {
  it('moves a short window along the route and ends outside', () => {
    expect(getRouteFlowWindow(100, 0, 0.18)).toEqual({ start: 0, length: 18 })
    expect(getRouteFlowWindow(100, 0.5, 0.18)).toEqual({ start: 41, length: 18 })
    expect(getRouteFlowWindow(100, 1, 0.18)).toEqual({ start: 100, length: 0 })
  })

  it('keeps selected-track breathing slow and bounded', () => {
    expect(getTrackBreathOpacity(0)).toBeCloseTo(0.55)
    expect(getTrackBreathOpacity(2100)).toBeCloseTo(0.77)
    expect(getTrackBreathOpacity(4200)).toBeCloseTo(0.55)
    expect(getTrackBreathOpacity(2100, 'calm')).toBe(0.55)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/routeFlow.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现窗口与轨迹呼吸函数**

```ts
// src/lib/routeFlow.ts
export function getRouteFlowWindow(
  pointCount: number,
  progress: number,
  ratio: number,
): { start: number; length: number } {
  if (pointCount <= 0 || progress >= 1) return { start: pointCount, length: 0 }
  const length = Math.max(1, Math.ceil(pointCount * ratio))
  const maxStart = Math.max(0, pointCount - length)
  return {
    start: Math.min(maxStart, Math.floor(Math.max(0, progress) * pointCount)),
    length,
  }
}

export function getTrackBreathOpacity(
  elapsedMs: number,
  level: 'calm' | 'cinematic' | 'immersive' = 'cinematic',
): number {
  if (level === 'calm') return 0.55
  const phase = (Math.max(0, elapsedMs) % 4200) / 4200
  const pulse = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2
  return 0.55 + pulse * 0.22
}
```

- [ ] **Step 4: 实现每 8 秒一次的流光覆盖层**

```tsx
// src/components/globe/RouteFlowOverlay.tsx
import { useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { SceneRoute } from '@/lib/journeyScene'
import { getRouteFlowWindow, getTrackBreathOpacity } from '@/lib/routeFlow'
import { createSceneLine, type SceneLine } from '@/lib/sceneLine'
import { useMotion } from '@/components/motion/MotionProvider'

interface Props {
  routes: SceneRoute[]
  activeRouteId: string | null
  paused: boolean
  globeRef: RefObject<GlobeMethods | undefined>
}

export default function RouteFlowOverlay({
  routes,
  activeRouteId,
  paused,
  globeRef,
}: Props) {
  const { effectiveLevel } = useMotion()
  const lineRef = useRef<SceneLine | null>(null)
  const route = routes.find((item) => item.id === activeRouteId) ?? routes[0]
  const breathRoute = activeRouteId
    ? routes.find((item) => item.id === activeRouteId) ?? null
    : null

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !route || paused || effectiveLevel === 'calm') return
    const line = createSceneLine(globe, route, {
      color: route.type === 'flight' ? 0xe0f7ff : 0xffe6ad,
      dashed: false,
      opacity: 0.78,
    })
    lineRef.current = line
    let frame = 0
    let interval = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 400)
        const window = getRouteFlowWindow(route.points.length, progress, 0.18)
        line.setWindow(window.start, window.length)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    interval = window.setInterval(run, 8000)
    const first = window.setTimeout(run, 1800)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
      cancelAnimationFrame(frame)
      line.dispose()
      lineRef.current = null
    }
  }, [effectiveLevel, globeRef, paused, route])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !breathRoute || paused || effectiveLevel === 'calm') return
    const line = createSceneLine(globe, breathRoute, {
      color: breathRoute.type === 'flight' ? 0xa5f3fc : 0xfbbf24,
      dashed: false,
      opacity: 0.55,
    })
    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      line.setOpacity(getTrackBreathOpacity(now - startedAt, effectiveLevel))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      line.dispose()
    }
  }, [breathRoute, effectiveLevel, globeRef, paused])

  return null
}
```

- [ ] **Step 5: 接入暂停条件**

`TravelGlobe` 渲染：

```tsx
<RouteFlowOverlay
  routes={sceneRoutes}
  activeRouteId={selectedTripId}
  paused={entrance.active || dragging || replayRuntime?.status === 'playing'}
  globeRef={globeRef}
/>
```

页面后台暂停由 C8 的全局可见性继续接入。

- [ ] **Step 6: 城市波纹 CSS**

```css
.rg-city-arrival::before,
.rg-city-arrival::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border: 1px solid rgba(251, 191, 36, 0.72);
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(0.4);
  animation: rg-arrival-ripple 900ms var(--rg-ease-exit) both;
}

.rg-city-arrival::after {
  animation-delay: 120ms;
}

@keyframes rg-arrival-ripple {
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(3.2);
  }
}

html[data-motion='calm'] .rg-city-arrival::before,
html[data-motion='calm'] .rg-city-arrival::after {
  animation-duration: 180ms;
}
```

- [ ] **Step 7: 运行流光测试**

Run: `pnpm test -- src/lib/routeFlow.test.ts`

Expected: 2 个测试通过；浏览器中同一时刻只有一条流光，只有选中的轨迹缓慢呼吸。

- [ ] **Step 8: 提交路线环境动画**

```bash
git add src/lib/routeFlow.ts src/lib/routeFlow.test.ts src/components/globe/RouteFlowOverlay.tsx src/components/globe/TravelGlobe.tsx src/components/globe/cityMarkers.ts src/styles/motion.css
git commit -m "feat: add route flow and city arrival ripples"
```

### Task C5: 旅程回放收束、载具拖尾与结束卡

**Files:**
- Create: `src/components/timeline/ReplayFinale.tsx`
- Modify: `src/components/globe/VehicleOverlay.tsx`
- Modify: `src/components/timeline/Timeline.tsx`
- Modify: `src/components/timeline/TimelineControls.tsx`
- Modify: `src/components/timeline/hooks/useTimelinePlayback.ts`
- Modify: `src/components/journey/JourneyChapterRail.tsx`
- Modify: `src/components/app/TravelWorkspace.tsx`
- Modify: `src/styles/motion.css`

- [ ] **Step 1: 实现拖尾点与到达波纹 DOM**

在 `VehicleOverlay` 的 refs 区加入：

```tsx
const trailHostRef = useRef<HTMLDivElement>(null)
const frictionHostRef = useRef<HTMLDivElement>(null)
const arrivalRef = useRef<HTMLDivElement>(null)
const arrivalPlayedRef = useRef(false)
```

在 `playback` 变化时重置到达状态：

```tsx
useEffect(() => {
  arrivalPlayedRef.current = false
}, [playback?.key])
```

在 `VehicleOverlay` 的 `host` 中加入：

```tsx
<div ref={trailHostRef} aria-hidden className="pointer-events-none absolute inset-0">
  {Array.from({ length: 10 }, (_, index) => (
    <span
      key={index}
      data-vehicle-trail-dot={index}
      className="absolute h-1.5 w-1.5 rounded-full bg-cyan-100/70 shadow-[0_0_8px_2px_rgba(103,232,249,.32)]"
      style={{ opacity: 0 }}
    />
  ))}
</div>
<div ref={frictionHostRef} aria-hidden className="pointer-events-none absolute inset-0">
  {Array.from({ length: 6 }, (_, index) => (
    <span
      key={index}
      data-vehicle-friction-dot={index}
      className="rg-vehicle-friction-dot absolute h-px w-px rounded-full bg-amber-100/60"
      style={{ opacity: 0 }}
    />
  ))}
</div>
<div ref={arrivalRef} aria-hidden className="rg-vehicle-arrival pointer-events-none absolute inset-0">
  <span />
  <span />
</div>
```

在 `renderProgress` 内部、更新载具 marker 后，逐帧采样 10 个更早位置：

```ts
if (rawProgress >= 1 && !arrivalPlayedRef.current) {
  arrivalPlayedRef.current = true
  const destination = screenPoint(globe, sampleVehicleRoute(playback.route, 1))
  arrivalRef.current?.style.setProperty(
    'transform',
    `translate3d(${destination.x}px, ${destination.y}px, 0)`,
  )
  arrivalRef.current?.classList.add('rg-vehicle-arrival-active')
  window.setTimeout(() => {
    arrivalRef.current?.classList.remove('rg-vehicle-arrival-active')
  }, 950)
}

const dots = trailHostRef.current?.querySelectorAll<HTMLElement>(
  '[data-vehicle-trail-dot]',
) ?? []
for (let index = 0; index < dots.length; index++) {
  const trailProgress = Math.max(0, easedProgress - index * 0.008)
  const trailPosition = sampleVehicleRoute(playback.route, trailProgress)
  const trailScreen = screenPoint(globe, trailPosition)
  const dot = dots[index]
  dot.style.transform = `translate3d(${trailScreen.x}px, ${trailScreen.y}px, 0)`
  dot.style.opacity = visible ? String((1 - index / dots.length) * 0.65) : '0'
}

const frictionDots = frictionHostRef.current?.querySelectorAll<HTMLElement>(
  '[data-vehicle-friction-dot]',
) ?? []
for (let index = 0; index < frictionDots.length; index++) {
  const frictionDot = frictionDots[index]
  const isTrain = playback.route.type === 'train'
  if (!visible || !isTrain || rawProgress >= 1) {
    frictionDot.style.opacity = '0'
    continue
  }
  const frictionProgress = Math.max(0, easedProgress - index * 0.006)
  const frictionPosition = sampleVehicleRoute(playback.route, frictionProgress)
  const frictionScreen = screenPoint(globe, frictionPosition)
  const flicker = (Math.sin(performance.now() / 140 - index * 0.9) + 1) / 2
  frictionDot.style.transform =
    `translate3d(${frictionScreen.x}px, ${frictionScreen.y}px, 0)`
  frictionDot.style.opacity = String(0.08 + flicker * 0.22)
}
```

- [ ] **Step 2: 实现结束卡**

```tsx
// src/components/timeline/ReplayFinale.tsx
import type { Journey } from '@/types'
import type { JourneySummary } from '@/lib/journeys'

interface Props {
  journey: Journey
  summary: JourneySummary
  onClose: () => void
  onReplay: () => void
}

export default function ReplayFinale({ journey, summary, onClose, onReplay }: Props) {
  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-[#03050c]/72 p-5 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${journey.title}回放结束`}
        className="rg-finale-in w-full max-w-xl rounded-3xl border border-amber-100/15 bg-[rgba(12,10,8,.92)] p-8 text-center text-[#f5ead8] shadow-[0_30px_120px_rgba(0,0,0,.75)]"
      >
        <p className="font-mono text-[10px] tracking-[0.24em] opacity-55">
          {journey.startDate.replaceAll('-', '.')} — {journey.endDate.replaceAll('-', '.')}
        </p>
        <h2 className="mt-3 font-serif text-4xl">{journey.title}</h2>
        <p className="mt-3 text-sm leading-relaxed opacity-55">
          {journey.epigraph ?? journey.summary}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/8 py-4">
          <Metric value={`${summary.distanceKm}`} label="公里" />
          <Metric value={`${summary.visitCount}`} label="处停留" />
          <Metric value={`${summary.photoCount}`} label="张照片" />
        </div>
        <p className="mt-5 font-serif text-lg opacity-80">旅程会继续。</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={onReplay}>再看一次</button>
          <button type="button" onClick={onClose}>回到旅程</button>
        </div>
      </section>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-xl">{value}</div>
      <div className="mt-1 text-[9px] tracking-[0.16em] opacity-40">{label}</div>
    </div>
  )
}
```

- [ ] **Step 3: 把结束回调从“重置总览”改为“显示结束卡”**

在 `useTimelinePlayback` 中增加跳过当前节点的能力：

```ts
const skip = useCallback(() => {
  const currentPlan = planRef.current
  const current = positionRef.current
  const nextIndex = current.index + 1
  if (nextIndex >= currentPlan.steps.length) {
    setStatus('idle')
    setProgress(1)
    callbacksRef.current.onFinish()
    return
  }
  applyPosition({ index: nextIndex, elapsedMs: 0 })
  callbacksRef.current.onActivate(currentPlan.steps[nextIndex].node)
  frameTimeRef.current = performance.now()
}, [applyPosition])
```

在 hook 返回值中加入 `skip`。

`TimelineControls` Props 增加 `onSkip: () => void`，在进度条后加入：

```tsx
{activeIndex >= 0 && (
  <button
    type="button"
    aria-label="跳过当前地点"
    onClick={onSkip}
    className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-white/48"
  >
    跳过
  </button>
)}
```

`Timeline` 把 `onSkip={playback.skip}` 传给 `TimelineControls`。

`Timeline` 保留 `onFinishPlayback` 名字，但 `TravelWorkspace` 传入：

```ts
const [finaleOpen, setFinaleOpen] = useState(false)
const [replayStartSignal, setReplayStartSignal] = useState(0)

const handleReplayFinished = () => setFinaleOpen(true)
```

`JourneyPassport` 的“开始旅程回放”和结束卡“再看一次”都执行：

```ts
const startJourneyReplay = () => {
  setFinaleOpen(false)
  setReplayStartSignal((signal) => signal + 1)
}
```

把 `startSignal={replayStartSignal}` 传给 `JourneyChapterRail`，再传给 `Timeline`。`Timeline` 通过 effect 调用 `playback.start()`。

- [ ] **Step 4: 渲染结束卡**

```tsx
{finaleOpen && journey && (
  <ReplayFinale
    journey={journey}
    summary={summarizeJourney(data, journey)}
    onClose={() => setFinaleOpen(false)}
    onReplay={startJourneyReplay}
  />
)}
```

- [ ] **Step 5: 添加拖尾与到达波纹样式**

```css
.rg-vehicle-arrival {
  display: none;
}

.rg-vehicle-arrival-active {
  display: block;
}

.rg-vehicle-arrival span {
  position: absolute;
  left: -18px;
  top: -18px;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(251, 191, 36, 0.8);
  border-radius: 999px;
  animation: rg-vehicle-arrival 850ms var(--rg-ease-exit) both;
}

.rg-vehicle-arrival span:nth-child(2) {
  animation-delay: 120ms;
}

@keyframes rg-vehicle-arrival {
  from { opacity: 1; transform: scale(0.45); }
  to { opacity: 0; transform: scale(2.9); }
}

html[data-motion='calm'] .rg-vehicle-arrival span {
  animation-duration: 180ms;
}

.rg-vehicle-friction-dot {
  box-shadow: 0 0 4px rgba(251, 191, 36, 0.4);
}

html[data-motion='calm'] .rg-vehicle-friction-dot {
  display: none;
}
```

- [ ] **Step 6: 回放验收**

Run: `pnpm dev`

逐一确认：

1. 当前旅程的飞机/列车沿正确轨迹移动，拖尾不超过路线总长 8%。
2. 到达目的地时两层波纹间隔约 120ms，仅播放一次。
3. 0.5x / 1x / 2x、暂停、拖动进度仍同步载具与轨迹。
4. 播放结束显示结束卡，关闭后仍停留在当前旅程。
5. 静谧档载具即时到达，波纹缩短，不显示拖尾。
6. 高铁播放时出现 6 个短促摩擦光点，长度不超过路线总长 8%；飞机不显示摩擦光。

- [ ] **Step 7: 提交回放收束**

```bash
git add src/components/timeline/ReplayFinale.tsx src/components/globe/VehicleOverlay.tsx src/components/timeline/TimelineControls.tsx src/components/timeline/hooks/useTimelinePlayback.ts src/components/timeline/Timeline.tsx src/components/journey/JourneyChapterRail.tsx src/components/app/TravelWorkspace.tsx src/styles/motion.css
git commit -m "feat: polish journey replay and finale"
```

### Task C6: 光门转场、方向转场与章节标题卡

**Files:**
- Create: `src/components/memory/MemoryChapterCard.tsx`
- Create: `src/components/memory/MemoryChapterCard.test.tsx`
- Create: `src/components/motion/useLayerReturn.ts`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/components/memory/MemoryPhoto.tsx`
- Modify: `src/components/memory/MemoryFilmstrip.tsx`
- Modify: `src/components/journey/PlaceChapter.tsx`
- Modify: `src/styles/motion.css`

- [ ] **Step 1: 写章节卡测试**

```tsx
// src/components/memory/MemoryChapterCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MemoryChapterCard from '@/components/memory/MemoryChapterCard'

describe('MemoryChapterCard', () => {
  it('shows date on the left and place on the right', () => {
    render(<MemoryChapterCard date="2025-05-02" cityName="杭州" />)
    expect(screen.getByText('5 月 2 日')).toBeTruthy()
    expect(screen.getByText('杭州')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/memory/MemoryChapterCard.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现章节标题卡**

```tsx
// src/components/memory/MemoryChapterCard.tsx
interface Props {
  date: string
  cityName: string
}

export default function MemoryChapterCard({ date, cityName }: Props) {
  const [, month, day] = date.split('-').map(Number)
  return (
    <div
      aria-hidden
      className="rg-memory-chapter pointer-events-none absolute inset-0 z-20 grid grid-cols-2 overflow-hidden bg-[#0c0907]"
    >
      <div className="rg-memory-chapter-left flex items-center justify-end pr-8 font-mono text-[#f5ead8]/70">
        {month} 月 {day} 日
      </div>
      <div className="rg-memory-chapter-right flex items-center border-l border-[#f5ead8]/12 pl-8 font-serif text-4xl text-[#f5ead8]">
        {cityName}
      </div>
      <div className="rg-memory-grain-flash absolute inset-0" />
    </div>
  )
}
```

- [ ] **Step 4: 在舞台中检测章节变化**

`MemoryStage` 增加：

```tsx
const [chapterCard, setChapterCard] = useState<{ date: string; cityName: string } | null>(null)
const previousPhotoRef = useRef<MemoryPhoto | null>(null)

useEffect(() => {
  const previous = previousPhotoRef.current
  previousPhotoRef.current = photo ?? null
  if (!photo || !previous || previous.chapterKey === photo.chapterKey) return
  setChapterCard({ date: photo.takenAt?.slice(0, 10) ?? photo.chapterKey, cityName: photo.cityName })
  const timer = window.setTimeout(() => setChapterCard(null), 900)
  return () => window.clearTimeout(timer)
}, [photo])
```

首次打开可显示一次章节卡：在舞台首次有效 `photo` 时设置 `chapterCard`，计时 900ms。

同时加入静态胶片颗粒和返回上级转场。`useLayerReturn` 只负责延迟卸载当前层，
不创建新的动画循环：

```ts
// src/components/motion/useLayerReturn.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'
import { MOTION_MS } from '@/lib/motion'

export function useLayerReturn(onClose: () => void) {
  const { reducedMotion } = useMotion()
  const [returning, setReturning] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const requestClose = useCallback(() => {
    if (returning) return
    if (reducedMotion) {
      onClose()
      return
    }
    setReturning(true)
    timerRef.current = window.setTimeout(onClose, MOTION_MS.return)
  }, [onClose, reducedMotion, returning])

  return { returning, requestClose }
}
```

`MemoryStage` 与 `PlaceChapter` 的根节点使用 `rg-layer`，并把所有直接调用
`onClose` 的关闭按钮替换为 `requestClose`。舞台根节点内增加：

```tsx
<div aria-hidden className="rg-memory-film-grain absolute inset-0" />
```

静态胶片颗粒只存在于照片舞台，不参与照片切换；减少动态时隐藏。

- [ ] **Step 5: 光门与方向转场 CSS**

```css
.rg-memory-stage {
  animation: rg-light-gate 900ms var(--rg-ease-enter) both;
}

.rg-memory-stage::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 50%;
  width: 2px;
  background: linear-gradient(transparent, rgba(245, 234, 216, 0.85), transparent);
  transform: translateX(-50%);
  animation: rg-light-gate-line 720ms var(--rg-ease-enter) both;
}

.rg-memory-photo[data-photo-direction='next'] {
  animation: rg-photo-next 700ms var(--rg-ease-enter) both;
}

.rg-memory-photo[data-photo-direction='previous'] {
  animation: rg-photo-previous 700ms var(--rg-ease-enter) both;
}

.rg-memory-chapter-left {
  animation: rg-chapter-left 820ms var(--rg-ease-enter) both;
}

.rg-memory-chapter-right {
  animation: rg-chapter-right 820ms var(--rg-ease-enter) both;
}

.rg-memory-grain-flash {
  opacity: 0;
  background-image: radial-gradient(rgba(245, 234, 216, 0.2) 0.6px, transparent 0.6px);
  background-size: 3px 3px;
  animation: rg-grain-flash 120ms 760ms linear both;
}

.rg-memory-film-grain {
  pointer-events: none;
  opacity: 0.06;
  mix-blend-mode: soft-light;
  background-image:
    radial-gradient(rgba(245, 234, 216, 0.55) 0.55px, transparent 0.55px),
    radial-gradient(rgba(255, 255, 255, 0.18) 0.4px, transparent 0.4px);
  background-position: 0 0, 7px 9px;
  background-size: 3px 3px, 5px 5px;
}

.rg-layer[data-returning='true'] {
  pointer-events: none;
  animation: rg-layer-return 360ms var(--rg-ease-exit) both;
}

html[data-motion='calm'] .rg-memory-stage,
html[data-motion='calm'] .rg-memory-photo {
  animation-duration: 200ms;
}

html[data-motion='calm'] .rg-memory-stage::before,
html[data-motion='calm'] .rg-memory-chapter {
  display: none;
}

html[data-motion='calm'] .rg-memory-film-grain {
  display: none;
}

html[data-motion='calm'] .rg-layer[data-returning='true'] {
  animation-duration: 180ms;
}
```

补齐以下关键帧：

```css
@keyframes rg-light-gate {
  from { opacity: 0; clip-path: inset(0 49.8%); filter: blur(8px); }
  to { opacity: 1; clip-path: inset(0); filter: none; }
}
@keyframes rg-light-gate-line {
  from { opacity: 0; transform: translateX(-50%) scaleY(0); }
  35% { opacity: 1; }
  to { opacity: 0; transform: translateX(-50%) scaleY(1); }
}
@keyframes rg-photo-next {
  from { opacity: 0; transform: translateX(12px) scale(1.015); filter: blur(6px); }
  to { opacity: 1; transform: none; filter: none; }
}
@keyframes rg-photo-previous {
  from { opacity: 0; transform: translateX(-12px) scale(1.015); filter: blur(6px); }
  to { opacity: 1; transform: none; filter: none; }
}
@keyframes rg-chapter-left {
  from { transform: translateX(-100%); }
  to { transform: none; }
}
@keyframes rg-chapter-right {
  from { transform: translateX(100%); }
  to { transform: none; }
}
@keyframes rg-grain-flash {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.22; }
}
@keyframes rg-layer-return {
  from { opacity: 1; transform: translateY(0) scale(1); filter: none; }
  to { opacity: 0; transform: translateY(8px) scale(0.985); filter: blur(1px); }
}
```

- [ ] **Step 6: 运行章节卡测试**

Run: `pnpm test -- src/components/memory/MemoryChapterCard.test.tsx src/components/memory/MemoryStage.test.tsx`

Expected: 全部通过；关闭舞台或地点篇章时先退后 280–420ms，再回到上级视图。

- [ ] **Step 7: 提交电影化照片转场**

```bash
git add src/components/memory/MemoryChapterCard.tsx src/components/memory/MemoryChapterCard.test.tsx src/components/motion/useLayerReturn.ts src/components/memory/MemoryStage.tsx src/components/memory/MemoryPhoto.tsx src/components/memory/MemoryFilmstrip.tsx src/components/journey/PlaceChapter.tsx src/styles/motion.css
git commit -m "feat: add light gate, film grain and layer return"
```

### Task C7: 回忆星图景深与飞入飞回

**Files:**
- Create: `src/components/memory/MemoryFlight.tsx`
- Modify: `src/components/memory/MemoryConstellation.tsx`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/lib/constellation.ts`
- Modify: `src/lib/constellation.test.ts`
- Modify: `src/styles/motion.css`

- [ ] **Step 1: 写视差和飞行目标测试**

```ts
// 追加到 src/lib/constellation.test.ts
import { getConstellationParallax, getFlightTarget } from '@/lib/constellation'

describe('constellation motion', () => {
  it('keeps parallax within 2–6px', () => {
    expect(getConstellationParallax(0.5, 0.5, 'immersive')).toEqual({ x: 0, y: 0 })
    const edge = getConstellationParallax(0, 1, 'immersive')
    expect(Math.abs(edge.x)).toBeLessThanOrEqual(6)
    expect(Math.abs(edge.y)).toBeLessThanOrEqual(6)
    expect(getConstellationParallax(0, 1, 'cinematic')).toEqual({ x: 0, y: 0 })
  })

  it('derives a centered flight target from a source rectangle', () => {
    const target = getFlightTarget(
      { left: 100, top: 200, width: 120, height: 80 },
      { width: 1200, height: 800 },
    )
    expect(target.x).toBe(440)
    expect(target.y).toBe(160)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/lib/constellation.test.ts`

Expected: FAIL，新导出不存在。

- [ ] **Step 3: 实现景深与飞行目标纯函数**

```ts
// 追加到 src/lib/constellation.ts
import type { MotionLevel } from '@/lib/motion'

export function getConstellationParallax(
  x: number,
  y: number,
  level: MotionLevel,
): { x: number; y: number } {
  if (level !== 'immersive') return { x: 0, y: 0 }
  return {
    x: (x - 0.5) * 12,
    y: (y - 0.5) * 12,
  }
}

export function getFlightTarget(
  source: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  viewport: { width: number; height: number },
): { x: number; y: number; scale: number } {
  return {
    x: viewport.width / 2 - (source.left + source.width / 2),
    y: viewport.height / 2 - (source.top + source.height / 2),
    scale: Math.min(5, Math.max(2, 280 / source.width)),
  }
}
```

- [ ] **Step 4: 实现飞入卡片**

```tsx
// src/components/memory/MemoryFlight.tsx
import { useEffect, useState, type CSSProperties } from 'react'

interface Props {
  src: string
  from: CSSProperties
  to: CSSProperties
}

export default function MemoryFlight({ src, from, to }: Props) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <img
      aria-hidden
      src={src}
      alt=""
      className="rg-memory-flight pointer-events-none fixed z-[85] rounded-xl object-cover shadow-[0_30px_100px_rgba(0,0,0,.7)]"
      style={{
        ...(active ? to : from),
        transition: 'left 650ms var(--rg-ease-enter), top 650ms var(--rg-ease-enter), width 650ms var(--rg-ease-enter), height 650ms var(--rg-ease-enter), transform 650ms var(--rg-ease-enter)',
      }}
    />
  )
}
```

把 `MemoryConstellation` 的 Props 回调签名改为：

```ts
interface Props {
  collection: MemoryCollection
  onOpenPhoto: (index: number, sourceRect: DOMRect) => void
}
```

桌面卡片回调改为：

```tsx
onClick={(event) => onOpenPhoto(
  index,
  event.currentTarget.getBoundingClientRect(),
)}
```

390px 瀑布流卡片回调改为：

```tsx
onClick={(event) => onOpenPhoto(
  collection.photos.findIndex((item) => item.key === photo.key),
  event.currentTarget.getBoundingClientRect(),
)}
```

`MemoryStage` 保存 `flight` 状态：

```tsx
const [flight, setFlight] = useState<{
  src: string
  from: CSSProperties
  to: CSSProperties
} | null>(null)

const openFromConstellation = (index: number, rect: DOMRect) => {
  const photo = collection.photos[index]
  const target = getFlightTarget(rect, { width: innerWidth, height: innerHeight })
  setFlight({
    src: photoVariantUrl(photo.visitId, photo.file, 'md'),
    from: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      transform: 'translate3d(0,0,0) scale(1)',
    },
    to: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      transform: `translate3d(${target.x}px,${target.y}px,0) scale(${target.scale})`,
    },
  })
  window.setTimeout(() => {
    onPhotoIndex(index)
    onView('stage')
    setFlight(null)
  }, 680)
}
```

```tsx
{flight && (
  <MemoryFlight src={flight.src} from={flight.from} to={flight.to} />
)}
```

- [ ] **Step 5: 星图景深**

`MemoryConstellation` 根节点监听 `pointermove`，只有沉浸档更新 CSS 变量：

```tsx
const { effectiveLevel, touchDevice } = useMotion()
const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
  if (effectiveLevel !== 'immersive' || touchDevice) return
  const rect = event.currentTarget.getBoundingClientRect()
  const parallax = getConstellationParallax(
    (event.clientX - rect.left) / rect.width,
    (event.clientY - rect.top) / rect.height,
    effectiveLevel,
  )
  event.currentTarget.style.setProperty('--rg-depth-x', `${parallax.x}px`)
  event.currentTarget.style.setProperty('--rg-depth-y', `${parallax.y}px`)
}
```

每张卡按 `chapterIndex % 3` 分配 0.35 / 0.6 / 1 倍位移，卡片本身不做无限漂浮。

- [ ] **Step 6: 关闭舞台时返回星图**

舞台“回忆星图”按钮使用 `view='constellation'`。`MemoryStage` 始终挂载 `MemoryConstellation`，在舞台视图时用外层 `hidden={view === 'stage'}` 隐藏，因此滚动位置不会被卸载。切回星图后执行：

```tsx
const targetPhoto = collection.photos[photoIndex]
requestAnimationFrame(() => {
  const host = document.querySelector<HTMLElement>('[data-constellation-host]')
  const node = targetPhoto
    ? document.querySelector<HTMLElement>(
        `[data-photo-key="${CSS.escape(targetPhoto.key)}"]`,
      )
    : null
  if (!host || !node) return
  const hostRect = host.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  const visible = nodeRect.bottom >= hostRect.top
    && nodeRect.top <= hostRect.bottom
    && nodeRect.right >= hostRect.left
    && nodeRect.left <= hostRect.right
  if (!visible) node.scrollIntoView({ block: 'center', inline: 'center' })
})
```

给 `MemoryConstellation` 的滚动根节点增加 `data-constellation-host`，给每个照片卡增加 `data-photo-key={node.photo.key}`。

- [ ] **Step 7: 运行星图测试**

Run: `pnpm test -- src/lib/constellation.test.ts src/components/memory/MemoryStage.test.tsx`

Expected: 全部通过。

- [ ] **Step 8: 提交星图动效**

```bash
git add src/components/memory/MemoryFlight.tsx src/components/memory/MemoryConstellation.tsx src/components/memory/MemoryStage.tsx src/lib/constellation.ts src/lib/constellation.test.ts src/styles/motion.css
git commit -m "feat: add memory constellation depth and flight"
```

### Task C8: 低帧率降级、后台暂停与动画释放

**Files:**
- Create: `src/components/motion/usePageVisibility.ts`
- Create: `src/components/motion/useAdaptiveMotion.ts`
- Create: `src/components/motion/useAdaptiveMotion.test.tsx`
- Modify: `src/components/motion/MotionProvider.tsx`
- Modify: `src/components/motion/AmbientDust.tsx`
- Modify: `src/components/journey/JourneyPassport.tsx`
- Modify: `src/components/memory/MemoryStage.tsx`
- Modify: `src/components/globe/TravelGlobe.tsx`
- Modify: `src/components/globe/RouteFlowOverlay.tsx`
- Modify: `src/components/memory/hooks/useMemoryPlayback.ts`
- Modify: `src/components/globe/Starfield.tsx`

- [ ] **Step 1: 写可见性与降级测试**

```tsx
// src/components/motion/useAdaptiveMotion.test.tsx
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAdaptiveMotion } from '@/components/motion/useAdaptiveMotion'

afterEach(() => vi.restoreAllMocks())

describe('useAdaptiveMotion', () => {
  it('lowers one level after a two-second low-fps window', () => {
    vi.spyOn(performance, 'now').mockReturnValue(0)
    const { result } = renderHook(() => useAdaptiveMotion('immersive'))
    act(() => result.current.recordWindow(40, 2000))
    expect(result.current.cap).toBe('cinematic')
  })
})
```

为了让测试不依赖真实 rAF，hook 暴露纯函数 `applyPerformanceWindow(current, fps)`：

```ts
export function applyPerformanceWindow(
  cap: MotionLevel,
  fps: number,
): MotionLevel {
  return fps < 45 ? downgradeMotionLevel(cap) : cap
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- src/components/motion/useAdaptiveMotion.test.tsx`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现后台可见性**

```ts
// src/components/motion/usePageVisibility.ts
import { useEffect, useState } from 'react'

export function usePageVisibility() {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}
```

- [ ] **Step 4: 实现两秒帧率窗口**

```ts
// src/components/motion/useAdaptiveMotion.ts
import { useEffect, useRef, useState } from 'react'
import { downgradeMotionLevel, type MotionLevel } from '@/lib/motion'

export function applyPerformanceWindow(
  cap: MotionLevel,
  fps: number,
): MotionLevel {
  return fps < 45 ? downgradeMotionLevel(cap) : cap
}

export function useAdaptiveMotion(userLevel: MotionLevel) {
  const [cap, setCap] = useState<MotionLevel>('immersive')
  const samplesRef = useRef({ frames: 0, startedAt: performance.now() })
  const capRef = useRef(cap)
  capRef.current = cap

  const recordWindow = (frames: number, durationMs: number) => {
    const fps = frames / Math.max(1, durationMs) * 1000
    const next = applyPerformanceWindow(capRef.current, fps)
    if (next !== capRef.current) setCap(next)
    return next
  }

  useEffect(() => {
    if (userLevel === 'calm') {
      setCap('immersive')
      return
    }
    let frame = 0
    const tick = (now: number) => {
      samplesRef.current.frames += 1
      const duration = now - samplesRef.current.startedAt
      if (duration >= 2000) {
        recordWindow(samplesRef.current.frames, duration)
        samplesRef.current = { frames: 0, startedAt: now }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [userLevel])

  return { cap, recordWindow }
}
```

- [ ] **Step 5: 把性能 cap 接入 Provider**

`MotionProvider` 调用：

```ts
const { cap } = useAdaptiveMotion(userLevel)
const pageVisible = usePageVisibility()
const effectiveLevel = resolveMotionLevel(userLevel, touchDevice, reducedMotion, cap)
```

同时把页面可见性写到根节点：

```ts
document.documentElement.dataset.animationPaused = String(!pageVisible)
```

`AmbientDust`、`JourneyPassport` 和 `MemoryStage` 不需要各自创建监听器，只继承全局
`data-animation-paused` 状态。

用户手动切换档位时保留 `userLevel` 与 `cap`；刷新后只恢复用户选择，不恢复临时降级。

- [ ] **Step 6: 接入后台暂停**

`TravelGlobe`：

```ts
const pageVisible = usePageVisibility()
const scenePaused =
  !pageVisible
  || dragging
  || replayRuntime?.status === 'playing'
  || selectedCityId !== null
```

`RouteFlowOverlay` 接收 `paused={scenePaused}`；`Starfield` 根节点在不可见时设置 `data-paused='true'`，CSS：

```css
.rg-starfield[data-paused='true'] *,
[data-animation-paused='true'] * {
  animation-play-state: paused !important;
}
```

微尘、星点、选中轨迹呼吸和路线流光都必须在 `data-animation-paused='true'` 时
停止更新；恢复可见后从当前状态继续，不重新累积定时器。

自动回忆 hook 已有 `visibilitychange` 暂停；再增加 `document.hidden` 初始检查。

结束动画时移除 `will-change`：

```css
.rg-transitioning {
  will-change: transform, opacity, filter;
}

.rg-transitioning[data-finished='true'] {
  will-change: auto;
}
```

组件在动画结束事件后设置 `data-finished='true'`，例如舞台根节点：

```tsx
<div
  className="rg-memory-stage rg-transitioning"
  onAnimationEnd={(event) => {
    event.currentTarget.dataset.finished = 'true'
  }}
>
```

旅程路线 Three.js 覆盖层在 `progress === 1` 的 effect 清理中直接移除 line、geometry 与 material，不保留 `will-change`。

- [ ] **Step 7: 运行降级测试**

Run: `pnpm test -- src/components/motion/useAdaptiveMotion.test.tsx src/components/memory/MemoryStage.test.tsx`

Expected: 全部通过。

- [ ] **Step 8: 提交性能降级**

```bash
git add src/components/motion/usePageVisibility.ts src/components/motion/useAdaptiveMotion.ts src/components/motion/useAdaptiveMotion.test.tsx src/components/motion/MotionProvider.tsx src/components/motion/AmbientDust.tsx src/components/journey/JourneyPassport.tsx src/components/memory/MemoryStage.tsx src/components/globe/TravelGlobe.tsx src/components/globe/RouteFlowOverlay.tsx src/components/memory/hooks/useMemoryPlayback.ts src/components/globe/Starfield.tsx src/styles/motion.css
git commit -m "feat: adapt motion to performance and visibility"
```

### Task C9: 动效阶段浏览器与性能验收

**Files:**
- Modify: `docs/PLAN.md`

- [ ] **Step 1: 完整自动化验证**

Run: `pnpm test && pnpm build`

Expected: 全部测试通过；构建成功。

- [ ] **Step 2: 桌面流程验收**

Run: `pnpm dev`

按顺序验收：

1. 首次打开完成一次 900–1200ms 唤醒，页面可立即操作。
2. 打开旅程时镜头、路线生长、地点点亮、护照和章节轴按顺序出现。
3. 快速点击另一段旅程，旧动画在 120ms 内停止。
4. 选中城市出现一次性波纹，卡片先照片后文字入场。
5. 打开回忆舞台出现光门，切到新地点时出现章节卡。
6. 上一张/下一张方向与手势方向一致。
7. 回忆星图有 2–6px 景深，点击卡片飞入舞台。
8. 旅程回放有拖尾、到达波纹和结束卡。
9. 旅程卡 hover 时封面三层位移 1–3px、倾斜不超过 2°，边框光只移动一次。
10. 旅程护照和照片回忆舞台微尘不超过 20 个；页面后台时停止。
11. 选中轨迹缓慢呼吸，未选中轨迹保持静止；高铁回放出现摩擦光，飞机没有。
12. 回忆舞台存在低强度静态胶片颗粒，不随每张照片重新闪烁。
13. 从舞台或地点篇章返回时，当前层先退后 280–420ms，再恢复上级地图清晰度。

- [ ] **Step 3: 三档动效验收**

分别切换静谧、电影感、沉浸并刷新：

1. 档位持久化。
2. 静谧无路线生长、流光、推近、扫光和章节卡，只保留短淡化。
3. 电影感具备设计规格默认效果。
4. 沉浸增加封面与星图景深，触屏仍降为电影感。
5. 系统启用减少动态后强制静谧，设置按钮状态清楚。

- [ ] **Step 4: 性能验收**

在 Chrome Performance 面板记录：

1. 桌面地球空闲帧率目标 60fps。
2. 390px 模拟设备目标至少 45fps。
3. 没有超过 200ms 的低于 30fps 连续区间。
4. 页面后台时星点、流光、微尘和自动回忆停止。
5. 人为通过 CPU 4x 降速触发低帧率，确认连续 2 秒后降一档。
6. 场景切换结束后不存在持续 `will-change`。

- [ ] **Step 5: 可访问性验收**

确认：

- 所有动画控制可由键盘访问。
- 照片舞台焦点锁定，关闭后回到入口。
- `aria-live` 只在照片变化时播报一次。
- 自动播放可暂停，减少动态下默认不播放。
- 状态不只依赖颜色。

- [ ] **Step 6: 提交动效验收记录**

```bash
git add docs/PLAN.md
git commit -m "docs: record motion acceptance"
```

### Task C10: v0.3 发布候选与最终回归

**Files:**
- Modify: `README.md`
- Modify: `docs/PLAN.md`
- Modify: `docs/PRD.md`
- Modify: `package.json`

- [ ] **Step 1: 更新版本与文档**

`package.json`：

```json
{
  "version": "0.3.0"
}
```

README 增加：

- `journeys` / `journeyId` 录入；
- 四级照片资产生成；
- 动效三档与减少动态；
- 390px 已知边界；
- 回忆舞台原图按需加载说明。

`docs/PLAN.md` 勾选 A1–C10，并记录 Gate A/B/C 结果。`docs/PRD.md` 只更新时间与实现状态，不改已批准的 v0.3 产品边界。

- [ ] **Step 2: 运行最终自动化验证**

Run: `pnpm test && pnpm build`

Expected: 全部通过；`dist/` 成功生成。

- [ ] **Step 3: 逐条验证 18 条设计验收**

使用设计规格第 20 节逐条记录：

```text
[ ] 1 档案只展示旅程入口
[ ] 2 常居城市独立点亮且不进入统计
[ ] 3 两段旅程路线、地点、统计、照片和回放隔离
[ ] 4 同城跨旅程只显示当前旅程数据
[ ] 5 档案按年份组织且最近优先
[ ] 6 旅程标题、题记、主题、封面完整
[ ] 7 地点照片回忆与精选回退正确
[ ] 8 键盘、触屏、自动播放、进度、暂停、减少动态可用
[ ] 9 数百张照片首屏不加载原图
[ ] 10 390px 可进入旅程、地点和照片
[ ] 11 切换后无旧状态残留
[ ] 12 地球、反查、轨迹、EXIF、缩略图无回归
[ ] 13 校验识别坏旅程、越界日期、坏封面、常居到访
[ ] 14 产品代码与文案不写死用户举例日期
[ ] 15 默认电影感完整呈现核心动效
[ ] 16 三档持久化且减少动态优先
[ ] 17 回忆星图与移动瀑布流可用
[ ] 18 无高频无限动画，低帧率自动降级
```

- [ ] **Step 4: 现有功能回归**

浏览器逐项检查：

1. 地球拖拽、滚轮缩放与闲置自转。
2. 全球地名反查、中国地级市高亮和海洋坐标。
3. 飞机虚线、高铁贴地折线和重复线路偏移。
4. 轨迹 hover、tooltip 和点击联动。
5. EXIF 照片归组与导出。
6. 统计面板全局与当前旅程数字。

- [ ] **Step 5: 提交发布候选**

```bash
git add README.md docs/PLAN.md docs/PRD.md package.json
git commit -m "chore: prepare v0.3 release candidate"
```

不要在本任务自动打 tag；等待用户明确批准发布后再执行：

```bash
git tag v0.3.0
```
