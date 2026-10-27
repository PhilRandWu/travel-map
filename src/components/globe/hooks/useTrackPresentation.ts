import { useCallback, useMemo, useState, type RefObject } from 'react'
import type { GlobeProps } from 'react-globe.gl'
import { getTripCityIds } from '@/lib/derive'
import type {
  Tracks,
  TransportRoute,
  TransportRouteLeg,
} from '@/lib/tracks'
import { getTransportMode } from '@/lib/transportModes'
import { getReplayTrackState, type ReplayRuntime } from '@/lib/replay'

type TrackProps = Pick<
  GlobeProps,
  | 'arcsData'
  | 'arcStartLat'
  | 'arcStartLng'
  | 'arcEndLat'
  | 'arcEndLng'
  | 'arcAltitude'
  | 'arcColor'
  | 'arcStroke'
  | 'arcDashLength'
  | 'arcDashGap'
  | 'arcDashAnimateTime'
  | 'arcsTransitionDuration'
  | 'arcLabel'
  | 'onArcHover'
  | 'onArcClick'
  | 'pathsData'
  | 'pathPoints'
  | 'pathPointLat'
  | 'pathPointLng'
  | 'pathPointAlt'
  | 'pathColor'
  | 'pathStroke'
  | 'pathTransitionDuration'
  | 'pathLabel'
  | 'onPathHover'
  | 'onPathClick'
>

interface ArcItem {
  route: TransportRoute
  leg: TransportRouteLeg
  stardust: boolean
}

interface PathItem {
  route: TransportRoute
  stardust: boolean
}

interface Options {
  tracks: Tracks
  stardustTracks?: Tracks
  selectedTripId: string | null
  replayRuntime: ReplayRuntime | null
  lastInteractRef: RefObject<number>
  onSelectTripRef: RefObject<(tripId: string) => void>
}

const asArc = (obj: object) => obj as ArcItem
const asPath = (obj: object) => obj as PathItem

function rgba(route: TransportRoute, alpha: number): string {
  return `rgba(${getTransportMode(route.type).route.colorRgb}, ${alpha})`
}

