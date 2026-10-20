import { describe, expect, it } from 'vitest'
import type { TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'

const base: TravelData = {
  meta: { owner: 't', homeCity: 'beijing', version: 1 },
  cities: [
    { id: 'beijing', name: '北京', lat: 39.9042, lng: 116.4074, province: '北京', country: '中国' },
    { id: 'shanghai', name: '上海', lat: 31.2304, lng: 121.4737, province: '上海', country: '中国' },
    { id: 'jiaxing', name: '嘉兴', lat: 30.7522, lng: 120.7555, province: '浙江', country: '中国' },
  ],
  trips: [],
  visits: [],
}

const withTrips = (trips: TravelData['trips']): TravelData => ({ ...base, trips })

describe('buildTracks', () => {
  it('航班生成大圆弧：起终点正确，含 tooltip 文案', () => {
    const { flights, trains } = buildTracks(
      withTrips([
        { id: 't1', date: '2025-05-01', type: 'flight', from: 'beijing', to: 'shanghai', waypoints: [], note: 'CA1' },
      ]),
    )
    expect(trains).toHaveLength(0)
    expect(flights).toHaveLength(1)
    const a = flights[0]
    expect(a.startLat).toBeCloseTo(39.9042)
    expect(a.endLng).toBeCloseTo(121.4737)
    expect(a.altitude).toBeGreaterThan(0)
    expect(a.label).toBe('2025-05-01 · 北京 → 上海 · CA1')
  })

  it('高铁折线经过所有 waypoint，且为贴地点串', () => {
    const { trains } = buildTracks(
      withTrips([
        { id: 't2', date: '2025-05-03', type: 'train', from: 'beijing', to: 'shanghai', waypoints: ['jiaxing'], note: 'G1' },
      ]),
    )
    expect(trains).toHaveLength(1)
    const pts = trains[0].points
    expect(pts[0]).toEqual([39.9042, 116.4074])
    expect(pts[pts.length - 1]).toEqual([31.2304, 121.4737])
    // 必须真的经过嘉兴（两段拼接：首段终点 = 次段起点 = 嘉兴）
    const jx: [number, number] = [30.7522, 120.7555]
    expect(pts).toContainEqual(jx)
    // 拼接处无重复点
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i]).not.toEqual(pts[i - 1])
    }
  })

  it('同走廊多条航班弧顶逐次抬高（往返也算同走廊）', () => {
    const { flights } = buildTracks(
      withTrips([
        { id: 't1', date: '2025-05-01', type: 'flight', from: 'beijing', to: 'shanghai', waypoints: [] },
        { id: 't2', date: '2025-05-05', type: 'flight', from: 'shanghai', to: 'beijing', waypoints: [] },
        { id: 't3', date: '2025-06-01', type: 'flight', from: 'beijing', to: 'shanghai', waypoints: [] },
      ]),
    )
    expect(flights).toHaveLength(3)
    expect(flights[1].altitude).toBeCloseTo(flights[0].altitude * 1.18)
    expect(flights[2].altitude).toBeCloseTo(flights[0].altitude * 1.36)
  })

  it('引用缺失城市的行程被跳过', () => {
    const { flights, trains } = buildTracks(
      withTrips([
        { id: 't1', date: '2025-05-01', type: 'flight', from: 'beijing', to: 'nowhere', waypoints: [] },
        { id: 't2', date: '2025-05-03', type: 'train', from: 'beijing', to: 'shanghai', waypoints: ['nowhere'] },
      ]),
    )
    expect(flights).toHaveLength(0)
    expect(trains).toHaveLength(0)
  })
})
