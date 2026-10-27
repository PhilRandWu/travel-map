import type { RefObject } from 'react'
import type { TransportType } from '@/types'
import { getTransportMode } from '@/lib/transportModes'

interface Props {
  trailRef: RefObject<HTMLDivElement | null>
  frictionRef: RefObject<HTMLDivElement | null>
  arrivalRef: RefObject<HTMLDivElement | null>
  stopRippleRef?: RefObject<HTMLDivElement | null>
  type: TransportType
  color: string
}

export default function VehicleTrailLayer({
  trailRef,
  frictionRef,
  arrivalRef,
  stopRippleRef,
  type,
  color,
}: Props) {
  const effect = getTransportMode(type).vehicle.effect
  const trailStyle = {
    background: `rgba(${color}, .7)`,
    boxShadow: `0 0 8px 2px rgba(${color}, .32)`,
  }

  return (
    <>
      <div ref={trailRef} aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            data-vehicle-trail-dot={index}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ opacity: 0, ...trailStyle }}
          />
        ))}
      </div>
      <div
        ref={frictionRef}
        aria-hidden
        data-vehicle-effect={effect}
        className="pointer-events-none absolute inset-0"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <span
            key={index}
            data-vehicle-friction-dot={index}
            className="rg-vehicle-friction-dot absolute h-px w-px rounded-full"
            style={{
              opacity: 0,
              background: `rgba(${color}, .62)`,
            }}
          />
        ))}
      </div>
      <div
        ref={stopRippleRef}
        aria-hidden
        className="rg-waypoint-ripple pointer-events-none absolute inset-0"
      >
        <span />
      </div>
      <div
        ref={arrivalRef}
        aria-hidden
        className="rg-vehicle-arrival pointer-events-none absolute inset-0"
      >
        <span />
        <span />
      </div>
    </>
  )
}
