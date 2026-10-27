import type { TransportType } from '@/types'
import { TRANSPORT_MODES, TRANSPORT_TYPES } from '@/lib/transportModes'

interface Props {
  value: TransportType
  onChange: (type: TransportType) => void
}

export default function TransportTypePicker({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="交通方式"
      className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[.025] p-1 sm:grid-cols-5"
    >
      {TRANSPORT_TYPES.map((type) => {
        const mode = TRANSPORT_MODES[type]
        const selected = value === type
        return (
          <button
            key={type}
            type="button"
            aria-label={mode.label}
            aria-pressed={selected}
            onClick={() => onChange(type)}
            style={selected ? {
              backgroundColor: `rgba(${mode.route.colorRgb},.1)`,
              color: mode.route.colorHex,
            } : undefined}
            className={`min-h-11 cursor-pointer rounded-lg px-2 text-xs transition ${
              selected
                ? ''
                : 'text-white/55 hover:bg-white/5 hover:text-white/82'
            }`}
          >
            <span aria-hidden>{mode.icon}</span>
            <span className="ml-1">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
