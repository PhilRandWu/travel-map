import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import {
  buildTimelineNodes,
  computeStats,
  getCityTrips,
  getCityVisits,
  getTripCityIds,
  selectLitCities,
} from '@/lib/derive'
import { greatCirclePoints, haversineKm, tripDistance } from '@/lib/geo'
import { resolveCities } from '@/lib/cities'
import { validateTravelData } from '@/lib/validate'

const d = data as TravelData
const cityMap = resolveCities(d)

describe('validateTravelData（示例数据必须零错误）', () => {
  it('同步校验无 error 且无 warning', () => {
    const issues = validateTravelData(d)
    expect(issues.filter((i) => i.level === 'error')).toEqual([])
    expect(issues).toEqual([])
  })

  it('缺失城市引用必须报错', () => {
    const broken = structuredClone(d)
    broken.trips[0].to = 'atlantis'
    const issues = validateTravelData(broken)
    expect(issues.some((i) =>
      i.subject === `trip:${broken.trips[0].id}` && i.message.includes('atlantis'))).toBe(true)
  })

  it('arriveDate 晚于 leaveDate 必须报错', () => {
    const broken = structuredClone(d)
    broken.visits[0].leaveDate = '2025-04-01'
    expect(validateTravelData(broken).some((i) => i.message.includes('晚于'))).toBe(true)
  })

  it('重复 id 必须报错', () => {
    const broken = structuredClone(d)
    broken.visits[1].id = broken.visits[0].id
    expect(validateTravelData(broken).some((i) => i.message.includes('重复'))).toBe(true)
  })

  it('非法日历日（2025-02-30）必须报错', () => {
    const broken = structuredClone(d)
    broken.trips[0].date = '2025-02-30'
    expect(validateTravelData(broken).some((i) => i.message.includes('date 非法'))).toBe(true)
  })
})

describe('selectLitCities', () => {
  const lit = selectLitCities(d)

  it('只有存在 visit 的城市被点亮', () => {
    const litIds = lit.map((c) => c.city.id).sort()
    expect(litIds).toEqual(['beijing', 'chengdu', 'hangzhou', 'shanghai'])
    expect(lit.some((c) => c.city.id === 'jiaxing')).toBe(false)
  })

  it('北京被到访两次，首末日期正确', () => {
    const bj = lit.find((c) => c.city.id === 'beijing')!
    expect(bj.visitCount).toBe(2)
    expect(bj.firstDate).toBe('2025-05-05')
    expect(bj.lastDate).toBe('2025-06-16')
    expect(bj.visitIds).toEqual(['v004', 'v005'])
  })

  it('按首次到访日期升序', () => {
    expect(lit.map((c) => c.firstDate)).toEqual([...lit.map((c) => c.firstDate)].sort())
  })
})

describe('buildTimelineNodes', () => {
  const nodes = buildTimelineNodes(d)

  it('节点数 = visits + trips = 10', () => {
    expect(nodes).toHaveLength(10)
  })

  it('按日期升序', () => {
    expect(nodes.map((n) => n.date)).toEqual([...nodes.map((n) => n.date)].sort())
  })

  it('首节点为 2025-05-01 北京→杭州（同日 visit 在 trip 之后）', () => {
    expect(nodes[0]).toMatchObject({ date: '2025-05-01', kind: 'trip', refId: 't001' })
    expect(nodes[1]).toMatchObject({ date: '2025-05-01', kind: 'visit', refId: 'v001' })
  })
})

describe('computeStats', () => {
  const s = computeStats(d)

  it('城市/省/段数统计', () => {
    expect(s.cityCount).toBe(4)
    expect(s.provinceCount).toBe(4) // 北京、浙江、上海、四川
    expect(s.flightCount).toBe(4)
    expect(s.trainCount).toBe(1)
    expect(s.firstDate).toBe('2025-05-01')
    expect(s.lastDate).toBe('2025-06-16')
  })

  it('里程：train 含 waypoint 分段，数字在合理范围', () => {
    // 杭州→嘉兴→上海（嘉兴近似在线路上）约 150–180 km
    const train = d.trips.find((t) => t.type === 'train')!
    expect(getTripCityIds(train)).toEqual(['hangzhou', 'jiaxing', 'shanghai'])
    const trainKm = tripDistance(train, cityMap)!
    expect(trainKm).toBeGreaterThan(150)
    expect(trainKm).toBeLessThan(180)
    // 北京→杭州 约 1100–1300 km
    const bjHz = haversineKm(cityMap.get('beijing')!, cityMap.get('hangzhou')!)
    expect(bjHz).toBeGreaterThan(1100)
    expect(bjHz).toBeLessThan(1300)
    // 总计 = 4 段飞行 + 1 段高铁
    expect(s.totalDistanceKm).toBeGreaterThan(5000)
  })
})

describe('关联查询', () => {
  it('getCityVisits 北京两次且按日期升序', () => {
    expect(getCityVisits(d, 'beijing').map((v) => v.id)).toEqual(['v004', 'v005'])
  })
  it('getCityTrips 嘉兴只命中 t002', () => {
    expect(getCityTrips(d, 'jiaxing').map((t) => t.id)).toEqual(['t002'])
  })
})

describe('geo', () => {
  it('haversine 对跖点约为 20015 km', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20015, 0)
  })

  it('大圆采样含 65 个点且跨 180° 经线不乱跳', () => {
    const pts = greatCirclePoints({ lat: 35, lng: 170 }, { lat: 40, lng: -170 }, 64)
    expect(pts).toHaveLength(65)
    expect(pts[0]).toEqual([35, 170])
    expect(pts[64]).toEqual([40, -170])
  })
})
