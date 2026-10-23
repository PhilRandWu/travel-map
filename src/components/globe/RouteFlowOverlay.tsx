import { useEffect, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { useMotion } from '@/components/motion/MotionProvider'
import type { SceneRoute } from '@/lib/journeyScene'
import { getRouteFlowWindow, getTrackBreathOpacity } from '@/lib/routeFlow'
import { createSceneLine } from '@/lib/sceneLine'
import { useSceneClock } from '@/components/scene/SceneClockProvider'

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
  const clock = useSceneClock()
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
    const firstRunAt = performance.now() + FLOW_DELAY_MS
    const unsubscribe = clock.subscribe((now) => {
      if (now < firstRunAt) return
      const elapsed = (now - firstRunAt) % FLOW_INTERVAL_MS
      if (elapsed > FLOW_DURATION_MS) return
      const progress = elapsed / FLOW_DURATION_MS
      const window = getRouteFlowWindow(route.points.length, progress, 0.18)
      line.setWindow(window.start, window.length)
    }, -120)
    return () => {
      unsubscribe()
      line.dispose()
    }
  }, [clock, effectiveLevel, globeRef, paused, route])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !breathRoute || paused || effectiveLevel === 'calm') return
    const line = createSceneLine(globe, breathRoute, {
      color: breathRoute.type === 'flight' ? 0xa5f3fc : 0xfbbf24,
      opacity: 0.55,
    })
    const startedAt = performance.now()
    const unsubscribe = clock.subscribe((now) => {
      line.setOpacity(getTrackBreathOpacity(now - startedAt, effectiveLevel))
    }, -110)
    return () => {
      unsubscribe()
      line.dispose()
    }
  }, [breathRoute, clock, effectiveLevel, globeRef, paused])

  return null
}