/** 当前旅程与星尘路线共用图层，但交互和视觉权重完全分离。 */
export function useTrackPresentation({
  tracks,
  stardustTracks,
  selectedTripId,
  replayRuntime,
  lastInteractRef,
  onSelectTripRef,
}: Options) {
  const [hoverTripId, setHoverTripId] = useState<string | null>(null)
  const hoverTrip = useCallback((id: string | null) => {
    setHoverTripId((prev) => (prev === id ? prev : id))
  }, [])

  const replaying =
    replayRuntime !== null
    && replayRuntime.status !== 'idle'
    && replayRuntime.activeIndex >= 0
  const replayTrackState = useMemo(
    () => (
      replaying
        ? getReplayTrackState(replayRuntime.plan, replayRuntime.activeIndex)
        : null
    ),
    [replayRuntime?.activeIndex, replayRuntime?.plan, replaying],
  )
  const visibleRoutes = useMemo(
    () => (
      replayTrackState
        ? tracks.routes.filter((route) =>
            replayTrackState.completedTripIds.has(route.trip.id))
        : tracks.routes
    ),
    [replayTrackState, tracks.routes],
  )

  const flightItems = useMemo<ArcItem[]>(
    () => [
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
    ],
    [replaying, stardustTracks?.routes, visibleRoutes],
  )
  const pathItems = useMemo<PathItem[]>(
    () => [
      ...visibleRoutes
        .filter((route) => route.routeShape === 'surface')
        .map((route) => ({ route, stardust: false })),
      ...(replaying ? [] : (stardustTracks?.routes ?? [])
        .filter((route) => route.routeShape === 'surface')
        .map((route) => ({ route, stardust: true }))),
    ],
    [replaying, stardustTracks?.routes, visibleRoutes],
  )

  // 回放时已完成轨迹保持常亮；当前行程由载具生长动画绘制。
  const activeTripId = replaying ? null : hoverTripId ?? selectedTripId
  const replayTripId = replayTrackState?.currentTripId ?? null
  const focusedTripId = activeTripId ?? replayTripId
  const activeRoute = useMemo(
    () => (
      focusedTripId
        ? tracks.routes.find((route) => route.trip.id === focusedTripId) ?? null
        : null
    ),
    [focusedTripId, tracks.routes],
  )
  const activeCityIds = useMemo(
    () => (
      activeRoute
        ? new Set(getTripCityIds(activeRoute.trip))
        : null
    ),
    [activeRoute],
  )

  const selectTrip = useCallback(
    (tripId: string) => {
      lastInteractRef.current = performance.now()
      onSelectTripRef.current(tripId)
    },
    [lastInteractRef, onSelectTripRef],
  )

  const trackProps = useMemo<TrackProps>(
    () => ({
      arcsData: flightItems,
      arcStartLat: (d) => asArc(d).leg.from.lat,
      arcStartLng: (d) => asArc(d).leg.from.lng,
      arcEndLat: (d) => asArc(d).leg.to.lat,
      arcEndLng: (d) => asArc(d).leg.to.lng,
      arcAltitude: (d) => asArc(d).leg.altitude,
      arcColor: (d: object) => {
        const item = asArc(d)
        if (item.stardust) return rgba(item.route, 0.075)
        return rgba(
          item.route,
          activeTripId === null || activeTripId === item.route.trip.id
            ? 0.85
            : 0.16,
        )
      },
      arcStroke: (d) => {
        const item = asArc(d)
        const stroke = getTransportMode(item.route.type).route.stroke
        if (item.stardust) return 0.28
        return item.route.trip.id === activeTripId ? stroke + 0.55 : stroke
      },
      arcDashLength: (d) => (
        getTransportMode(asArc(d).route.type).route.dashLength
      ),
      arcDashGap: (d) => {
        const item = asArc(d)
        const gap = getTransportMode(item.route.type).route.dashGap
        if (item.stardust) return 0.05
        return item.route.trip.id === activeTripId ? gap : gap * 1.8
      },
      arcDashAnimateTime: 0,
      arcsTransitionDuration: 180,
      arcLabel: (d) => (asArc(d).stardust ? '' : asArc(d).route.label),
      onArcHover: (d: object | null) => {
        if (!d) {
          hoverTrip(null)
          return
        }
        const item = asArc(d)
        if (!item.stardust) hoverTrip(item.route.trip.id)
      },
      onArcClick: (d: object) => {
        const item = asArc(d)
        if (!item.stardust) selectTrip(item.route.trip.id)
      },

      pathsData: pathItems,
      pathPoints: (d) => {
        const item = asPath(d)
        const altitude = getTransportMode(item.route.type).route.baseAltitude
        return item.route.points.map(([lat, lng]) => [lat, lng, altitude])
      },
      pathPointLat: (p) => (p as [number, number, number])[0],
      pathPointLng: (p) => (p as [number, number, number])[1],
      pathPointAlt: (p) => (p as [number, number, number])[2],
      pathColor: (d: object) => {
        const item = asPath(d)
        if (item.stardust) return rgba(item.route, 0.065)
        return rgba(
          item.route,
          activeTripId === null || activeTripId === item.route.trip.id
            ? 0.8
            : 0.14,
        )
      },
      pathStroke: (d) => {
        const item = asPath(d)
        const stroke = getTransportMode(item.route.type).route.stroke
        if (item.stardust) return 0.45
        return item.route.trip.id === activeTripId ? stroke + 0.7 : stroke
      },
      pathTransitionDuration: 180,
      pathLabel: (d) => (asPath(d).stardust ? '' : asPath(d).route.label),
      onPathHover: (d: object | null) => {
        if (!d) {
          hoverTrip(null)
          return
        }
        const item = asPath(d)
        if (!item.stardust) hoverTrip(item.route.trip.id)
      },
      onPathClick: (d: object) => {
        const item = asPath(d)
        if (!item.stardust) selectTrip(item.route.trip.id)
      },
    }),
    [activeTripId, flightItems, hoverTrip, pathItems, selectTrip],
  )

  return {
    trackProps,
    activeCityIds,
    activeRoute,
    visibleTrackCounts: {
      total: visibleRoutes.length,
      surface: visibleRoutes.filter(
        (route) => route.routeShape === 'surface',
      ).length,
      stardust: flightItems.filter((item) => item.stardust).length
        + pathItems.filter((item) => item.stardust).length,
    },
  }
}
