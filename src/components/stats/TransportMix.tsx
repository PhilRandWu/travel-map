import type { TransportType } from '@/types'
import { TRANSPORT_MODES, TRANSPORT_TYPES } from '@/lib/transportModes'

interface Props {
  counts: Record<TransportType, number>
}

export default function TransportMix({ counts }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1" aria-label="交通构成">
      {TRANSPORT_TYPES.map((type) => {
        const mode = TRANSPORT_MODES[type]
        return (
          <div
            key={type}
            aria-label={`${mode.label} ${counts[type]}`}
            className="rounded-lg border border-white/7 bg-white/[.025] px-1 py-1.5 text-center"
          >
            <span className="block text-[11px]" aria-hidden>{mode.icon}</span>
            <span
              className="mt-0.5 block text-xs font-semibold tabular-nums"
              style={{ color: mode.route.colorHex }}
            >
              {counts[type]}
            </span>
            <span className="block text-[8px] tracking-wide text-white/34">
              {mode.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
