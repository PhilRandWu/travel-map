import type { City, TravelData, Trip } from '@/types'
import { resolveCities } from '@/lib/cities'
import { compareDate } from '@/lib/validate'
import { flightArcAltitude, greatCirclePoints, haversineKm } from '@/lib/geo'

/**
 * 轨迹展示数据（PLAN T3.1–T3.3）：
 * - flight → 高空虚线大圆弧（globe.gl arcsData）；
 * - train  → from → waypoints → to 贴地折线（globe.gl pathsData），
 *   逐段经 geo.ts 大圆采样拼接，保证贴地顺滑；
 * - 相同起终点的多条航班逐次抬高弧顶，避免重叠成一条。
 * 本文件只放纯函数，引用缺失的行程跳过（由 validate 报错）。
 */

export interface FlightArc {
  trip: Trip
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  /** 弧顶高度（已含同航线去重偏移） */
  altitude: number
  /** 大圆中点，供相机聚焦 */
  midLat: number
  midLng: number
  /** tooltip 文案：日期 · 起 → 终 · 备注 */
  label: string
  /** 出发城市坐标，供行程聚焦与时间轴联动 */
  fromLat: number
  fromLng: number
  /** 到达城市坐标，供行程聚焦与时间轴联动 */
  toLat: number
  toLng: number
}

export interface TrainPath {
  trip: Trip
  /** [lat, lng] 点串（跨段拼接，已去连接点重复） */
  points: [number, number][]
  midLat: number
  midLng: number
  label: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

export interface Tracks {
  flights: FlightArc[]
  trains: TrainPath[]
}

/** 同航线去重键：不分方向（A→B 与 B→A 视为同一走廊） */
const corridorKey = (a: string, b: string) => [a, b].sort().join('|')

/** 高铁重复走廊的侧向车道间距（度） */
const TRAIN_LANE_DEG = 0.16
const DEG = Math.PI / 180

export function buildTracks(data: TravelData): Tracks {
  const cityMap = resolveCities(data)
  const flightCorridorCount = new Map<string, number>()
  const trainCorridorCount = new Map<string, number>()
  const flights: FlightArc[] = []
  const trains: TrainPath[] = []

  const sorted = [...data.trips].sort((a, b) => compareDate(a.date, b.date))
  for (const t of sorted) {
    const from = cityMap.get(t.from)
    const to = cityMap.get(t.to)
    if (!from || !to) continue
    const label = `${t.date} · ${from.name} → ${to.name}${t.note ? ` · ${t.note}` : ''}`

    if (t.type === 'flight') {
      const key = corridorKey(t.from, t.to)
      const dup = flightCorridorCount.get(key) ?? 0
      flightCorridorCount.set(key, dup + 1)
      // 同走廊第 2、3… 条弧顶逐次抬高 18%，肉眼可分辨是两条航线
      const altitude = flightArcAltitude(haversineKm(from, to)) * (1 + dup * 0.18)
      const mid = greatCirclePoints(from, to, 2)[1]
      flights.push({
        trip: t,
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
        altitude,
        midLat: mid[0],
        midLng: mid[1],
        label,
      })
    } else {
      const seq = [t.from, ...t.waypoints, t.to].map((id) => cityMap.get(id))
      if (seq.some((c) => !c)) continue
      const cities = seq as City[]
      const key = corridorKey(t.from, t.to)
      const dup = trainCorridorCount.get(key) ?? 0
      trainCorridorCount.set(key, dup + 1)
      const laneOffset = trainLaneOffset(dup)
      const points: [number, number][] = []
      for (let i = 1; i < cities.length; i++) {
        const seg = offsetTrainSegment(cities[i - 1], cities[i], laneOffset)
        points.push(...(i === 1 ? seg : seg.slice(1)))
      }
      const midPoint = points[Math.floor(points.length / 2)]
      trains.push({
        trip: t,
        points,
        midLat: midPoint[0],
        midLng: midPoint[1],
        label,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
      })
    }
  }
  return { flights, trains }
}

/** 第 1 条走中线，之后按右、左、右…递增偏移，往返方向也视为同一走廊 */
function trainLaneOffset(dup: number): number {
  if (dup === 0) return 0
  const lane = Math.ceil(dup / 2)
  return (dup % 2 === 1 ? lane : -lane) * TRAIN_LANE_DEG
}

/**
 * 大圆分段采样后，将中间点沿局部垂线侧移。
 * 两端保持原坐标，确保线路仍精确连接城市与 waypoint。
 */
function offsetTrainSegment(from: City, to: City, offsetDeg: number): [number, number][] {
  const points = greatCirclePoints(from, to, 32)
  if (offsetDeg === 0 || points.length <= 2) return points

  const dLat = to.lat - from.lat
  const dLng = (((to.lng - from.lng + 540) % 360) - 180)
  const length = Math.hypot(dLat, dLng)
  if (length === 0) return points

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point
    const t = index / (points.length - 1)
    const distance = Math.sin(Math.PI * t) * offsetDeg
    const lat = point[0] + (-dLng / length) * distance
    const lngScale = Math.max(0.2, Math.cos(point[0] * DEG))
    const lng = point[1] + (dLat / length) * distance / lngScale
    return [
      Math.max(-89.999, Math.min(89.999, lat)),
      ((lng + 540) % 360) - 180,
    ]
  })
}
