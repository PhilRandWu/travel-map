import type { CSSProperties } from 'react'

export interface VehicleCameraStatusData {
  label: string
  type: 'flight' | 'train'
  routeLabel: string
  progress: number
}

interface Props {
  active: boolean
  status: VehicleCameraStatusData | null
}

export default function VehicleCameraStatus({
  active,
  status,
}: Props) {
  if (!active || !status) return null
  const vehicle = status.type === 'flight' ? '飞机' : '高铁'
  const [date, routeLabel, ...meta] = status.routeLabel.split(' · ')
  const [origin, destination] = routeLabel?.split(' → ') ?? []
  const detail = meta.join(' · ')
  const progress = Math.round(status.progress * 100)

  return (
    <div
      data-vehicle-camera-status
      data-vehicle-type={status.type}
      className="rg-vehicle-camera-status pointer-events-none absolute left-1/2 top-20 z-[3] -translate-x-1/2"
      style={{ '--rg-route-progress': `${progress}%` } as CSSProperties}
    >
      <div className="rg-vehicle-camera-status-line">
        <span className="rg-vehicle-camera-status-dot" aria-hidden />
        <span>路线导演</span>
        <span className="rg-vehicle-camera-status-vehicle">{vehicle}</span>
        <span role="status" aria-live="polite">{status.label}</span>
      </div>
      <div className="rg-vehicle-camera-status-route">
        <span>{origin ?? status.routeLabel}</span>
        {destination && (
          <>
            <span aria-hidden>→</span>
            <span>{destination}</span>
          </>
        )}
      </div>
      <div className="rg-vehicle-camera-status-meta">
        <span>{date}</span>
        {detail && <span>{detail}</span>}
        <span className="tabular-nums">{progress}%</span>
      </div>
      <div className="rg-vehicle-camera-progress" aria-hidden>
        <span />
      </div>
    </div>
  )
}
