import type { RefObject } from 'react'

interface Props {
  trailRef: RefObject<HTMLDivElement | null>
  frictionRef: RefObject<HTMLDivElement | null>
  arrivalRef: RefObject<HTMLDivElement | null>
}

export default function VehicleTrailLayer({
  trailRef,
  frictionRef,
  arrivalRef,
}: Props) {
  return (
    <>
      <div ref={trailRef} aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            data-vehicle-trail-dot={index}
            className="absolute h-1.5 w-1.5 rounded-full bg-cyan-100/70 shadow-[0_0_8px_2px_rgba(103,232,249,.32)]"
            style={{ opacity: 0 }}
          />
        ))}
      </div>
      <div ref={frictionRef} aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            data-vehicle-friction-dot={index}
            className="rg-vehicle-friction-dot absolute h-px w-px rounded-full bg-amber-100/60"
            style={{ opacity: 0 }}
          />
        ))}
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
