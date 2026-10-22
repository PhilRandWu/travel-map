import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { LitCity } from '@/lib/derive'
import { FLIGHT_MS, INITIAL_POV } from '@/components/globe/globeConfig'
import { useMotion } from '@/components/motion/MotionProvider'

interface Options {
  globeRef: RefObject<GlobeMethods | undefined>
  lastInteractRef: RefObject<number>
  litCities: LitCity[]
  selectedCityId: string | null
  focusPoint: { lat: number; lng: number } | null
  resetSignal: number
}

export function useCameraFocus({
  globeRef,
  lastInteractRef,
  litCities,
  selectedCityId,
  focusPoint,
  resetSignal,
}: Options) {
  const { effectiveLevel, reducedMotion } = useMotion()
  const duration = reducedMotion || effectiveLevel === 'calm' ? 0 : FLIGHT_MS

  const flyTo = useCallback((lat: number, lng: number, maxAlt: number) => {
    const globe = globeRef.current
    if (!globe) return
    const current = globe.pointOfView()
    const targetAlt = Math.min(current.altitude, maxAlt)
    const dLat = Math.abs(current.lat - lat)
    const dLng = Math.min(
      Math.abs(current.lng - lng),
      360 - Math.abs(current.lng - lng),
    )
    const dAlt = Math.abs(current.altitude - targetAlt)
    if (dLat < 0.5 && dLng < 0.5 && dAlt < 0.05) return
    globe.pointOfView({ lat, lng, altitude: targetAlt }, duration)
  }, [duration, globeRef])

  const selectedCity = useMemo(
    () => litCities.find((city) => city.city.id === selectedCityId) ?? null,
    [litCities, selectedCityId],
  )

  useEffect(() => {
    if (!selectedCity) return
    lastInteractRef.current = performance.now()
    flyTo(selectedCity.city.lat, selectedCity.city.lng, 1.35)
  }, [flyTo, lastInteractRef, selectedCity])

  useEffect(() => {
    if (!focusPoint) return
    lastInteractRef.current = performance.now()
    flyTo(focusPoint.lat, focusPoint.lng, 2.3)
  }, [flyTo, focusPoint, lastInteractRef])

  useEffect(() => {
    if (resetSignal === 0) return
    const globe = globeRef.current
    if (!globe) return
    lastInteractRef.current = performance.now()
    globe.pointOfView(INITIAL_POV, duration)
  }, [duration, globeRef, lastInteractRef, resetSignal])

  return flyTo
}
