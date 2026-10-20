import { feature } from 'topojson-client'
import { geoCentroid, geoContains } from 'd3-geo'

/**
 * 离线地名反查：
 *   中国境内 → 地级市 / 直辖市（china-cities.topojson，370 区域）
 *   中国境外 → 国家（countries.topojson，177 国，中文名）
 *   海洋/无归属 → null，由调用方显示坐标
 *
 * 数据按需加载并在内存缓存；构建见 scripts/build-geo.mjs。
 * 每个 feature 预计算 bbox 做空间预筛，避免点击时线性跑数百次球面包含算法。
 */

type TopoObject = Record<string, unknown>

interface RegionIndex {
  features: GeoJSON.Feature[]
  /** 每个 feature 的 bbox：[minLng, minLat, maxLng, maxLat]；跨 180° 几何为 null */
  boxes: (number[] | null)[]
}

type AnyCoords = number | AnyCoords[]

let chinaIndex: Promise<RegionIndex> | null = null
let worldIndex: Promise<RegionIndex> | null = null

async function loadIndex(url: string, objectKey: string): Promise<RegionIndex> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`边界数据加载失败: ${url} (${res.status})`)
  const topo = (await res.json()) as { objects: TopoObject }
  const fc = feature(topo as never, topo.objects[objectKey] as never) as unknown as GeoJSON.FeatureCollection
  const features = fc.features
  const boxes = features.map((f) => bboxOf(f.geometry))
  return { features, boxes }
}

/** 计算几何包围盒；跨 180° 经线的几何返回 null（放弃预筛，直接精确判断） */
function bboxOf(geometry: GeoJSON.Geometry): number[] | null {
  let minLng = 181,
    minLat = 91,
    maxLng = -181,
    maxLat = -91
  const walk = (coords: AnyCoords) => {
    if (typeof coords === 'number' || typeof coords[0] !== 'number') {
      if (typeof coords !== 'number') (coords as AnyCoords[]).forEach(walk)
      return
    }
    const [lng, lat] = coords as number[]
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  walk((geometry as GeoJSON.Polygon).coordinates as unknown as AnyCoords)
  // 经度跨度 >180° 说明是跨 180° 经线被切碎的几何（如俄罗斯），整体 bbox 无意义
  if (maxLng - minLng > 180) return null
  return [minLng, minLat, maxLng, maxLat]
}

export type RegionKind = 'city' | 'municipality' | 'country'

export interface GeoHit {
  /** 区域主名称，如 "深圳市" */
  name: string
  /** 所属省（仅中国地级市有） */
  province?: string
  /** 所属国家 */
  country: string
  kind: RegionKind
  /** 命中的边界多边形，供地球高亮 */
  boundary: GeoJSON.Feature
  /** 多边形质心，供放置名称标签 */
  centroid: { lat: number; lng: number }
}

function findRegion(index: RegionIndex, lat: number, lng: number) {
  const { features, boxes } = index
  for (let i = 0; i < features.length; i++) {
    const box = boxes[i]
    // bbox 快速排除（跨经线几何 box 为 null，直接进入精确判断）
    if (box && (lng < box[0] || lng > box[2] || lat < box[1] || lat > box[3])) continue
    // geoContains 接收 [lng, lat]，球面算法，内部处理跨 180° 经线
    if (geoContains(features[i] as never, [lng, lat])) return features[i]
  }
  return undefined
}

function toHit(f: GeoJSON.Feature) {
  const [clng, clat] = geoCentroid(f as never)
  return { feature: f, centroid: { lat: clat, lng: clng } }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoHit | null> {
  chinaIndex ??= loadIndex('/geo/china-cities.topojson', 'regions')
  const china = await chinaIndex
  const cn = findRegion(china, lat, lng)
  if (cn) {
    const p = cn.properties as { name: string; province?: string; level?: string }
    const { feature: boundary, centroid } = toHit(cn)
    return {
      name: p.name,
      province: p.province && p.province !== p.name ? p.province : undefined,
      country: '中国',
      kind: p.level === 'city' ? 'city' : 'municipality',
      boundary,
      centroid,
    }
  }

  worldIndex ??= loadIndex('/geo/countries.topojson', 'countries')
  const world = await worldIndex
  const co = findRegion(world, lat, lng)
  if (co) {
    const p = co.properties as { name: string }
    const { feature: boundary, centroid } = toHit(co)
    return { name: p.name, country: p.name, kind: 'country', boundary, centroid }
  }

  return null
}

/** 空闲时预取两份边界，消除首次点击的加载延迟 */
export function preloadGeoData() {
  chinaIndex ??= loadIndex('/geo/china-cities.topojson', 'regions')
  worldIndex ??= loadIndex('/geo/countries.topojson', 'countries')
}

/** 坐标格式化为 度°分′ 文本，用于海洋等无归属区域 */
export function formatLatLng(lat: number, lng: number): string {
  const fmt = (v: number, pos: string, neg: string) => {
    const dir = v >= 0 ? pos : neg
    const abs = Math.abs(v)
    const deg = Math.floor(abs)
    const min = Math.round((abs - deg) * 60)
    return `${deg}°${String(min).padStart(2, '0')}′ ${dir}`
  }
  return `${fmt(lat, 'N', 'S')}　${fmt(lng, 'E', 'W')}`
}
