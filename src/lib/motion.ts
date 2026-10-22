export type MotionLevel = 'calm' | 'cinematic' | 'immersive'

export const MOTION_LEVELS: MotionLevel[] = ['calm', 'cinematic', 'immersive']
export const MOTION_STORAGE_KEY = 'travel-map.motion-level'

export const MOTION_MS = {
  feedback: 160,
  panel: 280,
  photo: 700,
  chapter: 900,
  lightGate: 900,
  routeGrow: 900,
  camera: 800,
  return: 360,
  ambient: 15_000,
} as const

export function normalizeMotionLevel(value: unknown): MotionLevel {
  return MOTION_LEVELS.includes(value as MotionLevel)
    ? value as MotionLevel
    : 'cinematic'
}

export function resolveMotionLevel(
  userLevel: MotionLevel,
  touchDevice: boolean,
  reducedMotion: boolean,
  performanceCap: MotionLevel = 'immersive',
): MotionLevel {
  if (reducedMotion) return 'calm'
  const userIndex = MOTION_LEVELS.indexOf(userLevel)
  const capIndex = MOTION_LEVELS.indexOf(performanceCap)
  const effective = MOTION_LEVELS[Math.min(userIndex, capIndex)]
  return touchDevice && effective === 'immersive' ? 'cinematic' : effective
}

export function downgradeMotionLevel(level: MotionLevel): MotionLevel {
  if (level === 'immersive') return 'cinematic'
  return 'calm'
}
