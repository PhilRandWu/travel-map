import type { Ref } from 'react'

export interface TimelineItem {
  date: string
  headline: string
  detail?: string
  meta: string
  icon: 'flight' | 'train' | 'visit'
  thumbnailUrl?: string
  thumbnailAlt?: string
}

interface Props {
  item: TimelineItem
  active: boolean
  index: number
  buttonRef: Ref<HTMLButtonElement>
  onSelect: () => void
}

const ICONS = { flight: '✈', train: '🚄', visit: '●' } as const

export default function TimelineNode({
  item,
  active,
  index,
  buttonRef,
  onSelect,
}: Props) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-timeline-index={index}
      aria-pressed={active}
      aria-label={`${item.date} ${item.headline}`}
      onClick={onSelect}
      className={`rg-film-node group relative flex h-[76px] w-[184px] shrink-0 snap-center items-center gap-2.5 overflow-hidden rounded-lg border px-3 text-left transition-all duration-300 ${
        active
          ? 'scale-[1.04] border-cyan-300/55 bg-cyan-300/12 shadow-[0_0_24px_rgba(103,232,249,.14)]'
          : 'border-white/10 bg-[rgba(7,11,22,.76)] hover:-translate-y-0.5 hover:border-white/22 hover:bg-[rgba(15,22,38,.9)]'
      }`}
    >
      <span
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border text-sm ${
          active
            ? 'border-cyan-200/40 bg-cyan-200/10 text-cyan-100'
            : 'border-white/10 bg-white/5 text-amber-200/85'
        }`}
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.thumbnailAlt ?? ''}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <span aria-hidden>{ICONS[item.icon]}</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <time
          dateTime={item.date}
          className={`block font-mono text-[10px] tracking-[0.14em] ${
            active ? 'text-cyan-100/75' : 'text-white/38'
          }`}
        >
          {item.meta}
        </time>
        <span className="mt-1 block truncate text-xs font-medium tracking-wide text-white/90">
          {item.headline}
        </span>
        {item.detail && (
          <span className="mt-0.5 block truncate text-[10px] text-white/38">
            {item.detail}
          </span>
        )}
      </span>

      {active && (
        <span className="absolute bottom-0 left-1/2 h-px w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
      )}
    </button>
  )
}
