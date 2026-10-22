import {
  sampleVehicleRoute,
  TRAIN_ALTITUDE,
  vehicleAltitudeAt,
  type VehiclePosition,
  type VehicleRoute,
} from '@/lib/vehicle'

export const VEHICLE_CHASE_ENTRY_MS = 450
export const VEHICLE_ARRIVAL_HOLD_MS = 1000
export const VEHICLE_ARRIVAL_RETURN_MS = 900
export const VEHICLE_ARRIVAL_TOTAL_MS =
  VEHICLE_ARRIVAL_HOLD_MS + VEHICLE_ARRIVAL_RETURN_MS

export type VehicleMotionPhase =
  | 'taxi'
  | 'takeoff'
  | 'cruise'
  | 'descent'
  | 'landing'
  | 'depart'
  | 'accelerate'
  | 'brake'
  | 'arrive'
  | 'arrived'

interface PhaseDefinition {
  phase: Exclude<VehicleMotionPhase, 'arrived'>
  durationMs: number
  startProgress: number
  endProgress: number
  easing: (value: number) => number
}

export interface VehicleMotionFrame {
  elapsedMs: number
  durationMs: number
  phase: VehicleMotionPhase
  phaseLabel: string
  phaseProgress: number
  progress: number
  altitude: number
  pitchDeg: number
  rollDeg: number
  position: VehiclePosition
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const linear = (value: number) => value
const easeInQuad = (value: number) => value * value
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3
const easeInOutCubic = (value: number) => (
  value < 0.5
    ? 4 * value ** 3
    : 1 - (-2 * value + 2) ** 3 / 2
)

function cruiseDuration(route: VehicleRoute): number {
  const fixed = route.type === 'flight' ? 4700 : 4500
  return Math.max(2300, route.durationMs - fixed)
}

function phasesFor(route: VehicleRoute): PhaseDefinition[] {
  if (route.type === 'flight') {
    return [
      { phase: 'taxi', durationMs: 900, startProgress: 0, endProgress: 0.08, easing: easeInQuad },
      { phase: 'takeoff', durationMs: 1400, startProgress: 0.08, endProgress: 0.24, easing: easeInOutCubic },
      { phase: 'cruise', durationMs: cruiseDuration(route), startProgress: 0.24, endProgress: 0.78, easing: linear },
      { phase: 'descent', durationMs: 1300, startProgress: 0.78, endProgress: 0.93, easing: easeInOutCubic },
      { phase: 'landing', durationMs: 1100, startProgress: 0.93, endProgress: 1, easing: easeOutCubic },
    ]
  }
  return [
    { phase: 'depart', durationMs: 900, startProgress: 0, endProgress: 0.08, easing: easeInQuad },
    { phase: 'accelerate', durationMs: 1400, startProgress: 0.08, endProgress: 0.24, easing: easeInOutCubic },
    { phase: 'cruise', durationMs: cruiseDuration(route), startProgress: 0.24, endProgress: 0.8, easing: linear },
    { phase: 'brake', durationMs: 1200, startProgress: 0.8, endProgress: 0.94, easing: easeInOutCubic },
    { phase: 'arrive', durationMs: 1000, startProgress: 0.94, endProgress: 1, easing: easeOutCubic },
  ]
}

const LABELS: Record<VehicleRoute['type'], Record<VehicleMotionPhase, string>> = {
  flight: {
    taxi: '滑跑',
    takeoff: '起飞',
    cruise: '巡航',
    descent: '下降',
    landing: '接地',
    arrive: '进站',
    depart: '发车',
    accelerate: '加速',
    brake: '制动',
    arrived: '抵达',
  },
  train: {
    depart: '发车',
    accelerate: '加速',
    cruise: '巡航',
    brake: '制动',
    arrive: '进站',
    arrived: '抵达',
    taxi: '滑跑',
    takeoff: '起飞',
    descent: '下降',
    landing: '接地',
  },
}

function headingAt(route: VehicleRoute, progress: number): number {
  const before = sampleVehicleRoute(route, Math.max(0, progress - 0.004))
  const after = sampleVehicleRoute(route, Math.min(1, progress + 0.004))
  const deltaLng = ((after.lng - before.lng + 540) % 360) - 180
  return Math.atan2(
    after.lat - before.lat,
    deltaLng * Math.cos(((before.lat + after.lat) / 2) * Math.PI / 180),
  )
}

function rollAt(route: VehicleRoute, progress: number): number {
  if (route.type !== 'flight' || progress <= 0 || progress >= 1) return 0
  const before = headingAt(route, Math.max(0, progress - 0.01))
  const after = headingAt(route, Math.min(1, progress + 0.01))
  const delta = ((after - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  return Math.max(-12, Math.min(12, delta * 18))
}

export function vehicleMotionAt(
  route: VehicleRoute,
  elapsedMs: number,
): VehicleMotionFrame {
  const elapsed = Math.max(0, Math.min(route.durationMs, elapsedMs))
  if (elapsed >= route.durationMs) {
    return {
      elapsedMs: elapsed,
      durationMs: route.durationMs,
      phase: 'arrived',
      phaseLabel: LABELS[route.type].arrived,
      phaseProgress: 1,
      progress: 1,
      altitude: route.type === 'train' ? TRAIN_ALTITUDE : 0,
      pitchDeg: 0,
      rollDeg: 0,
      position: sampleVehicleRoute(route, 1),
    }
  }

  let cursor = 0
  const phases = phasesFor(route)
  for (const definition of phases) {
    const end = cursor + definition.durationMs
    if (elapsed < end || definition === phases.at(-1)) {
      const phaseProgress = clamp01((elapsed - cursor) / definition.durationMs)
      const eased = definition.easing(phaseProgress)
      const progress = definition.startProgress
        + (definition.endProgress - definition.startProgress) * eased
      const altitude = route.type === 'train'
        ? TRAIN_ALTITUDE
        : vehicleAltitudeAt(route, progress)
      const pitchDeg = route.type === 'train'
        ? 0
        : definition.phase === 'takeoff'
          ? Math.sin(Math.PI * phaseProgress) * 10
          : definition.phase === 'descent'
            ? -Math.sin(Math.PI * phaseProgress) * 8
            : 0
      return {
        elapsedMs: elapsed,
        durationMs: route.durationMs,
        phase: definition.phase,
        phaseLabel: LABELS[route.type][definition.phase],
        phaseProgress,
        progress,
        altitude,
        pitchDeg,
        rollDeg: rollAt(route, progress),
        position: sampleVehicleRoute(route, progress),
      }
    }
    cursor = end
  }

  throw new Error('vehicle motion phase table must cover the full duration')
}
