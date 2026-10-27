import type { TransportType } from '@/types'
import {
  getTransportMode,
  type TransportPhaseId,
} from '@/lib/transportModes'
import {
  sampleVehicleRoute,
  vehicleAltitudeAt,
  type VehiclePosition,
  type VehicleRoute,
} from '@/lib/vehicle'

export const VEHICLE_PRE_ROLL_MS = 650
export const VEHICLE_ARRIVAL_HOLD_MS = 1000
export const VEHICLE_ARRIVAL_RETURN_MS = 900
export const VEHICLE_ARRIVAL_TOTAL_MS =
  VEHICLE_ARRIVAL_HOLD_MS + VEHICLE_ARRIVAL_RETURN_MS

export function vehicleNodeDurationMs(motionDurationMs: number): number {
  return VEHICLE_PRE_ROLL_MS + motionDurationMs + VEHICLE_ARRIVAL_TOTAL_MS
}

export type VehicleMotionPhase =
  | TransportPhaseId
  | 'stopped'
  | 'arrived'

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

interface ScheduledPhase {
  phase: VehicleMotionPhase
  label: string
  startMs: number
  endMs: number
  startProgress: number
  endProgress: number
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function headingAt(route: VehicleRoute, progress: number): number {
  const before = sampleVehicleRoute(route, Math.max(0, progress - 0.004))
  const after = sampleVehicleRoute(route, Math.min(1, progress + 0.004))
  const deltaLng = ((after.lng - before.lng + 540) % 360) - 180
  return Math.atan2(
    after.lat - before.lat,
    deltaLng * Math.cos(((before.lat + after.lat) / 2) * Math.PI / 180),
  )
}

function rollAt(
  type: TransportType,
  route: VehicleRoute,
  progress: number,
  elapsedMs: number,
): number {
  const mode = getTransportMode(type)
  if (progress <= 0 || progress >= 1) return 0

  const before = headingAt(route, Math.max(0, progress - 0.01))
  const after = headingAt(route, Math.min(1, progress + 0.01))
  const turn = ((after - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  const bob = mode.motion.bobPeriodMs > 0
    ? Math.sin(elapsedMs / mode.motion.bobPeriodMs * Math.PI * 2) * 2
    : 0
  return Math.max(
    -mode.motion.maxRollDeg,
    Math.min(mode.motion.maxRollDeg, turn * mode.motion.rollScale + bob),
  )
}

export function buildVehicleMotionSchedule(
  route: VehicleRoute,
): ScheduledPhase[] {
  const mode = getTransportMode(route.type)
  const schedule: ScheduledPhase[] = []

  route.legs.forEach((leg, legIndex) => {
    let cursor = leg.startMs
    mode.motion.phases.forEach((phase, phaseIndex) => {
      const isLastPhase = phaseIndex === mode.motion.phases.length - 1
      const endMs = isLastPhase
        ? leg.endMs
        : cursor + phase.weight * leg.durationMs
      const progressSpan = leg.endProgress - leg.startProgress
      schedule.push({
        phase: phase.id,
        label: phase.label,
        startMs: cursor,
        endMs,
        startProgress: leg.startProgress
          + progressSpan * ((cursor - leg.startMs) / leg.durationMs),
        endProgress: isLastPhase
          ? leg.endProgress
          : leg.startProgress
            + progressSpan * ((endMs - leg.startMs) / leg.durationMs),
      })
      cursor = endMs
    })

    const nextLeg = route.legs[legIndex + 1]
    if (nextLeg) {
      schedule.push({
        phase: 'stopped',
        label: `${mode.motion.stopLabel} ${leg.toName}`,
        startMs: leg.endMs,
        endMs: nextLeg.startMs,
        startProgress: leg.endProgress,
        endProgress: leg.endProgress,
      })
    }
  })

  return schedule
}

export function vehicleMotionAt(
  route: VehicleRoute,
  elapsedMs: number,
): VehicleMotionFrame {
  const mode = getTransportMode(route.type)
  const elapsed = Math.max(0, Math.min(route.durationMs, elapsedMs))
  if (elapsed >= route.durationMs) {
    return {
      elapsedMs: elapsed,
      durationMs: route.durationMs,
      phase: 'arrived',
      phaseLabel: mode.motion.arrivalLabel,
      phaseProgress: 1,
      progress: 1,
      altitude: vehicleAltitudeAt(route, 1),
      pitchDeg: 0,
      rollDeg: 0,
      position: sampleVehicleRoute(route, 1),
    }
  }

  const schedule = buildVehicleMotionSchedule(route)
  const item = schedule.find((phase, index) => (
    elapsed < phase.endMs || index === schedule.length - 1
  ))
  if (!item) {
    throw new Error('vehicle route must contain at least one leg')
  }

  const phaseProgress = clamp01(
    (elapsed - item.startMs) / Math.max(1, item.endMs - item.startMs),
  )
  const progress = item.startProgress
    + (item.endProgress - item.startProgress) * phaseProgress
  const altitudeBase = vehicleAltitudeAt(route, progress)
  const bob = mode.motion.bobPeriodMs > 0
    ? Math.sin(elapsed / mode.motion.bobPeriodMs * Math.PI * 2)
      * mode.motion.bobAmplitude
    : 0
  const altitude = altitudeBase + bob
  const pitchDeg = route.type === 'flight'
    ? item.phase === 'accelerate'
      ? Math.sin(Math.PI * phaseProgress) * mode.motion.maxPitchDeg
      : item.phase === 'decelerate'
        ? -Math.sin(Math.PI * phaseProgress) * mode.motion.maxPitchDeg
        : 0
    : 0

  return {
    elapsedMs: elapsed,
    durationMs: route.durationMs,
    phase: item.phase,
    phaseLabel: item.label,
    phaseProgress,
    progress,
    altitude,
    pitchDeg,
    rollDeg: item.phase === 'stopped'
      ? 0
      : rollAt(route.type, route, progress, elapsed),
    position: {
      ...sampleVehicleRoute(route, progress),
      altitude,
    },
  }
}
