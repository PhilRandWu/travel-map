import { useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { SceneRoute } from '@/lib/journeyScene'
import { createSceneLine, type SceneLine } from '@/lib/sceneLine'

interface Props {
  routes: SceneRoute[]
  progress: number
  globeRef: RefObject<GlobeMethods | undefined>
}

export default function SceneRouteOverlay({
  routes,
  progress,
  globeRef,
}: Props) {
  const linesRef = useRef<SceneLine[]>([])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const lines = routes.map((route) => createSceneLine(globe, route, {
      color: route.type === 'flight' ? 0xa5f3fc : 0xfbbf24,
      dashed: route.type === 'flight',
      opacity: 0.92,
    }))
    linesRef.current = lines
    return () => {
      lines.forEach((line) => line.dispose())
      linesRef.current = []
    }
  }, [globeRef, routes])

  useEffect(() => {
    linesRef.current.forEach((line) => line.setProgress(progress))
  }, [progress])

  return null
}
