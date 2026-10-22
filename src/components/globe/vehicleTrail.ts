import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
} from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import {
  vehicleAltitudeAt,
  type VehicleRoute,
} from '@/lib/vehicle'

export interface VehicleTrail {
  update: (progress: number) => void
  dispose: () => void
}

interface GuideLine {
  line: Line
  geometry: BufferGeometry
  material: LineBasicMaterial
}

function createGuide(
  globe: GlobeMethods,
  route: VehicleRoute,
  fromIndex: number,
  toIndex: number,
  color: number,
  opacity: number,
): GuideLine {
  const points = route.points.slice(fromIndex, toIndex)
  const positions = new Float32Array(points.length * 3)
  points.forEach(([lat, lng], index) => {
    const routeIndex = fromIndex + index
    const progress = routeIndex / Math.max(1, route.points.length - 1)
    const point = globe.getCoords(
      lat,
      lng,
      vehicleAltitudeAt(route, progress),
    )
    positions[index * 3] = point.x
    positions[index * 3 + 1] = point.y
    positions[index * 3 + 2] = point.z
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })
  const line = new Line(geometry, material)
  line.renderOrder = 4
  line.frustumCulled = false
  globe.scene().add(line)
  return { line, geometry, material }
}

/** 在 globe 场景中绘制会随载具进度生长的轨迹线。 */
export function createVehicleTrail(
  globe: GlobeMethods,
  route: VehicleRoute,
): VehicleTrail {
  const positions = new Float32Array(route.points.length * 3)
  route.points.forEach(([lat, lng], index) => {
    const point = globe.getCoords(
      lat,
      lng,
      vehicleAltitudeAt(route, index / Math.max(1, route.points.length - 1)),
    )
    positions[index * 3] = point.x
    positions[index * 3 + 1] = point.y
    positions[index * 3 + 2] = point.z
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = route.type === 'flight'
    ? new LineDashedMaterial({
        color: 0xa5f3fc,
        dashSize: 1.8,
        gapSize: 1.1,
        opacity: 0.92,
        transparent: true,
      })
    : new LineBasicMaterial({
        color: 0xfbbf24,
        opacity: 0.88,
        transparent: true,
      })
  const line = new Line(geometry, material)
  line.renderOrder = 5
  line.frustumCulled = false
  if (route.type === 'flight') line.computeLineDistances()
  globe.scene().add(line)

  const guideCount = Math.max(2, Math.ceil(route.points.length * 0.08))
  const startGuide = createGuide(
    globe,
    route,
    0,
    guideCount,
    0xfbbf24,
    0.72,
  )
  const endGuide = createGuide(
    globe,
    route,
    Math.max(0, route.points.length - guideCount),
    route.points.length,
    0xa5f3fc,
    0.4,
  )

  return {
    update(progress: number) {
      const clamped = Math.min(1, Math.max(0, progress))
      const count = clamped <= 0
        ? 0
        : Math.ceil(clamped * (route.points.length - 1)) + 1
      geometry.setDrawRange(0, count)
      startGuide.material.opacity = route.type === 'flight'
        ? Math.max(0.08, 0.72 * (1 - Math.min(1, clamped / 0.24)))
        : 0.58
      endGuide.material.opacity = Math.min(
        0.7,
        Math.max(0.12, clamped * 1.2),
      )
    },
    dispose() {
      globe.scene().remove(line)
      globe.scene().remove(startGuide.line)
      globe.scene().remove(endGuide.line)
      geometry.dispose()
      material.dispose()
      startGuide.geometry.dispose()
      startGuide.material.dispose()
      endGuide.geometry.dispose()
      endGuide.material.dispose()
    },
  }
}
