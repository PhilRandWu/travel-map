import type { Journey } from '@/types'

interface Props {
  journey: Journey
  current: boolean
  pinned: boolean
  onSelect: () => void
  onTogglePin: () => void
}

const formatDate = (value: string) => value.replaceAll('-', '.')

export default function JourneySwitchRow({
  journey,
  current,
  pinned,
  onSelect,
  onTogglePin,
}: Props) {
  return (
    <div
      data-journey-theme={journey.theme}
      className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 transition ${
        current
          ? 'border-cyan-100/22 bg-cyan-100/[.065]'
          : 'border-white/8 bg-white/[.025] hover:border-white/16'
      }`}
    >
      <button
        type="button"
        aria-label={`选择旅程：${journey.title}`}
        onClick={onSelect}
        className="min-w-0 flex-1 cursor-pointer px-1.5 py-1 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-xs text-white/84">{journey.title}</span>
          {current && (
            <span className="shrink-0 rounded-full bg-cyan-100/10 px-1.5 py-0.5 text-[8px] tracking-[0.1em] text-cyan-50/70">
              当前
            </span>
          )}
        </span>
        <span className="mt-0.5 block font-mono text-[9px] text-white/34">
          {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
        </span>
      </button>
      <button
        type="button"
        aria-label={pinned ? `取消置顶${journey.title}` : `将${journey.title}置顶`}
        aria-pressed={pinned}
        onClick={onTogglePin}
        className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-xs transition ${
          pinned
            ? 'bg-amber-100/12 text-amber-100/82'
            : 'text-white/28 hover:bg-white/6 hover:text-amber-100/70'
        }`}
      >
        {pinned ? '★' : '☆'}
      </button>
    </div>
  )
}
