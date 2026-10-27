import { useEffect, useRef } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { VehicleRoute } from '@/lib/vehicle'
import { sampleVehicleRoute } from '@/lib/vehicle'
import { screenPoint } from '@/components/globe/vehicleScreen'
import { getTransportMode } from '@/lib/transportModes'

const EFFECT_INTERVAL_MS = 1000 / 30

export function useVehicleMotionEffects(playbackKey?: number) {
  const trailRef = useRef<HTMLDivElement>(null)
  const frictionRef = useRef<HTMLDivElement>(null)
  const arrivalRef = useRef<HTMLDivElement>(null)
  const stopRippleRef = useRef<HTMLDivElement>(null)
  const arrivalPlayedRef = useRef(false)
  const stopRippledRef = useRef<string | null>(null)
  const arrivalTimerRef = useRef<number | null>(null)
  const stopRippleTimerRef = useRef<number | null>(null)
  const lastEffectAtRef = useRef(-Infinity)

  useEffect(() => {
    if (arrivalTimerRef.current !== null) {
      window.clearTimeout(arrivalTimerRef.current)
      arrivalTimerRef.current = null
    }
    if (stopRippleTimerRef.current !== null) {
      window.clearTimeout(stopRippleTimerRef.current)
      stopRippleTimerRef.current = null
    }
    arrivalPlayedRef.current = false
    stopRippledRef.current = null
    lastEffectAtRef.current = -Infinity
    arrivalRef.current?.classList.remove('rg-vehicle-arrival-active')
    stopRippleRef.current?.classList.remove('rg-waypoint-ripple-active')
    trailRef.current?.querySelectorAll<HTMLElement>('[data-vehicle-trail-dot]')
      .forEach((dot) => { dot.style.opacity = '0' })
    frictionRef.current?.querySelectorAll<HTMLElement>('[data-vehicle-friction-dot]')
      .forEach((dot) => { dot.style.opacity = '0' })
  }, [playbackKey])

  useEffect(() => () => {
    if (arrivalTimerRef.current !== null) {
      window.clearTimeout(arrivalTimerRef.current)
    }
    if (stopRippleTimerRef.current !== null) {
      window.clearTimeout(stopRippleTimerRef.current)
    }
  }, [])

  const markArrival = (globe: GlobeMethods, route: VehicleRoute) => {
    if (arrivalPlayedRef.current) return
    arrivalPlayedRef.current = true
    const destination = screenPoint(globe, sampleVehicleRoute(route, 1))
    const host = arrivalRef.current
    if (!host) return
    host.style.transform =
      `translate3d(${destination.x}px, ${destination.y}px, 0)`
    host.classList.add('rg-vehicle-arrival-active')
    arrivalTimerRef.current = window.setTimeout(() => {
      host.classList.remove('rg-vehicle-arrival-active')
    }, 950)
  }

  const markStop = (
    globe: GlobeMethods,
    route: VehicleRoute,
    progress: number,
    stopKey: string,
  ) => {
    if (stopRippledRef.current === stopKey) return
    stopRippledRef.current = stopKey
    const host = stopRippleRef.current
    if (!host) return
    const point = screenPoint(globe, sampleVehicleRoute(route, progress))
    host.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
    host.style.setProperty(
      '--rg-stop-color',
      getTransportMode(route.type).route.colorHex,
    )
    host.classList.remove('rg-waypoint-ripple-active')
    void host.offsetWidth
    host.classList.add('rg-waypoint-ripple-active')
    if (stopRippleTimerRef.current !== null) {
      window.clearTimeout(stopRippleTimerRef.current)
    }
    stopRippleTimerRef.current = window.setTimeout(() => {
      host.classList.remove('rg-waypoint-ripple-active')
    }, 760)
  }

  const update = (
    globe: GlobeMethods,
    route: VehicleRoute,
    easedProgress: number,
    rawProgress: number,
    visible: boolean,
    calm: boolean,
  ) => {
    const now = performance.now()
    if (
      !calm
      && visible
      && now - lastEffectAtRef.current < EFFECT_INTERVAL_MS
    ) {
      return
    }
    lastEffectAtRef.current = now
    const mode = getTransportMode(route.type)

    const trailDots = trailRef.current?.querySelectorAll<HTMLElement>(
      '[data-vehicle-trail-dot]',
    ) ?? []
    trailDots.forEach((dot, index) => {
      if (calm || !visible) {
        dot.style.opacity = '0'
        return
      }
      const trailProgress = Math.max(0, easedProgress - index * 0.008)
      const trailScreen = screenPoint(
        globe,
        sampleVehicleRoute(route, trailProgress),
      )
      dot.style.transform =
        `translate3d(${trailScreen.x}px, ${trailScreen.y}px, 0)`
      dot.style.opacity = String((1 - index / trailDots.length) * 0.65)
    })

    const surfaceDots = frictionRef.current?.querySelectorAll<HTMLElement>(
      '[data-vehicle-friction-dot]',
    ) ?? []
    surfaceDots.forEach((dot, index) => {
      if (
        calm
        || !visible
        || mode.vehicle.effect === 'contrail'
        || rawProgress >= 1
      ) {
        dot.style.opacity = '0'
        return
      }
      const surfaceProgress = Math.max(0, easedProgress - index * 0.006)
      const surfaceScreen = screenPoint(
        globe,
        sampleVehicleRoute(route, surfaceProgress),
      )
      const flicker = (Math.sin(now / 140 - index * 0.9) + 1) / 2
      dot.style.background = `rgba(${mode.route.colorRgb}, .62)`
      dot.style.boxShadow =
        `0 0 4px rgba(${mode.route.colorRgb}, .42)`
      dot.style.transform =
        `translate3d(${surfaceScreen.x}px, ${surfaceScreen.y}px, 0)`
      dot.style.opacity = String(0.08 + flicker * 0.22)
    })
  }

  return {
    refs: {
      trailRef,
      frictionRef,
      arrivalRef,
      stopRippleRef,
    },
    markArrival,
    markStop,
    update,
  }
}
