import { useEffect, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { useMotion } from '@/components/motion/MotionProvider'
import type { SceneRoute } from '@/lib/journeyScene'
import { getRouteFlowWindow, getTrackBreathOpacity } from '@/lib/routeFlow'
import { createSceneLine } from '@/lib/sceneLine'

interface Props {
  routes: SceneRoute[]
  activeRouteId: string | null
  paused: boolean
  globeRef: RefObject<GlobeMethods | undefined>
}

const FLOW_INTERVAL_MS = 8000
const FLOW_DELAY_MS = 1800
const FLOW_DURATION_MS = 760

export default function RouteFlowOverlay({
  routes,
  activeRouteId,
  paused,
  globeRef,
}: Props) {
  const { effectiveLevel } = useMotion()
  const route = routes.find((item) => item.id === activeRouteId) ?? routes[0]
  const breathRoute = activeRouteId
    ? routes.find((item) => item.id === activeRouteId) ?? null
    : null

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !route || paused || effectiveLevel === 'calm') return
    const line = createSceneLine(globe, route, {
      color: route.type === 'flight' ? 0xe0f7ff : 0xffe6ad,
      opacity: 0.78,
    })
    let frame = 0
    let interval = 0
    let first = 0

    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / FLOW_DURATION_MS)
        const window = getRouteFlowWindow(route.points.length, progress, 0.18)
        line.setWindow(window.start, window.length)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    first = window.setTimeout(run, FLOW_DELAY_MS)
    interval = window.setInterval(run, FLOW_INTERVAL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
      cancelAnimationFrame(frame)
      line.dispose()
    }
  }, [effectiveLevel, globeRef, paused, route])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !breathRoute || paused || effectiveLevel === 'calm') return
    const line = createSceneLine(globe, breathRoute, {
      color: breathRoute.type === 'flight' ? 0xa5f3fc : 0xfbbf24,
      opacity: 0.55,
    })
    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      line.setOpacity(getTrackBreathOpacity(now - startedAt, effectiveLevel))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      line.dispose()
    }
  }, [breathRoute, effectiveLevel, globeRef, paused])

  return null
}
