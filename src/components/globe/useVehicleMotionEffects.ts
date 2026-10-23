import { useEffect, useRef } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { VehicleRoute } from '@/lib/vehicle'
import { sampleVehicleRoute } from '@/lib/vehicle'
import { screenPoint } from '@/components/globe/vehicleScreen'

const EFFECT_INTERVAL_MS = 1000 / 30

export function useVehicleMotionEffects(playbackKey?: number) {
  const trailRef = useRef<HTMLDivElement>(null)
  const frictionRef = useRef<HTMLDivElement>(null)
  const arrivalRef = useRef<HTMLDivElement>(null)
  const arrivalPlayedRef = useRef(false)
  const arrivalTimerRef = useRef<number | null>(null)
  const lastEffectAtRef = useRef(-Infinity)

  useEffect(() => {
    if (arrivalTimerRef.current !== null) {
      window.clearTimeout(arrivalTimerRef.current)
      arrivalTimerRef.current = null
    }
    arrivalPlayedRef.current = false
    lastEffectAtRef.current = -Infinity
    arrivalRef.current?.classList.remove('rg-vehicle-arrival-active')
    trailRef.current?.querySelectorAll<HTMLElement>('[data-vehicle-trail-dot]')
      .forEach((dot) => { dot.style.opacity = '0' })
    frictionRef.current?.querySelectorAll<HTMLElement>('[data-vehicle-friction-dot]')
      .forEach((dot) => { dot.style.opacity = '0' })
  }, [playbackKey])

  useEffect(() => () => {
    if (arrivalTimerRef.current !== null) {
      window.clearTimeout(arrivalTimerRef.current)
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

    const frictionDots = frictionRef.current?.querySelectorAll<HTMLElement>(
      '[data-vehicle-friction-dot]',
    ) ?? []
    frictionDots.forEach((dot, index) => {
      if (calm || !visible || route.type !== 'train' || rawProgress >= 1) {
        dot.style.opacity = '0'
        return
      }
      const frictionProgress = Math.max(0, easedProgress - index * 0.006)
      const frictionScreen = screenPoint(
        globe,
        sampleVehicleRoute(route, frictionProgress),
      )
      const flicker = (Math.sin(now / 140 - index * 0.9) + 1) / 2
      dot.style.transform =
        `translate3d(${frictionScreen.x}px, ${frictionScreen.y}px, 0)`
      dot.style.opacity = String(0.08 + flicker * 0.22)
    })
  }

  return {
    refs: {
      trailRef,
      frictionRef,
      arrivalRef,
    },
    markArrival,
    update,
  }
}
