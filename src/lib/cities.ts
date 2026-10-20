import type { City, TravelData } from '@/types'

/**
 * 内置常用中国城市坐标表（独立于 trips.json，可持续扩充）。
 * PRD 3.1：用户只填城市名/ id，坐标来自本表；
 * trips.json 的 cities 以 id 关联，坐标缺失时回退查本表，
 * 也是 P2 表单编辑器城市名自动补全的数据源。
 */
export const BUILTIN_CITIES: City[] = [
  { id: 'beijing', name: '北京', lat: 39.9042, lng: 116.4074, province: '北京', country: '中国' },
  { id: 'shanghai', name: '上海', lat: 31.2304, lng: 121.4737, province: '上海', country: '中国' },
  { id: 'hangzhou', name: '杭州', lat: 30.2741, lng: 120.1551, province: '浙江', country: '中国' },
  { id: 'jiaxing', name: '嘉兴', lat: 30.7522, lng: 120.7555, province: '浙江', country: '中国' },
  { id: 'chengdu', name: '成都', lat: 30.5728, lng: 104.0668, province: '四川', country: '中国' },
  { id: 'suzhou', name: '苏州', lat: 31.2989, lng: 120.5853, province: '江苏', country: '中国' },
  { id: 'guangzhou', name: '广州', lat: 23.1291, lng: 113.2644, province: '广东', country: '中国' },
  { id: 'shenzhen', name: '深圳', lat: 22.5431, lng: 114.0579, province: '广东', country: '中国' },
  { id: 'xian', name: '西安', lat: 34.3416, lng: 108.9398, province: '陕西', country: '中国' },
  { id: 'chongqing', name: '重庆', lat: 29.563, lng: 106.5516, province: '重庆', country: '中国' },
]

const builtinMap = new Map(BUILTIN_CITIES.map((c) => [c.id, c]))

export function findBuiltinCity(id: string): City | undefined {
  return builtinMap.get(id)
}

/**
 * 解析城市：优先 trips.json 自带的 cities，回退内置坐标表。
 * 渲染层/推导层统一走这里，不直接读 data.cities。
 */
export function resolveCity(data: TravelData, id: string): City | undefined {
  return data.cities.find((c) => c.id === id) ?? builtinMap.get(id)
}

export function resolveCities(data: TravelData): Map<string, City> {
  const map = new Map<string, City>()
  for (const c of BUILTIN_CITIES) map.set(c.id, c)
  // JSON 中的城市覆盖内置表（用户可更正坐标/行政区划）
  for (const c of data.cities) map.set(c.id, c)
  return map
}
