import type { City, TravelData } from '@/types'
import { TRANSPORT_WAYPOINT_LIMIT } from '@/lib/transportModes'
import CityCombobox from '@/components/editor/CityCombobox'

interface Props {
  data: TravelData
  from: City | null
  to: City | null
  value: Array<City | null>
  onChange: (value: Array<City | null>) => void
}

export default function WaypointEditor({
  data,
  from,
  to,
  value,
  onChange,
}: Props) {
  const update = (index: number, city: City | null) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? city : item)))
  }

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const current = next[index]
    next[index] = next[target]
    next[target] = current
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.12em] text-white/62">经停城市</p>
        <button
          type="button"
          disabled={value.length >= TRANSPORT_WAYPOINT_LIMIT}
          onClick={() => onChange([...value, null])}
          className="min-h-9 cursor-pointer rounded-full border border-white/12 px-3 text-[11px] text-white/60 transition hover:border-white/24 hover:text-white/84 disabled:cursor-not-allowed disabled:opacity-35"
        >
          + 添加经停
        </button>
      </div>
      {value.length === 0 && (
        <p className="rounded-lg border border-white/9 bg-white/[.025] px-3 py-2.5 text-[11px] leading-relaxed text-white/46">
          可留空；添加后路线会按出发 → 经停 → 到达分段，并在经停城市短暂停靠。
        </p>
      )}
      {value.map((waypoint, index) => {
        const excluded = [
          from?.id,
          to?.id,
          ...value
            .filter((_, itemIndex) => itemIndex !== index)
            .map((city) => city?.id),
        ].filter((id): id is string => Boolean(id))
        return (
          <div key={index} className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <CityCombobox
                data={data}
                label={`经停 ${index + 1}`}
                value={waypoint}
                excludeCityIds={excluded}
                excludedMessage="该城市已在路线中，不能重复添加。"
                onChange={(city) => update(index, city)}
              />
            </div>
            <div className="mt-7 flex">
              <button
                type="button"
                aria-label={`上移经停 ${index + 1}`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="grid h-9 w-8 cursor-pointer place-items-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-20"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`下移经停 ${index + 1}`}
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
                className="grid h-9 w-8 cursor-pointer place-items-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-20"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`移除经停 ${index + 1}`}
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                className="grid h-9 w-8 cursor-pointer place-items-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80"
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
