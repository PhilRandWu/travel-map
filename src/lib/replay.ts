import { findTrip, type TimelineNode } from '@/lib/derive'
import { resolveCities } from '@/lib/cities'
import { tripDistance } from '@/lib/geo'
import { vehicleDurationForDistance } from '@/lib/vehicle'
import { VEHICLE_ARRIVAL_TOTAL_MS } from '@/lib/vehicleMotion'
import type { TravelData } from '@/types'

export const REPLAY_SPEEDS = [0.5, 1, 2] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]
export type PlaybackStatus = 'idle' | 'playing' | 'paused'

const VISIT_DURATION_MS = 2200

export interface ReplayStep {
  node: TimelineNode
  startMs: number
  durationMs: number
}

export interface ReplayPlan {
  steps: ReplayStep[]
  totalMs: number
}

export interface ReplayPosition {
  index: number
  elapsedMs: number
}

export interface ReplayRuntime {
  status: PlaybackStatus
  activeIndex: number
  seekRevision: number
  plan: ReplayPlan
  getPosition: () => ReplayPosition
}

export interface ReplayTrackState {
  /** 当前节点是行程时，该行程由载具生长动画单独绘制 */
  currentTripId: string | null
  /** 当前节点之前已经完成的行程 */
  completedTripIds: ReadonlySet<string>
}

/**
 * 节点停留时长覆盖主体运动与到达收束，避免下一段在抵达前抢跑。
 */
export function replayNodeDurationMs(
  data: TravelData,
  node: TimelineNode,
): number {
  if (node.kind === 'visit') return VISIT_DURATION_MS
  const trip = findTrip(data, node.refId)
  if (!trip) return VISIT_DURATION_MS
  const distanceKm = tripDistance(trip, resolveCities(data)) ?? 0
  return vehicleDurationForDistance(trip.type, distanceKm)
    + VEHICLE_ARRIVAL_TOTAL_MS
}

export function buildReplayPlan(
  data: TravelData,
  nodes: TimelineNode[],
): ReplayPlan {
  let cursor = 0
  const steps = nodes.map((node) => {
    const durationMs = replayNodeDurationMs(data, node)
    const step = { node, startMs: cursor, durationMs }
    cursor += durationMs
    return step
  })
  return { steps, totalMs: cursor }
}

export function getReplayProgress(
  plan: ReplayPlan,
  index: number,
  elapsedMs: number,
): number {
  if (plan.totalMs <= 0 || index < 0 || index >= plan.steps.length) return 0
  const step = plan.steps[index]
  const time = step.startMs + Math.min(step.durationMs, Math.max(0, elapsedMs))
  return Math.min(1, time / plan.totalMs)
}

export function getReplayStepProgress(
  plan: ReplayPlan,
  index: number,
  elapsedMs: number,
): number {
  const step = plan.steps[index]
  if (!step || step.durationMs <= 0) return 0
  return Math.min(1, Math.max(0, elapsedMs / step.durationMs))
}

export function getReplayTrackState(
  plan: ReplayPlan,
  activeIndex: number,
): ReplayTrackState {
  const completedTripIds = new Set<string>()
  if (activeIndex < 0) return { currentTripId: null, completedTripIds }

  for (let index = 0; index < Math.min(activeIndex, plan.steps.length); index++) {
    const node = plan.steps[index].node
    if (node.kind === 'trip') completedTripIds.add(node.refId)
  }

  const activeNode = plan.steps[activeIndex]?.node
  return {
    currentTripId: activeNode?.kind === 'trip' ? activeNode.refId : null,
    completedTripIds,
  }
}

export function seekReplayPlan(
  plan: ReplayPlan,
  progress: number,
): ReplayPosition | null {
  if (plan.steps.length === 0) return null
  const time = Math.min(1, Math.max(0, progress)) * plan.totalMs
  const index = plan.steps.findIndex(
    (step) => time < step.startMs + step.durationMs,
  )
  if (index < 0) {
    const last = plan.steps.length - 1
    return { index: last, elapsedMs: plan.steps[last].durationMs }
  }
  return { index, elapsedMs: time - plan.steps[index].startMs }
}
