import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import { buildTimelineNodes } from '@/lib/derive'
import {
  buildReplayPlan,
  getReplayProgress,
  seekReplayPlan,
} from '@/lib/replay'
import type { TravelData } from '@/types'

const travelData = data as TravelData
const nodes = buildTimelineNodes(travelData)
const plan = buildReplayPlan(travelData, nodes)

describe('buildReplayPlan', () => {
  it('按节点类型分配停留时长并累计起点', () => {
    expect(plan.steps[0]).toMatchObject({ startMs: 0, durationMs: 3400 })
    expect(plan.steps[1]).toMatchObject({ startMs: 3400, durationMs: 2200 })
    expect(plan.steps[2]).toMatchObject({ startMs: 5600, durationMs: 4300 })
    expect(plan.totalMs).toBe(plan.steps.reduce(
      (sum, step) => sum + step.durationMs,
      0,
    ))
  })
})

describe('replay seeking', () => {
  it('起终点和中间进度映射到正确节点', () => {
    expect(seekReplayPlan(plan, 0)).toEqual({ index: 0, elapsedMs: 0 })
    expect(seekReplayPlan(plan, 1)).toEqual({
      index: plan.steps.length - 1,
      elapsedMs: plan.steps.at(-1)!.durationMs,
    })

    const middle = seekReplayPlan(plan, 0.5)!
    expect(middle.index).toBeGreaterThan(0)
    expect(middle.index).toBeLessThan(plan.steps.length)
  })

  it('节点内进度可换算回全局进度', () => {
    const position = seekReplayPlan(plan, 0.42)!
    expect(getReplayProgress(plan, position.index, position.elapsedMs))
      .toBeCloseTo(0.42, 8)
  })
})
