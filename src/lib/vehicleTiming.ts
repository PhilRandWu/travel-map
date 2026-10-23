export const FLIGHT_PHASE_MS = {
  taxi: 900,
  takeoff: 1400,
  descent: 1300,
  landing: 1100,
} as const

export const TRAIN_PHASE_MS = {
  depart: 900,
  accelerate: 1400,
  brake: 1200,
  arrive: 1000,
} as const

export const FLIGHT_FIXED_MS = FLIGHT_PHASE_MS.taxi
  + FLIGHT_PHASE_MS.takeoff
  + FLIGHT_PHASE_MS.descent
  + FLIGHT_PHASE_MS.landing

export const TRAIN_FIXED_MS = TRAIN_PHASE_MS.depart
  + TRAIN_PHASE_MS.accelerate
  + TRAIN_PHASE_MS.brake
  + TRAIN_PHASE_MS.arrive

export const FLIGHT_CRUISE_MIN_MS = 2300
export const TRAIN_CRUISE_MIN_MS = 2500

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function smoothstep(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function vehicleAltitudeProfile(
  type: 'flight' | 'train',
  cruiseAltitude: number,
  durationMs: number,
  progress: number,
): number {
  if (type === 'train' || durationMs <= 0) return cruiseAltitude

  const taxiEnd = FLIGHT_PHASE_MS.taxi / durationMs
  const takeoffEnd = (FLIGHT_PHASE_MS.taxi + FLIGHT_PHASE_MS.takeoff)
    / durationMs
  const landingStart = (durationMs - FLIGHT_PHASE_MS.landing) / durationMs
  const descentStart = (
    durationMs - FLIGHT_PHASE_MS.descent - FLIGHT_PHASE_MS.landing
  ) / durationMs
  const t = clamp01(progress)

  if (t <= taxiEnd || t >= landingStart) return 0
  if (t < takeoffEnd) {
    return smoothstep((t - taxiEnd) / (takeoffEnd - taxiEnd))
      * cruiseAltitude
  }
  if (t <= descentStart) return cruiseAltitude
  return (
    1 - smoothstep((t - descentStart) / (landingStart - descentStart))
  ) * cruiseAltitude
}
