import type { City } from '@/types'
import { greatCirclePoints } from '@/lib/geo'

const DEG = Math.PI / 180

/** 不分方向的走廊键：A→B 与 B→A 共用同一车道计数。 */
export function corridorKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

/** 第 1 条使用中线，之后按右、左、右……递增偏移。 */
export function laneOffsetDegrees(
  duplicateIndex: number,
  spacing: number,
): number {
  if (duplicateIndex === 0 || spacing === 0) return 0
  const lane = Math.ceil(duplicateIndex / 2)
  return (duplicateIndex % 2 === 1 ? lane : -lane) * spacing
}

/** 大圆采样后侧移中间点，端点保持城市原坐标。 */
export function offsetSurfaceSegment(
  from: City,
  to: City,
  offsetDeg: number,
): [number, number][] {
  const points = greatCirclePoints(from, to, 32)
  if (offsetDeg === 0 || points.length <= 2) return points

  const dLat = to.lat - from.lat
  const dLng = (((to.lng - from.lng + 540) % 360) - 180)
  const length = Math.hypot(dLat, dLng)
  if (length === 0) return points

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point
    const distance = Math.sin(Math.PI * index / (points.length - 1))
      * offsetDeg
    const lat = point[0] + (-dLng / length) * distance
    const lngScale = Math.max(0.2, Math.cos(point[0] * DEG))
    const lng = point[1] + (dLat / length) * distance / lngScale
    return [
      Math.max(-89.999, Math.min(89.999, lat)),
      ((lng + 540) % 360) - 180,
    ]
  })
}

export function appendSegment(
  target: [number, number][],
  segment: [number, number][],
): void {
  target.push(...(target.length === 0 ? segment : segment.slice(1)))
}
