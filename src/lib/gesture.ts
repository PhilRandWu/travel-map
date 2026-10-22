export type SwipeDirection = 'next' | 'previous'

export function getSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): SwipeDirection | null {
  const dx = endX - startX
  const dy = endY - startY
  if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) return null
  return dx < 0 ? 'next' : 'previous'
}

export function clampZoom(value: number): number {
  return Math.min(3, Math.max(1, value))
}
