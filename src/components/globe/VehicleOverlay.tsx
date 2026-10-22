import { useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { sampleVehicleRoute, type VehiclePlayback } from '@/lib/vehicle'
import type { VehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'
import { createVehicleTrail } from '@/components/globe/vehicleTrail'
import { useMotion } from '@/components/motion/MotionProvider'
import { isPointVisible, screenPoint } from '@/components/globe/vehicleScreen'
import VehicleTrailLayer from '@/components/globe/VehicleTrailLayer'
import { useVehicleMotionEffects } from '@/components/globe/useVehicleMotionEffects'

interface Props {
  playback: VehiclePlayback | null
  runtime: VehicleRuntime
  globeRef: RefObject<GlobeMethods | undefined>
}

const VEHICLE_ICONS = {
  flight: '/vehicle-icons/flight-3d.svg',
  train: '/vehicle-icons/train-3d.svg',
} as const

export default function VehicleOverlay({
  playback,
  runtime,
  globeRef,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const { effectiveLevel } = useMotion()
  const effects = useVehicleMotionEffects(playback?.key)

  useEffect(() => {
    for (const source of Object.values(VEHICLE_ICONS)) {
      const image = new window.Image()
      image.src = source
    }
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    const host = hostRef.current
    const marker = markerRef.current
    if (!playback || !globe || !host || !marker) return

    const calmMotion = effectiveLevel === 'calm'
    const trail = createVehicleTrail(globe, playback.route)
    host.dataset.vehicleTrail = 'true'
    let angle = 0
    let hasDirection = false

    const hideMarker = () => {
      marker.style.opacity = '0'
      marker.style.visibility = 'hidden'
      marker.dataset.vehicleVisible = 'false'
      host.dataset.vehiclePlaying = 'false'
    }

    const unsubscribe = runtime.subscribe((frame) => {
      if (!frame || frame.tripId !== playback.tripId) {
        hideMarker()
        return
      }

      const { motion, stage } = frame
      const position = calmMotion
        ? sampleVehicleRoute(playback.route, 1)
        : motion.position
      const screen = screenPoint(globe, position)
      const visible = isPointVisible(globe, position)

      if (!calmMotion) {
        const nextPosition = sampleVehicleRoute(
          playback.route,
          Math.min(1, motion.progress + 0.008),
        )
        const nextScreen = screenPoint(globe, nextPosition)
        const dx = nextScreen.x - screen.x
        const dy = nextScreen.y - screen.y
        if (Math.hypot(dx, dy) > 0.4) {
          const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI
          if (!hasDirection) {
            angle = targetAngle
            hasDirection = true
          } else {
            const delta = ((targetAngle - angle + 540) % 360) - 180
            angle += delta * 0.24
          }
        }
      }

      const finished = stage === 'complete'
      marker.style.visibility = 'visible'
      marker.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`
      marker.style.opacity = visible && !finished ? '1' : '0'
      marker.style.setProperty('--rg-vehicle-angle', `${angle}deg`)
      marker.style.setProperty('--rg-vehicle-pitch', `${motion.pitchDeg}deg`)
      marker.style.setProperty('--rg-vehicle-roll', `${motion.rollDeg}deg`)
      marker.dataset.vehicleProgress = motion.progress.toFixed(3)
      marker.dataset.vehicleStage = stage
      marker.dataset.vehicleChase = String(!calmMotion)
      marker.dataset.vehicleVisible = String(visible)

      host.dataset.vehiclePlaying = String(!finished)
      host.dataset.vehicleTrailProgress = String(
        calmMotion ? 1 : motion.progress,
      )
      trail.update(calmMotion ? 1 : motion.progress)
      effects.update(
        globe,
        playback.route,
        calmMotion ? 1 : motion.progress,
        motion.progress,
        visible,
        calmMotion,
      )
      if (motion.progress >= 1) {
        effects.markArrival(globe, playback.route)
      }
    })

    return () => {
      unsubscribe()
      host.dataset.vehiclePlaying = 'false'
      delete host.dataset.vehicleTrail
      delete host.dataset.vehicleTrailProgress
      trail.dispose()
    }
  }, [effectiveLevel, globeRef, playback, runtime])

  if (!playback) return null
  const isFlight = playback.type === 'flight'

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-vehicle-overlay
      data-vehicle-playing="false"
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
    >
      <div className="rg-chase-vignette pointer-events-none absolute inset-0" />
      <VehicleTrailLayer {...effects.refs} />
      <div
        ref={markerRef}
        data-vehicle-type={playback.type}
        data-vehicle-label={playback.label}
        className="rg-vehicle-marker"
      >
        <div
          className={`rg-vehicle-glyph ${
            isFlight
              ? 'drop-shadow-[0_2px_8px_rgba(103,232,249,.5)]'
              : 'drop-shadow-[0_2px_8px_rgba(251,191,36,.42)]'
          }`}
        >
          <span
            className={`rg-vehicle-halo ${
              isFlight
                ? 'bg-cyan-300/30 shadow-[0_0_22px_10px_rgba(103,232,249,.22)]'
                : 'bg-amber-300/30 shadow-[0_0_22px_10px_rgba(251,191,36,.2)]'
            }`}
          />
          <img
            src={VEHICLE_ICONS[playback.type]}
            alt=""
            draggable={false}
            data-vehicle-icon
            className="rg-vehicle-icon"
          />
        </div>
        <span className="rg-vehicle-label">{playback.label}</span>
      </div>
    </div>
  )
}
