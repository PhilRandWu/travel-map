import { useEffect, useRef, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import {
  sampleVehicleRoute,
  type VehiclePosition,
} from '@/lib/vehicle'
import type { VehiclePlayback } from '@/components/globe/hooks/useVehiclePlayback'

interface Props {
  playback: VehiclePlayback | null
  globeRef: RefObject<GlobeMethods | undefined>
}

const HOLD_MS = 260
const FADE_MS = 360

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
export default function VehicleOverlay({ playback, globeRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const globe = globeRef.current
    const host = hostRef.current
    const marker = markerRef.current
    if (!playback || !globe || !host || !marker) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const moveDuration = reducedMotion ? 1 : playback.route.durationMs
    const totalDuration = moveDuration + HOLD_MS + FADE_MS
    const start = performance.now()
    let animationFrame = 0
    let angle = 0
    let hasDirection = false

    marker.style.visibility = 'visible'
    marker.style.opacity = '0'
    marker.dataset.vehicleProgress = '0'
    marker.dataset.vehicleVisible = 'false'
    host.dataset.vehiclePlaying = 'true'

    const frame = (now: number) => {
      const elapsed = now - start
      const rawProgress = Math.min(1, elapsed / moveDuration)
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
      const fadeOut = elapsed <= moveDuration + HOLD_MS
        ? 1
        : Math.max(0, 1 - (elapsed - moveDuration - HOLD_MS) / FADE_MS)

      marker.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`
      marker.style.opacity = visible ? String(Math.min(fadeIn, fadeOut)) : '0'
      marker.style.setProperty('--rg-vehicle-angle', `${angle}deg`)
      marker.dataset.vehicleProgress = rawProgress.toFixed(3)
      marker.dataset.vehicleVisible = String(visible)

      if (elapsed < totalDuration) {
        animationFrame = requestAnimationFrame(frame)
      } else {
        marker.style.opacity = '0'
        marker.style.visibility = 'hidden'
        host.dataset.vehiclePlaying = 'false'
      }
    }

    animationFrame = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(animationFrame)
      host.dataset.vehiclePlaying = 'false'
    }
  }, [globeRef, playback])

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
              ? 'text-cyan-100 drop-shadow-[0_0_8px_rgba(165,216,255,.9)]'
              : 'text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,.85)]'
          }`}
        >
          <span
            className={`rg-vehicle-halo ${
              isFlight
                ? 'bg-cyan-300/30 shadow-[0_0_22px_10px_rgba(103,232,249,.22)]'
                : 'bg-amber-300/30 shadow-[0_0_22px_10px_rgba(251,191,36,.2)]'
            }`}
          />
          <VehicleGlyph type={playback.type} />
        </div>
        <span className="rg-vehicle-label">{playback.label}</span>
      </div>
    </div>
  )
}

function VehicleGlyph({ type }: { type: VehiclePlayback['type'] }) {
  if (type === 'flight') {
    return (
      <svg viewBox="0 0 64 64" className="rg-vehicle-icon" aria-hidden="true">
        <path
          fill="currentColor"
          d="M58 32a4 4 0 0 0-4-4H37.8L27.6 9.2A4.1 4.1 0 0 0 24.1 7h-3.2l4.8 19.1H14.9l-3.6-5.4A3 3 0 0 0 8.8 19H6l2.7 12.7L6 44.7h2.8c1 0 1.9-.5 2.5-1.4l3.6-5.4h10.8L20.9 57h3.2c1.5 0 2.8-.8 3.5-2.2l10.2-17.8H54a4 4 0 0 0 4-4Z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 64 64" className="rg-vehicle-icon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 15h33a6 6 0 0 1 6 6v20H17a6 6 0 0 1-6-6V15Zm39 4 8 7v15h-8V19Z"
      />
      <rect x="17" y="21" width="11" height="9" rx="2" fill="#07101f" opacity=".82" />
      <rect x="32" y="21" width="11" height="9" rx="2" fill="#07101f" opacity=".82" />
      <circle cx="23" cy="43" r="4" fill="#07101f" />
      <circle cx="46" cy="43" r="4" fill="#07101f" />
      <path
        d="M9 51h51M12 57h45"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        opacity=".75"
      />
    </svg>
  )
}
