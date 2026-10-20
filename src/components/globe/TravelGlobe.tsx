import { useEffect, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { reverseGeocode, formatLatLng, type GeoHit } from '@/lib/geoLookup'

/** 初始相机：斜俯视东亚 */
const INITIAL_POV = { lat: 28, lng: 108, altitude: 2.3 }
/** 闲置多久后恢复自转（ms） */
const RESUME_AFTER_IDLE = 10_000
/** 自转角速度（度 / ms） */
const ROTATE_SPEED = 0.006
/** 相机飞行时长（ms） */
const FLIGHT_MS = 800

interface ViewSize {
  width: number
  height: number
}

/** 当前选中区域（点击地球反查结果） */
export interface PickedRegion {
  name: string
  /** 副标题：中国地级市显示"省 · 中国"，外国显示国家名，海洋显示坐标 */
  detail?: string
  /** 点击位置（标签锚点） */
  lat: number
  lng: number
  /** 命中的边界（海洋为 undefined） */
  boundary?: GeoJSON.Feature
  ocean?: boolean
}

interface Props {
  region: PickedRegion | null
  onPick: (region: PickedRegion | null) => void
}

export default function TravelGlobe({ region, onPick }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  // 点击序号：丢弃过期的反查结果，避免快速连点时结果乱跳
  const clickSeqRef = useRef(0)
  const [size, setSize] = useState<ViewSize>({ width: 0, height: 0 })
  const [locating, setLocating] = useState(false)

  // 交互状态用 ref，自转循环内读取，不触发重渲染
  const draggingRef = useRef(false)
  const lastInteractRef = useRef(-Infinity)
  // 拖拽判别：按下到松开位移超过阈值则视为旋转地球，吞掉随后的 click
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const dragMovedRef = useRef(false)

  // 画布随容器尺寸变化
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 绑定 OrbitControls 的拖拽起止
  useEffect(() => {
    const controls = globeRef.current?.controls?.()
    if (!controls) return
    const onStart = () => {
      draggingRef.current = true
      lastInteractRef.current = performance.now()
    }
    const onEnd = () => {
      draggingRef.current = false
      lastInteractRef.current = performance.now()
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [size])

  // 拖拽 / 点击判别：在捕获阶段记录按下点，位移超过阈值则标记为拖拽。
  // three.js 内部用 pointerup 的 raycast 触发点击，拖拽结束时也会误触发，
  // 必须在 wrapper 捕获阶段提前拦截 click，否则"只是转一下地球"也会被飞行打断。
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const THRESHOLD = 6 // px
    const onDown = (e: PointerEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY }
      dragMovedRef.current = false
    }
    const onMove = (e: PointerEvent) => {
      const p = pointerDownRef.current
      if (!p) return
      if (Math.abs(e.clientX - p.x) > THRESHOLD || Math.abs(e.clientY - p.y) > THRESHOLD) {
        dragMovedRef.current = true
      }
    }
    const onUp = () => {
      // 留到 click 之后再清空由 click 处理；这里只保留 moved 标记
    }
    const onClick = (e: MouseEvent) => {
      if (dragMovedRef.current) {
        e.stopPropagation()
        dragMovedRef.current = false
        pointerDownRef.current = null
      }
    }
    el.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('pointermove', onMove, { capture: true })
    window.addEventListener('pointerup', onUp, { capture: true })
    el.addEventListener('click', onClick, { capture: true })
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true } as EventListenerOptions)
      window.removeEventListener('pointermove', onMove, { capture: true } as EventListenerOptions)
      window.removeEventListener('pointerup', onUp, { capture: true } as EventListenerOptions)
      el.removeEventListener('click', onClick, { capture: true } as EventListenerOptions)
    }
  }, [])

  // 自动自转：拖拽中暂停，闲置 10s 后恢复
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      const globe = globeRef.current
      const idle = now - lastInteractRef.current > RESUME_AFTER_IDLE
      if (globe && idle && !draggingRef.current) {
        const pov = globe.pointOfView()
        globe.pointOfView({ ...pov, lng: pov.lng + dt * ROTATE_SPEED }, 0)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // 平滑飞向目标：只在距离或高度差明显时飞，避免无意义动画造成的"顿一下"
  const flyTo = (lat: number, lng: number, maxAlt: number) => {
    const globe = globeRef.current
    if (!globe) return
    const cur = globe.pointOfView()
    const targetAlt = Math.min(cur.altitude, maxAlt)
    const dLat = Math.abs(cur.lat - lat)
    const dLng = Math.min(Math.abs(cur.lng - lng), 360 - Math.abs(cur.lng - lng))
    const dAlt = Math.abs(cur.altitude - targetAlt)
    if (dLat < 0.5 && dLng < 0.5 && dAlt < 0.05) return
    globe.pointOfView({ lat, lng, altitude: targetAlt }, FLIGHT_MS)
  }

  // 点击地球任意位置 → 离线反查地名
  const handleGlobeClick = async (coords: { lat: number; lng: number }) => {
    const { lat, lng } = coords
    lastInteractRef.current = performance.now()
    const seq = ++clickSeqRef.current
    setLocating(true)

    let hit: GeoHit | null = null
    try {
      hit = await reverseGeocode(lat, lng)
    } catch (err) {
      console.error('[geo] 地名反查失败', err)
    }
    if (seq !== clickSeqRef.current) return // 已点击他处，丢弃过期结果
    setLocating(false)

    if (hit) {
      onPickRef.current({
        name: hit.name,
        detail:
          hit.kind === 'city'
            ? `${hit.province ?? ''} · 中国`
            : hit.kind === 'country'
              ? (hit.country !== hit.name ? hit.country : undefined)
              : '中国',
        lat,
        lng,
        boundary: hit.boundary,
      })
      // 按区域级别决定最终聚焦高度：地级市近、直辖市稍远、国家保持远景
      const targetAlt = hit.kind === 'city' ? 1.1 : hit.kind === 'municipality' ? 1.5 : 2.1
      flyTo(lat, lng, targetAlt)
    } else {
      onPickRef.current({ name: '海洋', detail: formatLatLng(lat, lng), lat, lng, ocean: true })
    }
  }

  const polygons = region?.boundary ? [region.boundary] : []
  const markers = region ? [region] : []

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/textures/earth-night.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          showAtmosphere
          atmosphereColor="#5b7cff"
          atmosphereAltitude={0.22}
          onGlobeReady={() => {
            globeRef.current?.pointOfView(INITIAL_POV, 0)
            // 仅 dev：?pick=lat,lng 自动反查，便于调试/截图
            if (import.meta.env.DEV) {
              const m = new URLSearchParams(window.location.search).get('pick')
              if (m) {
                const [lat, lng] = m.split(',').map(Number)
                setTimeout(() => handleGlobeClick({ lat, lng }), 500)
              }
            }
          }}
          onGlobeClick={handleGlobeClick}
          // 选中区域多边形高亮
          polygonsData={polygons}
          polygonCapColor={() => 'rgba(251, 191, 36, 0.28)'}
          polygonSideColor={() => 'rgba(251, 191, 36, 0.08)'}
          polygonStrokeColor={() => 'rgba(253, 224, 71, 0.95)'}
          polygonAltitude={0.012}
          polygonsTransitionDuration={300}
          // 点击位置仅保留小光点（名称在顶部 HUD，不遮挡区域）
          htmlElementsData={markers}
          htmlLat={(d) => (d as PickedRegion).lat}
          htmlLng={(d) => (d as PickedRegion).lng}
          htmlElement={(d) => buildLocationDot(d as PickedRegion)}
          htmlElementVisibilityModifier={(el, visible) => {
            el.style.display = visible ? 'block' : 'none'
          }}
        />
      )}

      {/* 名称 HUD：屏幕固定顶部居中，永远不遮挡地球上的选中区域 */}
      {region && (
        <div
          key={`${region.lat.toFixed(2)},${region.lng.toFixed(2)}`}
          className="rg-hud pointer-events-auto absolute left-1/2 top-20 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/14 bg-[rgba(8,11,22,.72)] px-5 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,.45)] backdrop-blur-md">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${region.ocean ? 'bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,.7)]' : 'bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,.7)]'}`}
            />
            <span className="text-base font-semibold tracking-[0.05em] text-white">
              {region.name}
            </span>
            {region.detail && <span className="text-xs text-white/55">{region.detail}</span>}
            <button
              type="button"
              aria-label="取消选中"
              onClick={() => onPickRef.current(null)}
              className="ml-1 h-5 w-5 cursor-pointer rounded-full border-none bg-white/12 text-xs leading-5 text-white/70 transition hover:bg-white/25 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 反查进行中的即时反馈（数据已预取，通常只是一瞬） */}
      {locating && (
        <div className="pointer-events-none absolute left-1/2 top-36 -translate-x-1/2 animate-pulse rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-xs tracking-widest text-white/70 backdrop-blur-md">
          定位中…
        </div>
      )}
    </div>
  )
}

/** 点击位置的小光点 DOM（无文字，避免遮挡区域） */
function buildLocationDot(d: PickedRegion): HTMLElement {
  const el = document.createElement('div')
  const color = d.ocean ? 'rgba(56,189,248,.95)' : 'rgba(252,211,77,.95)'
  el.style.cssText = 'transform:translate(-50%,-50%);width:12px;height:12px;pointer-events:none;'
  el.innerHTML = `
    <span class="rg-ring" style="position:absolute;inset:0;border-radius:50%;border:1.5px solid ${color};animation:rg-ping 1.1s ease-out infinite;"></span>
    <span style="position:absolute;inset:3px;border-radius:50%;background:${color};box-shadow:0 0 8px 2px ${color};"></span>
  `
  return el
}
