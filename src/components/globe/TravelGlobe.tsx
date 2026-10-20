import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, type Mesh, type ShaderMaterial } from 'three'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { reverseGeocode, formatLatLng, type GeoHit } from '@/lib/geoLookup'
import type { LitCity } from '@/lib/derive'
import {
  buildCityMarker,
  buildRegionDot,
  toCityMarkerDatum,
  type GlobeMarker,
} from '@/components/globe/cityMarkers'

/** 初始相机：斜俯视东亚 */
const INITIAL_POV = { lat: 28, lng: 108, altitude: 2.3 }
/** 闲置多久后恢复自转（ms） */
const RESUME_AFTER_IDLE = 10_000
/** 自转角速度（度 / ms） */
const ROTATE_SPEED = 0.006
/** 相机飞行时长（ms） */
const FLIGHT_MS = 800
/** 相机高度低于该值时显示城市名称（再远只留点，避免密集） */
const LABEL_ALT_THRESHOLD = 2.6
/** 大气外圈基础色：静谧冷蓝（hover 时在 shader 内向青白轻轻漂移） */
const ATMOSPHERE_COLOR = '#7fa6f5'
const ATMOSPHERE_HOVER_COLOR = new Color('#b8d2ff')
const ATMOSPHERE_ALTITUDE = 0.2
/** 辉光呼吸：静默时也有极缓的起伏，hover 只是把基准和幅度轻轻托起 */
const GLOW_BASE = 0.17
const GLOW_AMP_IDLE = 0.035
const GLOW_AMP_HOVER = 0.07
/** hover 额外抬升量；加上呼吸幅度，悬停时外圈像是被"唤醒"，而非亮起 */
const GLOW_HOVER_LIFT = 0.11
/** 呼吸周期（ms） */
const BREATH_PERIOD = 5200
/** hover 因子的缓动速度（每帧比例，约 1.2s 完成大部分过渡） */
const WAKE_LERP = 0.035

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
  /** 已点亮城市（由 trips.json 推导） */
  litCities: LitCity[]
  /** 当前高亮城市（卡片打开或时间轴选中时） */
  selectedCityId: string | null
  /** 城市点击（选中城市，弹出卡片）；null 表示取消 */
  onSelectCity: (cityId: string | null) => void
  /** 反查区域（点击空白处） */
  region: PickedRegion | null
  onPick: (region: PickedRegion | null) => void
}

