import type { VehicleMotionFrame } from '@/lib/vehicleMotion'
import {
  VEHICLE_ARRIVAL_HOLD_MS,
  VEHICLE_ARRIVAL_TOTAL_MS,
  VEHICLE_PRE_ROLL_MS,
  vehicleMotionAt,
} from '@/lib/vehicleMotion'
import type { VehiclePlayback } from '@/lib/vehicle'

export type VehicleRuntimeStage =
  | 'preparing'
  | 'moving'
  | 'holding'
  | 'returning'
  | 'complete'

export interface VehicleRuntimeFrame {
  key: number
  tripId: string
  label: string
  elapsedMs: number
  motionElapsedMs: number
  arrivalElapsedMs: number
  entryProgress: number
  revision: number
  stage: VehicleRuntimeStage
  motion: VehicleMotionFrame
  playback: VehiclePlayback
}

export function buildVehicleRuntimeFrame(
  playback: VehiclePlayback,
  nodeElapsedMs: number,
  revision: number,
): VehicleRuntimeFrame {
  const duration = playback.route.durationMs
  const elapsedMs = Math.max(0, nodeElapsedMs)
  const motionElapsed = Math.min(
    duration,
    Math.max(0, elapsedMs - VEHICLE_PRE_ROLL_MS),
  )
  const arrivalElapsedMs = Math.max(
    0,
    elapsedMs - VEHICLE_PRE_ROLL_MS - duration,
  )
  const stage: VehicleRuntimeStage =
    elapsedMs < VEHICLE_PRE_ROLL_MS
      ? 'preparing'
      : elapsedMs < VEHICLE_PRE_ROLL_MS + duration
        ? 'moving'
        : arrivalElapsedMs < VEHICLE_ARRIVAL_HOLD_MS
          ? 'holding'
          : arrivalElapsedMs < VEHICLE_ARRIVAL_TOTAL_MS
            ? 'returning'
            : 'complete'

  return {
    key: playback.key,
    tripId: playback.tripId,
    label: playback.label,
    elapsedMs,
    motionElapsedMs: motionElapsed,
    arrivalElapsedMs,
    entryProgress: Math.max(
      0,
      Math.min(1, elapsedMs / VEHICLE_PRE_ROLL_MS),
    ),
    revision,
    stage,
    motion: vehicleMotionAt(playback.route, motionElapsed),
    playback,
  }
}
