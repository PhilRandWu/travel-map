import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import type { Selection, TravelData } from '@/types'
import { buildTimelineNodes } from '@/lib/derive'
import {
  getFocusedCityId,
  getTimelineSelectionIndex,
  selectionMatchesTimelineNode,
} from '@/lib/selection'

const d = data as TravelData
const nodes = buildTimelineNodes(d)

describe('selection', () => {
  it('visit 选中时聚焦到访城市，行程选中时交给轨迹取景', () => {
    expect(getFocusedCityId(d, { kind: 'visit', visitId: 'v001' })).toBe('hangzhou')
    expect(getFocusedCityId(d, { kind: 'city', cityId: 'beijing' })).toBe('beijing')
    expect(getFocusedCityId(d, { kind: 'trip', tripId: 't001' })).toBeNull()
    expect(getFocusedCityId(d, { kind: 'none' })).toBeNull()
  })

  it('时间轴索引只匹配同类型、同 id 的节点', () => {
    const visit: Selection = { kind: 'visit', visitId: 'v001' }
    const trip: Selection = { kind: 'trip', tripId: 't001' }
    const city: Selection = { kind: 'city', cityId: 'hangzhou' }

    expect(nodes[getTimelineSelectionIndex(nodes, visit)]).toMatchObject({
      kind: 'visit',
      refId: 'v001',
    })
    expect(nodes[getTimelineSelectionIndex(nodes, trip)]).toMatchObject({
      kind: 'trip',
      refId: 't001',
    })
    expect(getTimelineSelectionIndex(nodes, city)).toBe(-1)
    expect(selectionMatchesTimelineNode(city, nodes[0])).toBe(false)
  })
})
