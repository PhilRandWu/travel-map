import { describe, expect, it } from 'vitest'
import data from '@/data/trips.json'
import { buildTimelineNodes } from '@/lib/derive'
import {
  buildReplayPlan,
  getReplayStepProgress,
  getReplayTrackState,
  getReplayProgress,
  seekReplayPlan,
} from '@/lib/replay'
import type { TravelData } from '@/types'

const travelData = data as TravelData
const nodes = buildTimelineNodes(travelData)
const plan = buildReplayPlan(travelData, nodes)

describe('buildReplayPlan', () => {
  it('按节点类型分配停留时长并累计起点', () => {
    expect(plan.steps[0]).toMatchObject({ startMs: 0 })
    expect(plan.steps[0].durationMs).toBeGreaterThanOrEqual(9550)
    expect(plan.steps[0].durationMs).toBeLessThanOrEqual(11_550)
    expect(plan.steps[1]).toMatchObject({
      startMs: plan.steps[0].durationMs,
      durationMs: 2200,
    })
    expect(plan.steps[2]).toMatchObject({
      startMs: plan.steps[0].durationMs + plan.steps[1].durationMs,
    })
    expect(plan.steps[2].durationMs).toBeGreaterThanOrEqual(9550)
    expect(plan.steps[2].durationMs).toBeLessThanOrEqual(11_550)
    expect(plan.totalMs).toBe(plan.steps.reduce(
      (sum, step) => sum + step.durationMs,
      0,
    ))
  })
})

describe('replayNodeDurationMs', () => {
  it('vehicle steps include pre-roll, motion and arrival settlement', () => {
    const tripStep = plan.steps.find((step) => step.node.kind === 'trip')!
    expect(tripStep.durationMs).toBeGreaterThanOrEqual(9550)
    expect(tripStep.durationMs).toBeLessThanOrEqual(11_550)
  })

  it('visit steps keep the existing hold duration', () => {
    const visitStep = plan.steps.find((step) => step.node.kind === 'visit')!
    expect(visitStep.durationMs).toBe(2200)
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

describe('replay track visibility', () => {
  it('当前行程只展示此前已完成行程，当前轨迹交给生长动画', () => {
    const secondTripIndex = plan.steps.findIndex(
      (step, index) => index > 0 && step.node.kind === 'trip',
    )
    const state = getReplayTrackState(plan, secondTripIndex)
    const currentTripId = plan.steps[secondTripIndex].node.refId
    const completedTrips = plan.steps
      .slice(0, secondTripIndex)
      .filter((step) => step.node.kind === 'trip')

    expect(state.currentTripId).toBe(currentTripId)
    expect(state.completedTripIds).toEqual(
      new Set(completedTrips.map((step) => step.node.refId)),
    )
    expect(state.completedTripIds.has(currentTripId)).toBe(false)
    expect(
      plan.steps.slice(secondTripIndex + 1)
        .some((step) => state.completedTripIds.has(step.node.refId)),
    ).toBe(false)
  })

  it('停在到访节点时，此前行程全部保留', () => {
    const visitIndex = plan.steps.findIndex((step) => step.node.kind === 'visit')
    const state = getReplayTrackState(plan, visitIndex)
    const completedTrips = plan.steps
      .slice(0, visitIndex)
      .filter((step) => step.node.kind === 'trip')

    expect(state.currentTripId).toBeNull()
    expect(state.completedTripIds).toEqual(
      new Set(completedTrips.map((step) => step.node.refId)),
    )
  })
})

describe('replay step progress', () => {
  it('把节点内耗时换算为 0–1 进度', () => {
    const step = plan.steps[0]
    expect(getReplayStepProgress(plan, 0, 0)).toBe(0)
    expect(getReplayStepProgress(plan, 0, step.durationMs / 2)).toBeCloseTo(0.5)
    expect(getReplayStepProgress(plan, 0, step.durationMs * 2)).toBe(1)
  })
})
