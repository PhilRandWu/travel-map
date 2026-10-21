import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildTimelineNodes } from '@/lib/derive'
import { buildTimelineItems } from '@/components/timeline/items'

const d = data as TravelData

describe('buildTimelineItems', () => {
  const items = buildTimelineItems(d, buildTimelineNodes(d))

  it('生成与时间轴节点一致的展示项', () => {
    expect(items).toHaveLength(10)
    expect(items[0]).toMatchObject({
      date: '2025-05-01',
      headline: '北京 → 杭州',
      detail: 'CA1234',
      meta: '05.01',
      icon: 'flight',
    })
    expect(items[1]).toMatchObject({
      date: '2025-05-01',
      headline: '杭州',
      detail: '五一西湖行',
      icon: 'visit',
    })
    expect(items[1].thumbnailUrl).toContain('/thumbs/v001/01.svg.webp')
  })

  it('高铁节点包含经停路线', () => {
    const train = items.find((item) => item.detail === 'G7558')
    expect(train).toMatchObject({
      headline: '杭州 → 嘉兴 → 上海',
      icon: 'train',
    })
  })
})
