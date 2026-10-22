import { useCallback, useMemo, useState, type RefObject } from 'react'
import type { GlobeProps } from 'react-globe.gl'
import { getTripCityIds } from '@/lib/derive'
import type { Tracks } from '@/lib/tracks'
import { getReplayTrackState, type ReplayRuntime } from '@/lib/replay'

const FLIGHT_COLOR = 'rgba(165, 216, 255, 0.85)'
const FLIGHT_COLOR_DIM = 'rgba(165, 216, 255, 0.16)'
const TRAIN_COLOR = 'rgba(251, 191, 36, 0.8)'
const TRAIN_COLOR_DIM = 'rgba(251, 191, 36, 0.14)'
const STARDUST_FLIGHT_COLOR = 'rgba(165, 216, 255, 0.075)'
const STARDUST_TRAIN_COLOR = 'rgba(251, 191, 36, 0.065)'

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

interface FlightItem {
  track: Tracks['flights'][number]
  stardust: boolean
}

interface TrainItem {
  track: Tracks['trains'][number]
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

const asFlight = (obj: object) => obj as FlightItem
const asTrain = (obj: object) => obj as TrainItem

/** 当前旅程轨迹与其他旅程星尘共用图层，但交互和视觉权重完全分离。 */
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
  const flightItems = useMemo<FlightItem[]>(
    () => [
      ...visibleFlights.map((track) => ({ track, stardust: false })),
      ...(replaying ? [] : (stardustTracks?.flights ?? [])
        .map((track) => ({ track, stardust: true }))),
    ],
    [replaying, stardustTracks?.flights, visibleFlights],
  )
  const trainItems = useMemo<TrainItem[]>(
    () => [
      ...visibleTrains.map((track) => ({ track, stardust: false })),
      ...(replaying ? [] : (stardustTracks?.trains ?? [])
        .map((track) => ({ track, stardust: true }))),
    ],
    [replaying, stardustTracks?.trains, visibleTrains],
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
      arcsData: flightItems,
      arcStartLat: (d) => asFlight(d).track.startLat,
      arcStartLng: (d) => asFlight(d).track.startLng,
      arcEndLat: (d) => asFlight(d).track.endLat,
      arcEndLng: (d) => asFlight(d).track.endLng,
      arcAltitude: (d) => asFlight(d).track.altitude,
      arcColor: (d: object) => {
        const item = asFlight(d)
        if (item.stardust) return STARDUST_FLIGHT_COLOR
        return activeTripId === null || activeTripId === item.track.trip.id
          ? FLIGHT_COLOR
          : FLIGHT_COLOR_DIM
      },
      arcStroke: (d) => {
        const item = asFlight(d)
        if (item.stardust) return 0.28
        return item.track.trip.id === activeTripId ? 1.6 : 0.9
      },
      arcDashLength: 0.045,
      arcDashGap: (d) => {
        const item = asFlight(d)
        if (item.stardust) return 0.05
        return item.track.trip.id === activeTripId ? 0.014 : 0.028
      },
      arcDashAnimateTime: 0,
      arcsTransitionDuration: 180,
      arcLabel: (d) => (asFlight(d).stardust ? '' : asFlight(d).track.label),
      onArcHover: (d: object | null) => {
        if (!d) {
          hoverTrip(null)
          return
        }
        const item = asFlight(d)
        if (!item.stardust) hoverTrip(item.track.trip.id)
      },
      onArcClick: (d: object) => {
        const item = asFlight(d)
        if (!item.stardust) selectTrip(item.track.trip.id)
      },

      pathsData: trainItems,
      pathPoints: (d) => asTrain(d).track.points,
      pathPointLat: (p) => (p as [number, number])[0],
      pathPointLng: (p) => (p as [number, number])[1],
      pathPointAlt: 0.004,
      pathColor: (d: object) => {
        const item = asTrain(d)
        if (item.stardust) return STARDUST_TRAIN_COLOR
        return activeTripId === null || activeTripId === item.track.trip.id
          ? TRAIN_COLOR
          : TRAIN_COLOR_DIM
      },
      pathStroke: (d) => {
        const item = asTrain(d)
        if (item.stardust) return 0.45
        return item.track.trip.id === activeTripId ? 2.2 : 1.4
      },
      pathTransitionDuration: 180,
      pathLabel: (d) => (asTrain(d).stardust ? '' : asTrain(d).track.label),
      onPathHover: (d: object | null) => {
        if (!d) {
          hoverTrip(null)
          return
        }
        const item = asTrain(d)
        if (!item.stardust) hoverTrip(item.track.trip.id)
      },
      onPathClick: (d: object) => {
        const item = asTrain(d)
        if (!item.stardust) selectTrip(item.track.trip.id)
      },
    }),
    [activeTripId, flightItems, hoverTrip, selectTrip, trainItems],
  )

  return {
    trackProps,
    activeCityIds,
    visibleTrackCounts: {
      flights: visibleFlights.length,
      trains: visibleTrains.length,
      stardust: flightItems.filter((item) => item.stardust).length
        + trainItems.filter((item) => item.stardust).length,
    },
  }
}
