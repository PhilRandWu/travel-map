export function getRouteFlowWindow(
  pointCount: number,
  progress: number,
  ratio: number,
): { start: number; length: number } {
  if (pointCount <= 0 || progress >= 1) {
    return { start: Math.max(0, pointCount), length: 0 }
  }
  const length = Math.max(1, Math.ceil(pointCount * ratio))
  const maxStart = Math.max(0, pointCount - length)
  const centered = Math.floor(
    Math.max(0, progress) * pointCount - length / 2,
  )
  return {
    start: Math.min(maxStart, Math.max(0, centered)),
    length,
  }
}

export function getTrackBreathOpacity(
  elapsedMs: number,
  level: 'calm' | 'cinematic' | 'immersive' = 'cinematic',
): number {
  if (level === 'calm') return 0.55
  const phase = (Math.max(0, elapsedMs) % 4200) / 4200
  const pulse = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2
  return 0.55 + pulse * 0.22
}
