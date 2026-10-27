/**
 * 旅行数据领域模型（字段以 PRD 第 4 节为准，冻结，勿私自膨胀）。
 * 唯一数据源：src/data/trips.json。城市点亮、时间轴、统计全部由它推导。
 */

/** 交通方式：飞机 / 高铁 / 地铁 / 轮船 / 汽车 */
export type TransportType = 'flight' | 'train' | 'metro' | 'ship' | 'car'
export type JourneyTheme = 'amber' | 'cyan' | 'sage' | 'rose'

/** 城市坐标与行政区划 */
export interface City {
  id: string
  name: string
  /** 纬度 [-90, 90] */
  lat: number
  /** 经度 [-180, 180] */
  lng: number
  /** 省级行政区/州，如「浙江」「California」 */
  province: string
  country: string
}

/** 一张照片：位于 public/photos/<visit-id>/<file> */
export interface Photo {
  file: string
  caption?: string
  takenAt?: string
  featured?: boolean
  focalPoint?: {
    x: number
    y: number
  }
}

export type PhotoVariant = 'blur' | 'sm' | 'md' | 'preview'
export type MemoryMode = 'featured' | 'all'
export type MemoryView = 'stage' | 'constellation'

export type MemorySource =
  | { kind: 'visit'; visitId: string }
  | { kind: 'journey'; journeyId: string }

export interface JourneyCoverPhoto {
  visitId: string
  file: string
}

/** 一段拥有独立日期范围、主题与照片封面的旅行。 */
export interface Journey {
  id: string
  title: string
  startDate: string
  endDate: string
  epigraph?: string
  summary?: string
  theme: JourneyTheme
  coverPhotos: JourneyCoverPhoto[]
}

/**
 * 一段行程（回放时视为一条交通路线）。
 * 五种方式统一按 from → waypoints[0] → … → to 渲染。
 */
export interface Trip {
  id: string
  journeyId: string
  /** 出行日期 YYYY-MM-DD */
  date: string
  type: TransportType
  from: string
  to: string
  /** 有序经停城市 id，最多 4 个 */
  waypoints: string[]
  /** 备注：航班号、车次、线路、船班或自驾路线 */
  note?: string
}

/** 一次城市到访（一个日期区间 + 照片） */
export interface Visit {
  id: string
  journeyId: string
  /** 到访城市 id */
  city: string
  arriveDate: string
  leaveDate: string
  note?: string
  photos: Photo[]
}

export interface TravelMeta {
  owner: string
  /** 常居城市 id */
  homeCity: string
  version: 2
}

export interface TravelData {
  meta: TravelMeta
  cities: City[]
  journeys: Journey[]
  trips: Trip[]
  visits: Visit[]
}

export type JourneyScope =
  | { kind: 'archive' }
  | { kind: 'journey'; journeyId: string }

/** 时间轴节点类型：到访 / 行程 */
export type TimelineNodeKind = 'visit' | 'trip'

/**
 * 全局选中状态（PLAN 0.3）：
 * 时间轴、地球、主图区、统计只读这一个 Selection，联动天然一致。
 */
export type Selection =
  | { kind: 'none' }
  | { kind: 'visit'; visitId: string }
  | { kind: 'trip'; tripId: string }
  | { kind: 'city'; cityId: string }
