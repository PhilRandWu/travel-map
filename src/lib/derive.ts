import type { City, TimelineNodeKind, TravelData, Trip, Visit } from '@/types'
import { resolveCities } from '@/lib/cities'
import { compareDate } from '@/lib/validate'
import { tripDistance } from '@/lib/geo'

/**
 * 展示数据全部从 trips.json 推导（PRD 第 4 节「推导规则」），本文件只放纯函数。
 */

/** 有 visit 的城市 + 到访次数与首末日期 */
export interface LitCity {
  city: City
  visitCount: number
  firstDate: string
  lastDate: string
  visitIds: string[]
}

export function selectLitCities(data: TravelData): LitCity[] {
  const cityMap = resolveCities(data)
  const byCity = new Map<string, Visit[]>()
  for (const v of data.visits) {
    const list = byCity.get(v.city) ?? []
    list.push(v)
    byCity.set(v.city, list)
  }
  const lit: LitCity[] = []
  for (const [cityId, visits] of byCity) {
    const city = cityMap.get(cityId)
    if (!city) continue // 引用缺失由 validate 报错
    const sorted = [...visits].sort((a, b) => compareDate(a.arriveDate, b.arriveDate))
    lit.push({
      city,
      visitCount: visits.length,
      firstDate: sorted[0].arriveDate,
      lastDate: sorted[sorted.length - 1].leaveDate,
      visitIds: sorted.map((v) => v.id),
    })
  }
  return lit.sort((a, b) => compareDate(a.firstDate, b.firstDate))
}

/** 时间轴节点：visit 与 trip 按日期合并排序（visit 取 arriveDate） */
export interface TimelineNode {
  kind: TimelineNodeKind // 'visit' | 'trip'
  date: string
  /** visit/trip 的 id */
  refId: string
  /** 节点关联城市（visit=到访城市，trip=出发城市） */
  cityId: string
  label: string
}

export function buildTimelineNodes(data: TravelData): TimelineNode[] {
  const nodes: TimelineNode[] = []
  for (const v of data.visits) {
    nodes.push({
      kind: 'visit',
      date: v.arriveDate,
      refId: v.id,
      cityId: v.city,
      label: v.note ?? '',
    })
  }
  for (const t of data.trips) {
    nodes.push({
      kind: 'trip',
      date: t.date,
      refId: t.id,
      cityId: t.from,
      label: t.note ?? '',
    })
  }
  // 同日先行程（trip）后到访（visit）：先飞抵/抵达，再开始停留，叙事更自然
  return nodes.sort((a, b) =>
    compareDate(a.date, b.date) || a.kind.localeCompare(b.kind) || a.refId.localeCompare(b.refId))
}

export interface TravelStats {
  cityCount: number
  provinceCount: number
  countryCount: number
  flightCount: number
  trainCount: number
  /** 累计里程 km（缺失引用的行程不计入） */
  totalDistanceKm: number
  firstDate: string | null
  lastDate: string | null
}

export function computeStats(data: TravelData): TravelStats {
  const lit = selectLitCities(data)
  const provinces = new Set<string>()
  const countries = new Set<string>()
  for (const { city } of lit) {
    provinces.add(city.province)
    countries.add(city.country)
  }

  const cityMap = resolveCities(data)
  let totalDistanceKm = 0
  for (const t of data.trips) {
    totalDistanceKm += tripDistance(t, cityMap) ?? 0
  }

  // 首次日期取最早出发/到达；最近日期取最晚离开（leaveDate），行程末日也算在出行区间内
  const dates = [
    ...data.trips.map((t) => t.date),
    ...data.visits.map((v) => v.arriveDate),
    ...data.visits.map((v) => v.leaveDate),
  ].sort(compareDate)

  return {
    cityCount: lit.length,
    provinceCount: provinces.size,
    countryCount: countries.size,
    flightCount: data.trips.filter((t) => t.type === 'flight').length,
    trainCount: data.trips.filter((t) => t.type === 'train').length,
    totalDistanceKm: Math.round(totalDistanceKm),
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  }
}

/* ---------- 关联查询 ---------- */

/** 某城市的全部到访（按到达日期升序） */
export function getCityVisits(data: TravelData, cityId: string): Visit[] {
  return data.visits
    .filter((v) => v.city === cityId)
    .sort((a, b) => compareDate(a.arriveDate, b.arriveDate))
}

/** 一段行程经过的城市 id 序列：from → waypoints → to */
export function getTripCityIds(trip: Trip): string[] {
  return [trip.from, ...trip.waypoints, trip.to]
}

/** 涉及某城市的全部行程（出发/到达/经停） */
export function getCityTrips(data: TravelData, cityId: string): Trip[] {
  return data.trips
    .filter((t) => getTripCityIds(t).includes(cityId))
    .sort((a, b) => compareDate(a.date, b.date))
}

/** 某城市的照片（跨全部到访，按到访顺序） */
export function getCityPhotos(data: TravelData, cityId: string) {
  return getCityVisits(data, cityId).flatMap((v) =>
    v.photos.map((p) => ({ visitId: v.id, ...p })))
}

export function findVisit(data: TravelData, visitId: string): Visit | undefined {
  return data.visits.find((v) => v.id === visitId)
}

export function findTrip(data: TravelData, tripId: string): Trip | undefined {
  return data.trips.find((t) => t.id === tripId)
}

/** 照片 URL：/photos/<visit-id>/<file>（public 静态目录） */
export function photoUrl(visitId: string, file: string): string {
  return `${import.meta.env.BASE_URL}photos/${visitId}/${file}`
}

/** 构建期生成的缩略图 URL：/thumbs/<visit-id>/<file>.webp */
export function photoThumbUrl(visitId: string, file: string): string {
  return `${import.meta.env.BASE_URL}thumbs/${visitId}/${file}.webp`
}