export default function TravelGlobe({
  litCities,
  selectedCityId,
  onSelectCity,
  region,
  onPick,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onPickRef = useRef(onPick)
  const onSelectCityRef = useRef(onSelectCity)
  onPickRef.current = onPick
  onSelectCityRef.current = onSelectCity
  // 点击序号：丢弃过期的反查结果，避免快速连点时结果乱跳
  const clickSeqRef = useRef(0)
  const [size, setSize] = useState<ViewSize>({ width: 0, height: 0 })
  const [locating, setLocating] = useState(false)
  // 当前缩放是否足够近（控制城市名称显隐）
  const [zoomedIn, setZoomedIn] = useState(
    INITIAL_POV.altitude < LABEL_ALT_THRESHOLD,
  )

  // 交互状态用 ref，自转循环内读取，不触发重渲染
  const draggingRef = useRef(false)
  // 选中城市时暂停自转，避免相机刚聚焦就漂走
  const selectedCityIdRef = useRef(selectedCityId)
  selectedCityIdRef.current = selectedCityId
  const hoveringRef = useRef(false)
  // 鼠标悬停在城市发光点上（同样唤醒大气辉光）
  const cityHoveringRef = useRef(false)
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

  // 绑定 OrbitControls：拖拽起止 + 相机高度变化（城市名称按缩放显隐）
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
    const onChange = () => {
      const alt = globeRef.current?.pointOfView().altitude ?? INITIAL_POV.altitude
      setZoomedIn((prev) => {
        const next = alt < LABEL_ALT_THRESHOLD
        return prev === next ? prev : next
      })
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    controls.addEventListener('change', onChange)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      controls.removeEventListener('change', onChange)
    }
  }, [size])

  // 大气外圈的"呼吸 + 唤醒"：
  // 静默时辉光以极缓正弦起伏；hover 不切换状态，只让唤醒因子 wake 缓慢趋近 1，
  // 基准、幅度、色温都随 wake 连续漂移，像地球被轻轻唤醒，天然一体。
  // 直接驱动 atmosphere GlowMesh 的 shader uniform，避免改 prop 重建 mesh。
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    let raf = 0
    let material: ShaderMaterial | null = null
    let baseColor: Color | null = null
    let retries = 0
    let disposed = false
    let wake = 0 // 0 = 静默，1 = 悬停，永远在两者之间缓慢游动

    const findAtmosphere = () => {
      const globe = globeRef.current
      if (!globe) return false
      // react-globe.gl 用 __globeObjType 标记内部对象（不是 three 的 name）
      const hit = globe
        .scene()
        .children
        .find((o) => (o as unknown as { __globeObjType?: string }).__globeObjType === 'atmosphere')
      if (!hit) return false
      material = (hit as Mesh).material as ShaderMaterial
      baseColor = (material.uniforms.color.value as Color).clone()
      return true
    }

    // 大气 mesh 在 globe.gl 内部首帧才创建，挂载后轮询几帧等它就绪
    const tick = (now: number) => {
      if (disposed) return
      if (!material) {
        if (!findAtmosphere() && retries++ < 120) {
          raf = requestAnimationFrame(tick)
          return
        }
      }
      if (material && baseColor) {
        const targetWake =
          hoveringRef.current || cityHoveringRef.current ? 1 : 0
        if (Math.abs(wake - targetWake) > 0.0005) wake += (targetWake - wake) * WAKE_LERP

        // 极缓呼吸；wake 抬起时呼吸幅度也微微加深
        const amp = GLOW_AMP_IDLE + (GLOW_AMP_HOVER - GLOW_AMP_IDLE) * wake
        const breath = Math.sin((now / BREATH_PERIOD) * Math.PI * 2) * amp
        const lift = GLOW_HOVER_LIFT * wake
        const u = material.uniforms
        u.coefficient.value = GLOW_BASE + lift + breath

        // 色温向青白轻轻漂移（wake=1 时也只混入一部分，保持蓝色主调）
        u.color.value.copy(baseColor).lerp(ATMOSPHERE_HOVER_COLOR, wake * 0.45)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // toGlobeCoords 命中球面才算 hover；拖拽旋转中不改变状态
    const onMove = (e: PointerEvent) => {
      const globe = globeRef.current
      if (!globe || draggingRef.current) return
      const rect = el.getBoundingClientRect()
      const hit = !!globe.toGlobeCoords(e.clientX - rect.left, e.clientY - rect.top)
      if (hit !== hoveringRef.current) {
        hoveringRef.current = hit
        el.style.cursor = hit ? 'pointer' : ''
      }
    }
    const onLeave = () => {
      hoveringRef.current = false
      el.style.cursor = ''
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
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
      if (globe && idle && !draggingRef.current && !selectedCityIdRef.current) {
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

  // 选中城市 → 相机平滑聚焦（PRD 3.1）
  const selectedCity = useMemo(
    () => litCities.find((c) => c.city.id === selectedCityId) ?? null,
    [litCities, selectedCityId],
  )
  useEffect(() => {
    if (!selectedCity) return
    lastInteractRef.current = performance.now()
    flyTo(selectedCity.city.lat, selectedCity.city.lng, 1.35)
    // flyTo 为每次渲染重建的普通函数，只依赖城市 id/lat/lng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity?.city.id])

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

  // 城市点 + 反查定位点共用一个 html 层；名称显隐与选中态变化时才重建
  const markers = useMemo<GlobeMarker[]>(() => {
    const list: GlobeMarker[] = litCities.map((lit) => ({
      kind: 'city',
      ...toCityMarkerDatum(lit, {
        labelVisible: zoomedIn,
        selected: lit.city.id === selectedCityId,
      }),
    }))
    if (region) {
      list.push({ kind: 'region', lat: region.lat, lng: region.lng, ocean: region.ocean })
    }
    return list
  }, [litCities, zoomedIn, selectedCityId, region])

  const handleSelectCity = (id: string) => {
    lastInteractRef.current = performance.now()
    onSelectCityRef.current(id)
  }
  const handleHoverCity = (id: string | null) => {
    // 仅驱动大气辉光，不 setState（避免 hover 时重建标记）
    cityHoveringRef.current = id !== null
  }

  const polygons = region?.boundary ? [region.boundary] : []

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
          atmosphereColor={ATMOSPHERE_COLOR}
          atmosphereAltitude={ATMOSPHERE_ALTITUDE}
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
          // 城市发光点 + 反查定位点（名称在各自 DOM 内，转到背面自动隐藏）
          htmlElementsData={markers}
          htmlLat={(d) => (d as GlobeMarker).lat}
          htmlLng={(d) => (d as GlobeMarker).lng}
          htmlElement={(d) => {
            const m = d as GlobeMarker
            return m.kind === 'city'
              ? buildCityMarker(m, { onSelect: handleSelectCity, onHover: handleHoverCity })
              : buildRegionDot(m)
          }}
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
