import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
} from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import type { SceneRoute } from '@/lib/journeyScene'

export interface SceneLine {
  setProgress: (progress: number) => void
  setWindow: (start: number, length: number) => void
  setOpacity: (opacity: number) => void
  dispose: () => void
}

interface SceneLineStyle {
  color: number
  dashed?: boolean
  opacity?: number
}

export function createSceneLine(
  globe: GlobeMethods,
  route: SceneRoute,
  style: SceneLineStyle,
): SceneLine {
  const positions = new Float32Array(route.points.length * 3)
  route.points.forEach((point, index) => {
    const vector = globe.getCoords(point.lat, point.lng, point.altitude)
    positions[index * 3] = vector.x
    positions[index * 3 + 1] = vector.y
    positions[index * 3 + 2] = vector.z
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = style.dashed
    ? new LineDashedMaterial({
        color: style.color,
        dashSize: 1.8,
        gapSize: 1.2,
        transparent: true,
        opacity: style.opacity ?? 0.9,
      })
    : new LineBasicMaterial({
        color: style.color,
        transparent: true,
        opacity: style.opacity ?? 0.9,
      })
  const line = new Line(geometry, material)
  line.frustumCulled = false
  line.renderOrder = 6
  if (style.dashed) line.computeLineDistances()
  globe.scene().add(line)

  return {
    setProgress(progress) {
      const count = progress <= 0
        ? 0
        : Math.ceil(Math.min(1, Math.max(0, progress)) * route.points.length)
      geometry.setDrawRange(0, count)
    },
    setWindow(start, length) {
      const normalizedStart = Math.max(
        0,
        Math.min(route.points.length, Math.floor(start)),
      )
      const count = Math.max(
        0,
        Math.min(route.points.length - normalizedStart, Math.ceil(length)),
      )
      geometry.setDrawRange(normalizedStart, count)
    },
    setOpacity(opacity) {
      material.opacity = Math.max(0, Math.min(1, opacity))
    },
    dispose() {
      globe.scene().remove(line)
      geometry.dispose()
      material.dispose()
    },
  }
}
