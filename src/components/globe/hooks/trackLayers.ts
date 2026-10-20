import type { Tracks } from '@/lib/tracks'

const FLIGHT_COLOR = 'rgba(165, 216, 255, 0.85)'
const FLIGHT_COLOR_DIM = 'rgba(165, 216, 255, 0.16)'
const TRAIN_COLOR = 'rgba(251, 191, 36, 0.8)'
const TRAIN_COLOR_DIM = 'rgba(251, 191, 36, 0.14)'

interface Options {
  tracks: Tracks
  /** hover 优先，其次为已选中行程 */
  activeTripId: string | null
  onHover: (tripId: string | null) => void
  onSelect: (tripId: string) => void
}

/**
 * 轨迹层 props（PLAN T3.1–T3.3）：
 * 飞机 = 高空虚线大圆弧；高铁 = 贴地暖色折线。
 * hover/选中时整条提亮、其余淡出。
 */
export function useTrackLayers({ tracks, activeTripId, onHover, onSelect }: Options) {
  const isActive = (id: string) => activeTripId === null || activeTripId === id
  const fly = (d: object) => d as Tracks['flights'][number]
  const train = (d: object) => d as Tracks['trains'][number]

  return {
    arcsData: tracks.flights,
    arcStartLat: (d: object) => fly(d).startLat,
    arcStartLng: (d: object) => fly(d).startLng,
    arcEndLat: (d: object) => fly(d).endLat,
    arcEndLng: (d: object) => fly(d).endLng,
    arcAltitude: (d: object) => fly(d).altitude,
    arcColor: (d: object) =>
      isActive(fly(d).trip.id) ? FLIGHT_COLOR : FLIGHT_COLOR_DIM,
    arcStroke: (d: object) => (fly(d).trip.id === activeTripId ? 1.6 : 0.9),
    arcDashLength: 0.045,
    arcDashGap: (d: object) => (fly(d).trip.id === activeTripId ? 0.014 : 0.028),
    arcDashAnimateTime: 0,
    arcsTransitionDuration: 180,
    arcLabel: (d: object) => fly(d).label,
    onArcHover: (d: object | null) => onHover(d ? fly(d).trip.id : null),
    onArcClick: (d: object) => onSelect(fly(d).trip.id),

    pathsData: tracks.trains,
    pathPoints: (d: object) => train(d).points,
    pathPointLat: (p: object) => (p as [number, number])[0],
    pathPointLng: (p: object) => (p as [number, number])[1],
    pathPointAlt: 0.004,
    pathColor: (d: object) =>
      isActive(train(d).trip.id) ? TRAIN_COLOR : TRAIN_COLOR_DIM,
    pathStroke: (d: object) => (train(d).trip.id === activeTripId ? 2.2 : 1.4),
    pathTransitionDuration: 180,
    pathLabel: (d: object) => train(d).label,
    onPathHover: (d: object | null) => onHover(d ? train(d).trip.id : null),
    onPathClick: (d: object) => onSelect(train(d).trip.id),
  }
}
