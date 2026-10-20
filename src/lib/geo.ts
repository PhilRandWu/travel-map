import type { City, Trip } from '@/types'

/**
 * 大圆几何（PRD 3.1 / T1.4）：
 * - 距离用 haversine（地球近似球体，展示用）；
 * - 弧线点串用单位向量 slerp 插值，天然是大圆且正确处理跨 180° 经线；
 * - train 里程 = 各相邻城市大圆距离之和。
 */

export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371
const DEG = Math.PI / 180

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG
  const dLng = (b.lng - a.lng) * DEG
  const lat1 = a.lat * DEG
  const lat2 = b.lat * DEG
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toVec3(p: LatLng): [number, number, number] {
  const lat = p.lat * DEG
  const lng = p.lng * DEG
  // 与 three.js 约定一致：Y 轴指向北极
  return [
    Math.cos(lat) * Math.cos(lng),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lng),
  ]
}

function fromVec3(x: number, y: number, z: number): LatLng {
  const len = Math.hypot(x, y, z) || 1
  x /= len; y /= len; z /= len
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, y))) / DEG,
    lng: Math.atan2(z, x) / DEG,
  }
}

/**
 * 大圆插值采样：返回 from → to 的 [lat, lng] 点串（含两端）。
 * segments 建议 48–96，点串交给 globe.gl pathsData 或自绘弧线。
 */
export function greatCirclePoints(from: LatLng, to: LatLng, segments = 64): [number, number][] {
  const [x1, y1, z1] = toVec3(from)
  const [x2, y2, z2] = toVec3(to)
  let cosOmega = x1 * x2 + y1 * y2 + z1 * z2
  cosOmega = Math.max(-1, Math.min(1, cosOmega))
  // 起终点重合（或对跖点退化）直接返回端点
  if (cosOmega > 1 - 1e-10) return [[from.lat, from.lng], [to.lat, to.lng]]
  const omega = Math.acos(cosOmega)
  const sinOmega = Math.sin(omega)

  const pts: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    // 首尾直接用输入坐标，消除 slerp 归一化带来的浮点尾差（弧线精确闭合于城市点）
    if (i === 0) { pts.push([from.lat, from.lng]); continue }
    if (i === segments) { pts.push([to.lat, to.lng]); continue }
    const t = i / segments
    const a = Math.sin((1 - t) * omega) / sinOmega
    const b = Math.sin(t * omega) / sinOmega
    const p = fromVec3(a * x1 + b * x2, a * y1 + b * y2, a * z1 + b * z2)
    pts.push([p.lat, p.lng])
  }
  return pts
}

/**
 * 飞行弧顶高度（globe.gl arcs 的 alt 语义为相对球心的拔高比例）。
 * 短航线 0.1、洲际航线封顶 ~0.6，按航程线性插值。
 */
export function flightArcAltitude(km: number): number {
  const t = Math.max(0, Math.min(1, (km - 300) / 9000))
  return 0.1 + t * 0.5
}

/**
 * 一段行程的里程：
 * - flight：起终点大圆距离；
 * - train：from → waypoints → to 各段大圆距离之和。
 * cityMap 缺引用时返回 null（校验层负责报错）。
 */
export function tripDistance(trip: Trip, cityMap: Map<string, City>): number | null {
  const seq = [trip.from, ...trip.waypoints, trip.to]
  const pts = seq.map((id) => cityMap.get(id))
  if (pts.some((p) => !p)) return null
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    total += haversineKm(pts[i - 1] as City, pts[i] as City)
  }
  return total
}
