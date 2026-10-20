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
}

export interface TrainPath {
  trip: Trip
  /** [lat, lng] 点串（跨段拼接，已去连接点重复） */
  points: [number, number][]
  midLat: number
  midLng: number
  label: string
}

export interface Tracks {
  flights: FlightArc[]
  trains: TrainPath[]
}

/** 同航线去重键：不分方向（A→B 与 B→A 视为同一走廊） */
const corridorKey = (a: string, b: string) => [a, b].sort().join('|')

export function buildTracks(data: TravelData): Tracks {
  const cityMap = resolveCities(data)
  const corridorCount = new Map<string, number>()
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
      const dup = corridorCount.get(key) ?? 0
      corridorCount.set(key, dup + 1)
      // 同走廊第 2、3… 条弧顶逐次抬高 18%，肉眼可分辨是两条航线
      const altitude = flightArcAltitude(haversineKm(from, to)) * (1 + dup * 0.18)
      const mid = greatCirclePoints(from, to, 2)[1]
      flights.push({
        trip: t,
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        altitude,
        midLat: mid[0],
        midLng: mid[1],
        label,
      })
    } else {
      const seq = [t.from, ...t.waypoints, t.to].map((id) => cityMap.get(id))
      if (seq.some((c) => !c)) continue
      const cities = seq as City[]
      const points: [number, number][] = []
      for (let i = 1; i < cities.length; i++) {
        const seg = greatCirclePoints(cities[i - 1], cities[i], 32)
        points.push(...(i === 1 ? seg : seg.slice(1)))
      }
      const midPoint = points[Math.floor(points.length / 2)]
      trains.push({ trip: t, points, midLat: midPoint[0], midLng: midPoint[1], label })
    }
  }
  return { flights, trains }
}
