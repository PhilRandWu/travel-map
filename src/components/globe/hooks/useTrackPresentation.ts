import { useCallback, useMemo, useState, type RefObject } from 'react'
import type { GlobeProps } from 'react-globe.gl'
import { getTripCityIds } from '@/lib/derive'
import type { Tracks } from '@/lib/tracks'
import { getReplayTrackState, type ReplayRuntime } from '@/lib/replay'

const FLIGHT_COLOR = 'rgba(165, 216, 255, 0.85)'
const FLIGHT_COLOR_DIM = 'rgba(165, 216, 255, 0.16)'
const TRAIN_COLOR = 'rgba(251, 191, 36, 0.8)'
const TRAIN_COLOR_DIM = 'rgba(251, 191, 36, 0.14)'

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

interface Options {
  tracks: Tracks
  selectedTripId: string | null
  replayRuntime: ReplayRuntime | null
  lastInteractRef: RefObject<number>
  onSelectTripRef: RefObject<(tripId: string) => void>
}

const asFlight = (obj: object) => obj as Tracks['flights'][number]
const asTrain = (obj: object) => obj as Tracks['trains'][number]

/** 构造 globe.gl 的飞机/高铁图层，并维护 hover 与选中行程的互斥高亮。 */
export function useTrackPresentation({
  tracks,
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
  const visibleFlights = useMemo(
    () => (
      replayTrackState
        ? tracks.flights.filter((track) =>
            replayTrackState.completedTripIds.has(track.trip.id))
        : tracks.flights
    ),
    [replayTrackState, tracks.flights],
  )
  const visibleTrains = useMemo(
    () => (
      replayTrackState
        ? tracks.trains.filter((track) =>
            replayTrackState.completedTripIds.has(track.trip.id))
        : tracks.trains
    ),
    [replayTrackState, tracks.trains],
  )

  // 回放时已完成轨迹保持常亮；当前行程由载具生长动画绘制。
  const activeTripId = replaying ? null : hoverTripId ?? selectedTripId
  const activeTrip = useMemo(() => {
    if (!activeTripId) return null
    return (
      tracks.flights.find((track) => track.trip.id === activeTripId)?.trip ??
      tracks.trains.find((track) => track.trip.id === activeTripId)?.trip ??
      null
    )
  }, [activeTripId, tracks])
  const activeCityIds = useMemo(
    () => (activeTrip ? new Set(getTripCityIds(activeTrip)) : null),
    [activeTrip],
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
      // 飞机：高空虚线大圆弧；hover/选中时提亮，其余轨迹淡出。
      arcsData: visibleFlights,
      arcStartLat: (d) => asFlight(d).startLat,
      arcStartLng: (d) => asFlight(d).startLng,
      arcEndLat: (d) => asFlight(d).endLat,
      arcEndLng: (d) => asFlight(d).endLng,
      arcAltitude: (d) => asFlight(d).altitude,
      arcColor: (d: object) =>
        activeTripId === null || activeTripId === asFlight(d).trip.id
          ? FLIGHT_COLOR
          : FLIGHT_COLOR_DIM,
      arcStroke: (d) => (asFlight(d).trip.id === activeTripId ? 1.6 : 0.9),
      arcDashLength: 0.045,
      arcDashGap: (d) => (asFlight(d).trip.id === activeTripId ? 0.014 : 0.028),
      arcDashAnimateTime: 0,
      arcsTransitionDuration: 180,
      arcLabel: (d) => asFlight(d).label,
      onArcHover: (d: object | null) => hoverTrip(d ? asFlight(d).trip.id : null),
      onArcClick: (d: object) => selectTrip(asFlight(d).trip.id),

      // 高铁：贴地暖色实线折线。
      pathsData: visibleTrains,
      pathPoints: (d) => asTrain(d).points,
      pathPointLat: (p) => (p as [number, number])[0],
      pathPointLng: (p) => (p as [number, number])[1],
      pathPointAlt: 0.004,
      pathColor: (d: object) =>
        activeTripId === null || activeTripId === asTrain(d).trip.id
          ? TRAIN_COLOR
          : TRAIN_COLOR_DIM,
      pathStroke: (d) => (asTrain(d).trip.id === activeTripId ? 2.2 : 1.4),
      pathTransitionDuration: 180,
      pathLabel: (d) => asTrain(d).label,
      onPathHover: (d: object | null) => hoverTrip(d ? asTrain(d).trip.id : null),
      onPathClick: (d: object) => selectTrip(asTrain(d).trip.id),
    }),
    [activeTripId, hoverTrip, selectTrip, visibleFlights, visibleTrains],
  )

  return {
    trackProps,
    activeCityIds,
    visibleTrackCounts: {
      flights: visibleFlights.length,
      trains: visibleTrains.length,
    },
  }
}
