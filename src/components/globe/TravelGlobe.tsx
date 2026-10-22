import { useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { reverseGeocode, formatLatLng, type GeoHit } from '@/lib/geoLookup'
import type { TravelGlobeProps } from '@/components/globe/TravelGlobe.types'
import { useGlobeMarkers } from '@/components/globe/hooks/useGlobeMarkers'
import { useContainerSize } from '@/components/globe/hooks/useContainerSize'
import { useGlobeControls } from '@/components/globe/hooks/useGlobeControls'
import { useAtmosphereGlow, ATMOSPHERE_COLOR, ATMOSPHERE_ALTITUDE } from '@/components/globe/hooks/useAtmosphereGlow'
import { useAutoRotate } from '@/components/globe/hooks/useAutoRotate'
import { useDragClickGuard } from '@/components/globe/hooks/useDragClickGuard'
import { useTrackPresentation } from '@/components/globe/hooks/useTrackPresentation'
import { useVehiclePlayback } from '@/components/globe/hooks/useVehiclePlayback'
import { useJourneyReveal } from '@/components/globe/hooks/useJourneyReveal'
import { useCameraFocus } from '@/components/globe/hooks/useCameraFocus'
import { useMotion } from '@/components/motion/MotionProvider'
import VehicleOverlay from '@/components/globe/VehicleOverlay'
import GlobeFeedback from '@/components/globe/GlobeFeedback'
import SceneRouteOverlay from '@/components/globe/SceneRouteOverlay'
import RouteFlowOverlay from '@/components/globe/RouteFlowOverlay'
import {
  buildCityMarker,
  buildHomeMarker,
  buildRegionDot,
  type GlobeMarker,
} from '@/components/globe/cityMarkers'
import {
  INITIAL_POV,
  LABEL_ALT_THRESHOLD,
  RESUME_AFTER_IDLE,
} from '@/components/globe/globeConfig'
import { buildJourneySceneRoutes } from '@/lib/journeyScene'
import type { Tracks } from '@/lib/tracks'

const EMPTY_TRACKS: Tracks = { flights: [], trains: [] }

export default function TravelGlobe({
  litCities,
  homeCity,
  tracks,
  stardustTracks,
  selectedCityId,
  selectedTripId,
  journeyId,
  focusPoint,
  tripPlaybackSignal,
  replayRuntime,
  resetSignal,
  onReady,
  onSelectCity,
  onSelectTrip,
  region,
  onPick,
}: TravelGlobeProps) {
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
  const [globeReady, setGlobeReady] = useState(false)
  const { pageVisible } = useMotion()

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
  const { entrance, revealedCityIds } = useJourneyReveal(
    litCities,
    journeyId,
    globeReady,
  )
  const sceneRoutes = useMemo(() => buildJourneySceneRoutes(tracks), [tracks])

  const size = useContainerSize(wrapperRef)
  const { zoomedIn, dragging } = useGlobeControls(globeRef, [size], {
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
  const flyTo = useCameraFocus({
    globeRef,
    lastInteractRef,
    litCities,
    selectedCityId,
    focusPoint,
    resetSignal,
  })

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

  const { trackProps, activeCityIds, visibleTrackCounts } = useTrackPresentation({
    tracks: entrance.routesVisible ? tracks : EMPTY_TRACKS,
    stardustTracks,
    selectedTripId,
    replayRuntime,
    lastInteractRef,
    onSelectTripRef,
  })

  const vehiclePlayback = useVehiclePlayback({
    tracks,
    selectedTripId,
    playbackSignal: tripPlaybackSignal,
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
    homeCity,
    zoomedIn,
    selectedCityId,
    activeCityIds,
    revealedCityIds,
    arrivalActive: entrance.active,
    region,
    onSelectCityRef,
    cityHoveringRef,
    lastInteractRef,
  })

  const polygons = region?.boundary ? [region.boundary] : []
  const scenePaused = !pageVisible
    || dragging
    || replayRuntime?.status === 'playing'
    || selectedCityId !== null

  return (
    <div
      ref={wrapperRef}
      data-visible-flight-tracks={visibleTrackCounts.flights}
      data-visible-train-tracks={visibleTrackCounts.trains}
      data-visible-stardust-tracks={visibleTrackCounts.stardust}
      className="absolute inset-0"
    >
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
            setGlobeReady(true)
            onReady?.()
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
              : m.kind === 'home'
                ? buildHomeMarker(m)
                : buildRegionDot(m)
          }}
          htmlElementVisibilityModifier={(el, visible) => {
            el.style.display = visible ? 'block' : 'none'
          }}
        />
      )}

      {globeReady && entrance.active && (
        <SceneRouteOverlay
          routes={sceneRoutes}
          progress={entrance.progress}
          globeRef={globeRef}
        />
      )}
      {globeReady && !entrance.active && (
        <RouteFlowOverlay
          routes={sceneRoutes}
          activeRouteId={selectedTripId}
          paused={scenePaused}
          globeRef={globeRef}
        />
      )}
      <VehicleOverlay
        playback={vehiclePlayback}
        replayRuntime={replayRuntime}
        globeRef={globeRef}
      />
      <GlobeFeedback
        region={region}
        locating={locating}
        onCloseRegion={() => onPickRef.current(null)}
      />
    </div>
  )
}
