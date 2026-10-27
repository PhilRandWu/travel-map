import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import type { TravelGlobeProps } from '@/components/globe/TravelGlobe.types'
import { useGlobeMarkers } from '@/components/globe/hooks/useGlobeMarkers'
import { useContainerSize } from '@/components/globe/hooks/useContainerSize'
import { useGlobeControls } from '@/components/globe/hooks/useGlobeControls'
import { useAtmosphereGlow, ATMOSPHERE_COLOR, ATMOSPHERE_ALTITUDE } from '@/components/globe/hooks/useAtmosphereGlow'
import { useAutoRotate } from '@/components/globe/hooks/useAutoRotate'
import { useDragClickGuard } from '@/components/globe/hooks/useDragClickGuard'
import { useTrackPresentation } from '@/components/globe/hooks/useTrackPresentation'
import { useVehicleScene } from '@/components/globe/hooks/useVehicleScene'
import { useJourneyReveal } from '@/components/globe/hooks/useJourneyReveal'
import { useCameraFocus } from '@/components/globe/hooks/useCameraFocus'
import { useMotion } from '@/components/motion/MotionProvider'
import { useGlobePicking } from '@/components/globe/hooks/useGlobePicking'
import VehicleOverlay from '@/components/globe/VehicleOverlay'
import VehicleCameraStatus from '@/components/globe/VehicleCameraStatus'
import GlobeFeedback from '@/components/globe/GlobeFeedback'
import SceneRouteOverlay from '@/components/globe/SceneRouteOverlay'
import RouteFlowOverlay from '@/components/globe/RouteFlowOverlay'
import { buildCityMarker, buildHomeMarker, buildRegionDot, type GlobeMarker } from '@/components/globe/cityMarkers'
import {
  INITIAL_POV,
  LABEL_ALT_THRESHOLD,
  RESUME_AFTER_IDLE,
} from '@/components/globe/globeConfig'
import { buildJourneySceneRoutes } from '@/lib/journeyScene'
import type { Tracks } from '@/lib/tracks'

const EMPTY_TRACKS: Tracks = { routes: [], flights: [], trains: [] }
const TEXTURE_BASE = `${import.meta.env.BASE_URL}textures/`

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
  framing,
  resetSignal,
  onReady,
  onDirectorCameraChange,
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
  const [globeReady, setGlobeReady] = useState(false)
  const { effectiveLevel, pageVisible } = useMotion()

  // 交互状态用 ref，自转循环内读取，不触发重渲染
  const draggingRef = useRef(false)
  const cameraLockedRef = useRef(false)
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
    cameraLockedRef,
  })

  // 大气呼吸、表面 hover 指针样式（详见 useAtmosphereGlow）
  useAtmosphereGlow(globeRef, wrapperRef, [size], { draggingRef, cityHoveringRef })
  const directorEnabled = pageVisible && effectiveLevel !== 'calm'
  const {
    playback: vehiclePlayback,
    runtime: vehicleRuntime,
    directorCamera,
  } = useVehicleScene({
    tracks,
    selectedTripId,
    playbackSignal: tripPlaybackSignal,
    replayRuntime,
    pageVisible,
    directorEnabled,
    globeRef,
    framing,
  })
  useEffect(() => {
    onDirectorCameraChange?.(directorCamera.locked)
  }, [directorCamera.locked, onDirectorCameraChange])
  cameraLockedRef.current = directorCamera.locked
  const flyTo = useCameraFocus({
    globeRef,
    lastInteractRef,
    cameraLockedRef,
    litCities,
    selectedCityId,
    focusPoint,
    resetSignal,
    suppressed: directorEnabled && vehiclePlayback !== null,
  })

  const { locating, handleGlobeClick } = useGlobePicking({
    onPickRef,
    lastInteractRef,
    flyTo,
  })

  const { trackProps, activeCityIds, visibleTrackCounts } = useTrackPresentation({
    tracks: entrance.routesVisible ? tracks : EMPTY_TRACKS,
    stardustTracks,
    selectedTripId,
    replayRuntime,
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
    locked: directorCamera.locked,
  })

  const polygons = region?.boundary ? [region.boundary] : []
  const scenePaused = !pageVisible
    || dragging
    || directorCamera.locked
    || replayRuntime?.status === 'playing'
    || selectedCityId !== null

  return (
    <div
      ref={wrapperRef}
      data-visible-flight-tracks={visibleTrackCounts.flights}
      data-visible-train-tracks={visibleTrackCounts.trains}
      data-visible-stardust-tracks={visibleTrackCounts.stardust}
      data-camera-locked={directorCamera.locked}
      className="absolute inset-0"
    >
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={`${TEXTURE_BASE}earth-night.webp`}
          bumpImageUrl={`${TEXTURE_BASE}earth-topology.webp`}
          showAtmosphere
          enablePointerInteraction={!directorCamera.locked}
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
          onGlobeClick={(coords) => {
            if (!cameraLockedRef.current) {
              handleGlobeClickWithSelection(coords)
            }
          }}
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
              ? buildCityMarker(m, { onSelect: handleSelectCity, onHover: handleHoverCity, locked: directorCamera.locked })
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
        runtime={vehicleRuntime}
        globeRef={globeRef}
      />
      <VehicleCameraStatus
        active={directorCamera.locked}
        status={directorCamera.status}
      />
      <GlobeFeedback
        region={region}
        locating={locating}
        onCloseRegion={() => onPickRef.current(null)}
      />
    </div>
  )
}
