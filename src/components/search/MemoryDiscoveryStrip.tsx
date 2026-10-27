import type { MemoryDiscovery, RandomMemoryTarget } from '@/lib/travelDiscovery'

interface Props {
  discoveries: MemoryDiscovery[]
  onOpen: (target: RandomMemoryTarget) => void
}

const ACCENT = {
  anniversary: {
    card: 'border-amber-100/14 hover:border-amber-100/30',
    badge: 'bg-amber-100/9 text-amber-50/68',
  },
  recent: {
    card: 'border-cyan-100/12 hover:border-cyan-100/28',
    badge: 'bg-cyan-100/8 text-cyan-50/66',
  },
  'same-city': {
    card: 'border-rose-100/12 hover:border-rose-100/28',
    badge: 'bg-rose-100/8 text-rose-50/62',
  },
} as const

export default function MemoryDiscoveryStrip({ discoveries, onOpen }: Props) {
  if (discoveries.length === 0) return null

  return (
    <section
      aria-label="回忆发现"
      className="border-b border-white/7 px-3 py-3 sm:px-4"
    >
      <p className="mb-2 px-1 font-mono text-[9px] tracking-[0.18em] text-white/30">
        MOMENTS WORTH REVISITING
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {discoveries.map((item) => {
          const accent = ACCENT[item.kind]
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.label}：${item.title}`}
              onClick={() => onOpen(item.target)}
              className={`min-w-0 cursor-pointer rounded-xl border bg-white/[.025] p-3 text-left transition hover:bg-white/[.045] ${accent.card}`}
            >
              <span className={`inline-flex rounded-full px-1.5 py-0.5 font-mono text-[8px] tracking-[0.1em] ${accent.badge}`}>
                {item.label}
              </span>
              <span className="mt-2 block truncate font-serif text-base text-white/86">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-white/34">
                {item.subtitle}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
