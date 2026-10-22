interface Props {
  active: boolean
  label: string | null
  type: 'flight' | 'train' | null
}

export default function VehicleCameraStatus({
  active,
  label,
  type,
}: Props) {
  if (!active || !label || !type) return null
  const vehicle = type === 'flight' ? '飞机' : '列车'
  return (
    <div
      data-vehicle-camera-status
      className="rg-vehicle-camera-status pointer-events-none absolute left-1/2 top-20 z-[3] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <span className="rg-vehicle-camera-status-dot" aria-hidden />
      <span>载具视角 · {vehicle}{label}</span>
    </div>
  )
}
