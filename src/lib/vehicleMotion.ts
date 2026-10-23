import {
  sampleVehicleRoute,
  TRAIN_ALTITUDE,
  vehicleAltitudeAt,
  type VehiclePosition,
  type VehicleRoute,
} from '@/lib/vehicle'
import {
  FLIGHT_CRUISE_MIN_MS,
  FLIGHT_FIXED_MS,
  FLIGHT_PHASE_MS,
  TRAIN_CRUISE_MIN_MS,
  TRAIN_FIXED_MS,
  TRAIN_PHASE_MS,
} from '@/lib/vehicleTiming'

export const VEHICLE_PRE_ROLL_MS = 650
export const VEHICLE_ARRIVAL_HOLD_MS = 1000
export const VEHICLE_ARRIVAL_RETURN_MS = 900
export const VEHICLE_ARRIVAL_TOTAL_MS =
  VEHICLE_ARRIVAL_HOLD_MS + VEHICLE_ARRIVAL_RETURN_MS

export function vehicleNodeDurationMs(motionDurationMs: number): number {
  return VEHICLE_PRE_ROLL_MS + motionDurationMs + VEHICLE_ARRIVAL_TOTAL_MS
}

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

function cruiseDuration(route: VehicleRoute): number {
  const flight = route.type === 'flight'
  const cruiseFloor = flight ? FLIGHT_CRUISE_MIN_MS : TRAIN_CRUISE_MIN_MS
  const fixed = flight ? FLIGHT_FIXED_MS : TRAIN_FIXED_MS
  return Math.max(cruiseFloor, route.durationMs - fixed)
}

function phasesFor(route: VehicleRoute): PhaseDefinition[] {
  if (route.type === 'flight') {
    return [
      { phase: 'taxi', durationMs: FLIGHT_PHASE_MS.taxi },
      { phase: 'takeoff', durationMs: FLIGHT_PHASE_MS.takeoff },
      { phase: 'cruise', durationMs: cruiseDuration(route) },
      { phase: 'descent', durationMs: FLIGHT_PHASE_MS.descent },
      { phase: 'landing', durationMs: FLIGHT_PHASE_MS.landing },
    ]
  }
  return [
    { phase: 'depart', durationMs: TRAIN_PHASE_MS.depart },
    { phase: 'accelerate', durationMs: TRAIN_PHASE_MS.accelerate },
    { phase: 'cruise', durationMs: cruiseDuration(route) },
    { phase: 'brake', durationMs: TRAIN_PHASE_MS.brake },
    { phase: 'arrive', durationMs: TRAIN_PHASE_MS.arrive },
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
      const progress = clamp01(elapsed / route.durationMs)
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
