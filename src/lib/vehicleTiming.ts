import type { TransportType } from '@/types'
import { getTransportMode } from '@/lib/transportModes'

export const VEHICLE_STOP_HOLD_MS = 700

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export function smoothstep(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function vehicleDurationForDistance(
  type: TransportType,
  distanceKm: number,
): number {
  const motion = getTransportMode(type).motion
  const ratio = clamp01(
    (Math.max(0, distanceKm) - motion.distanceStartKm)
      / Math.max(1, motion.distanceRangeKm),
  )
  return Math.round(
    motion.minDurationMs
      + ratio * (motion.maxDurationMs - motion.minDurationMs),
  )
}

/** 飞机每段重新完成起飞/巡航/降落高度包络，地面方式保持贴地。 */
export function legAltitudeEnvelope(
  type: TransportType,
  localProgress: number,
  cruiseAltitude: number,
): number {
  const mode = getTransportMode(type)
  if (mode.route.shape !== 'arc') return cruiseAltitude

  const phases = mode.motion.phases
  const climbEnd = phases[0].weight + phases[1].weight
  const descentStart = 1 - phases[4].weight - phases[3].weight
  const t = clamp01(localProgress)
  if (t <= 0 || t >= 1) return 0
  if (t < climbEnd) return smoothstep(t / climbEnd) * cruiseAltitude
  if (t <= descentStart) return cruiseAltitude
  return (1 - smoothstep((t - descentStart) / (1 - descentStart)))
    * cruiseAltitude
}
