import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { reverseGeocode, formatLatLng, type GeoHit } from '@/lib/geoLookup'
import type { LitCity } from '@/lib/derive'
import type { Tracks } from '@/lib/tracks'
import { useGlobeMarkers } from '@/components/globe/hooks/useGlobeMarkers'
import { useContainerSize } from '@/components/globe/hooks/useContainerSize'
import { useGlobeControls } from '@/components/globe/hooks/useGlobeControls'
import { useAtmosphereGlow, ATMOSPHERE_COLOR, ATMOSPHERE_ALTITUDE } from '@/components/globe/hooks/useAtmosphereGlow'
import { useAutoRotate } from '@/components/globe/hooks/useAutoRotate'
import { useDragClickGuard } from '@/components/globe/hooks/useDragClickGuard'
import { useTrackPresentation } from '@/components/globe/hooks/useTrackPresentation'
import {
  buildCityMarker,
  buildRegionDot,
  type GlobeMarker,
} from '@/components/globe/cityMarkers'

/** 初始相机：斜俯视东亚 */
const INITIAL_POV = { lat: 28, lng: 108, altitude: 2.3 }
/** 闲置多久后恢复自转（ms） */
const RESUME_AFTER_IDLE = 10_000
/** 相机飞行时长（ms） */
const FLIGHT_MS = 800
/** 相机高度低于该值时显示城市名称（再远只留点，避免密集） */
const LABEL_ALT_THRESHOLD = 2.6
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
  /** 行程轨迹（由 trips.json 推导） */
  tracks: Tracks
  /** 当前高亮城市（卡片打开或时间轴选中时） */
  selectedCityId: string | null
  /** 当前选中的行程（轨迹保持高亮，其余轨迹/城市淡出） */
  selectedTripId: string | null
  /** 行程选中时的轨迹取景点；visit/city 由 selectedCityId 聚焦 */
  focusPoint: { lat: number; lng: number } | null
  /** 返回总览时的复位信号 */
  resetSignal: number
  /** 城市点击（选中城市，弹出卡片）；null 表示取消 */
  onSelectCity: (cityId: string | null) => void
  /** 轨迹点击（选中 trip） */
  onSelectTrip: (tripId: string) => void
  /** 反查区域（点击空白处） */
  region: PickedRegion | null
  onPick: (region: PickedRegion | null) => void
}

export default function TravelGlobe({
  litCities,
  tracks,
  selectedCityId,
  selectedTripId,
  focusPoint,
  resetSignal,
  onSelectCity,
  onSelectTrip,
  region,
  onPick,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onPickRef = useRef(onPick)
  const onSelectCityRef = useRef(onSelectCity)
  const onSelectTripRef = useRef(onSelectTrip)
  onPickRef.current = onPick
  onSelectCityRef.current = onSelectCity
  onSelectTripRef.current = onSelectTrip
  // 点击序号：丢弃过期的反查结果，避免快速连点时结果乱跳
  const clickSeqRef = useRef(0)
  const [locating, setLocating] = useState(false)

  // 交互状态用 ref，自转循环内读取，不触发重渲染
  const draggingRef = useRef(false)
  // 选中城市时暂停自转，避免相机刚聚焦就漂走
  const selectedCityIdRef = useRef(selectedCityId)
  selectedCityIdRef.current = selectedCityId
  const selectionRef = useRef<'city' | 'none' | 'trip'>('none')
  selectionRef.current = selectedTripId ? 'trip' : selectedCityId ? 'city' : 'none'
  // 鼠标悬停在城市发光点上（同样唤醒大气辉光）
  const cityHoveringRef = useRef(false)
  const lastInteractRef = useRef(-Infinity)

  const size = useContainerSize(wrapperRef)
  const zoomedIn = useGlobeControls(globeRef, [size], {
    labelAltitude: LABEL_ALT_THRESHOLD,
    initialAltitude: INITIAL_POV.altitude,
    draggingRef,
    lastInteractRef,
  })
  useDragClickGuard(wrapperRef)
  useAutoRotate(globeRef, {
    resumeAfterIdle: RESUME_AFTER_IDLE,
    draggingRef,
    selectedCityIdRef,
    lastInteractRef,
  })

  // 大气呼吸、表面 hover 指针样式（详见 useAtmosphereGlow）
  useAtmosphereGlow(globeRef, wrapperRef, [size], { draggingRef, cityHoveringRef })

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

  // 行程选中 → 取景轨迹中点；保持原高度即可看到整条弧线
  const focusPointRef = useRef(focusPoint)
  focusPointRef.current = focusPoint
  useEffect(() => {
    const point = focusPointRef.current
    if (!point) return
    lastInteractRef.current = performance.now()
    flyTo(point.lat, point.lng, 2.3)
    // flyTo 只依赖 focusPoint 的坐标
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoint?.lat, focusPoint?.lng])

  // 全局模式：强制回到初始斜俯视，并短暂暂停自转，避免立刻漂走
  useEffect(() => {
    if (resetSignal === 0) return
    const globe = globeRef.current
    if (!globe) return
    lastInteractRef.current = performance.now()
    globe.pointOfView(INITIAL_POV, FLIGHT_MS)
    // resetSignal 仅作为“再次点总览也要复位”的触发器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

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

  const { trackProps, activeCityIds } = useTrackPresentation({
    tracks,
    selectedTripId,
    lastInteractRef,
    onSelectTripRef,
  })

  // 地球空白点击在已有选中的场景中就是“退出到全局模式”
  const handleGlobeClickWithSelection = (coords: { lat: number; lng: number }) => {
    if (selectionRef.current !== 'none') {
      onPickRef.current(null)
      return
    }
    void handleGlobeClick(coords)
  }

  const { markers, handleSelectCity, handleHoverCity } = useGlobeMarkers({
    litCities,
    zoomedIn,
    selectedCityId,
    activeCityIds,
    region,
    onSelectCityRef,
    cityHoveringRef,
    lastInteractRef,
  })

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
          onGlobeClick={handleGlobeClickWithSelection}
          {...trackProps}
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
