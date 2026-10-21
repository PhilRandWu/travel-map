import { useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import {
  sampleVehicleRoute,
  type VehiclePosition,
} from '@/lib/vehicle'
import {
  getReplayStepProgress,
  type ReplayRuntime,
} from '@/lib/replay'
import type { VehiclePlayback } from '@/components/globe/hooks/useVehiclePlayback'
import { createVehicleTrail } from '@/components/globe/vehicleTrail'

interface Props {
  playback: VehiclePlayback | null
  replayRuntime: ReplayRuntime | null
  globeRef: RefObject<GlobeMethods | undefined>
}

const HOLD_MS = 260
const FADE_MS = 360
const VEHICLE_ICONS = {
  flight: '/vehicle-icons/flight-3d.svg',
  train: '/vehicle-icons/train-3d.svg',
} as const

function isPointVisible(
  globe: GlobeMethods,
  position: VehiclePosition,
): boolean {
  const point = globe.getCoords(position.lat, position.lng, position.altitude)
  const camera = globe.camera().position
  // 点位于地球正面时，相机到该点的向量与法线夹角小于 90°。
  return point.x * camera.x + point.y * camera.y + point.z * camera.z
    >= point.x * point.x + point.y * point.y + point.z * point.z
}

function screenPoint(
  globe: GlobeMethods,
  position: VehiclePosition,
): { x: number; y: number } {
  return globe.getScreenCoords(
    position.lat,
    position.lng,
    position.altitude,
  )
}

/**
 * 独立于 React 渲染帧的载具覆盖层。
 * 逐帧直接更新 DOM transform，避免 60fps setState 拖慢地球场景。
 */
export default function VehicleOverlay({
  playback,
  replayRuntime,
  globeRef,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)

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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const moveDuration = reducedMotion ? 1 : playback.route.durationMs
    const trail = createVehicleTrail(globe, playback.route)
    host.dataset.vehicleTrail = 'true'
    let animationFrame = 0
    let angle = 0
    let hasDirection = false

    const renderProgress = (rawProgress: number, opacity = 1) => {
      const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress)
      const position = sampleVehicleRoute(playback.route, easedProgress)
      const screen = screenPoint(globe, position)
      const visible = isPointVisible(globe, position)

      const nextPosition = sampleVehicleRoute(
        playback.route,
        Math.min(1, easedProgress + 0.008),
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

      const fadeIn = reducedMotion ? 1 : Math.min(1, rawProgress / 0.05)
      marker.style.visibility = 'visible'
      marker.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`
      marker.style.opacity = visible
        ? String(Math.min(fadeIn, opacity))
        : '0'
      marker.style.setProperty('--rg-vehicle-angle', `${angle}deg`)
      marker.dataset.vehicleProgress = rawProgress.toFixed(3)
      host.dataset.vehicleTrailProgress = rawProgress.toFixed(3)
      marker.dataset.vehicleVisible = String(visible)
      trail.update(easedProgress)
    }

    const hideMarker = () => {
      marker.style.opacity = '0'
      marker.style.visibility = 'hidden'
      marker.dataset.vehicleVisible = 'false'
      host.dataset.vehiclePlaying = 'false'
    }

    const replayStep = replayRuntime
      ? replayRuntime.plan.steps[replayRuntime.getPosition().index]
      : undefined
    const followsReplay =
      replayRuntime !== null
      && replayRuntime.status !== 'idle'
      && replayStep?.node.kind === 'trip'
      && replayStep.node.refId === playback.tripId

    if (followsReplay) {
      const drawReplayFrame = () => {
        const position = replayRuntime.getPosition()
        const step = replayRuntime.plan.steps[position.index]
        if (step?.node.kind !== 'trip' || step.node.refId !== playback.tripId) {
          hideMarker()
          return false
        }
        const stepProgress = getReplayStepProgress(
          replayRuntime.plan,
          position.index,
          position.elapsedMs,
        )
        const travelProgress = Math.min(
          1,
          stepProgress * step.durationMs / moveDuration,
        )
        renderProgress(travelProgress)
        return true
      }

      host.dataset.vehiclePlaying = String(replayRuntime.status === 'playing')
      drawReplayFrame()
      if (replayRuntime.status === 'playing') {
        const replayFrame = () => {
          if (!drawReplayFrame()) return
          animationFrame = requestAnimationFrame(replayFrame)
        }
        animationFrame = requestAnimationFrame(replayFrame)
      }

      return () => {
        cancelAnimationFrame(animationFrame)
        host.dataset.vehiclePlaying = 'false'
        delete host.dataset.vehicleTrail
        delete host.dataset.vehicleTrailProgress
        trail.dispose()
      }
    }

    const totalDuration = moveDuration + HOLD_MS + FADE_MS
    const start = performance.now()
    marker.style.opacity = '0'
    marker.style.visibility = 'visible'
    marker.dataset.vehicleProgress = '0'
    marker.dataset.vehicleVisible = 'false'
    host.dataset.vehiclePlaying = 'true'

    const frame = (now: number) => {
      const elapsed = now - start
      const rawProgress = Math.min(1, elapsed / moveDuration)
      const fadeOut = elapsed <= moveDuration + HOLD_MS
        ? 1
        : Math.max(0, 1 - (elapsed - moveDuration - HOLD_MS) / FADE_MS)
      renderProgress(rawProgress, fadeOut)

      if (elapsed < totalDuration) {
        animationFrame = requestAnimationFrame(frame)
      } else {
        hideMarker()
      }
    }

    animationFrame = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(animationFrame)
      host.dataset.vehiclePlaying = 'false'
      delete host.dataset.vehicleTrail
      delete host.dataset.vehicleTrailProgress
      trail.dispose()
    }
  }, [globeRef, playback, replayRuntime])

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
