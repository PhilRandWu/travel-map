import type { VehicleMotionFrame } from '@/lib/vehicleMotion'
import {
  VEHICLE_ARRIVAL_HOLD_MS,
  VEHICLE_ARRIVAL_TOTAL_MS,
  vehicleMotionAt,
} from '@/lib/vehicleMotion'
import type { VehiclePlayback } from '@/lib/vehicle'

export type VehicleRuntimeStage =
  | 'moving'
  | 'holding'
  | 'returning'
  | 'complete'

export interface VehicleRuntimeFrame {
  key: number
  tripId: string
  label: string
  elapsedMs: number
  arrivalElapsedMs: number
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
  const motionElapsed = Math.min(duration, elapsedMs)
  const arrivalElapsedMs = Math.max(0, elapsedMs - duration)
  const stage: VehicleRuntimeStage = elapsedMs < duration
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
    arrivalElapsedMs,
    revision,
    stage,
    motion: vehicleMotionAt(playback.route, motionElapsed),
    playback,
  }
}
