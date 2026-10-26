import { useEffect, useRef } from 'react'
import type { JourneySummary } from '@/lib/journeys'
import { getJourneyCoverVisuals } from '@/lib/journeys'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import JourneyCoverMosaic from '@/components/journey/JourneyCoverMosaic'

interface Props {
  summaries: JourneySummary[]
  onOpenJourney: (journeyId: string) => void
  onNewJourney: () => void
  onClose: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyArchiveDrawer({
  summaries,
  onOpenJourney,
  onNewJourney,
  onClose,
}: Props) {
  const drawerRef = useRef<HTMLElement>(null)
  const grouped = new Map<number, JourneySummary[]>()
  for (const summary of summaries) {
    const year = Number(summary.journey.startDate.slice(0, 4))
    const items = grouped.get(year) ?? []
    items.push(summary)
    grouped.set(year, items)
  }
  const groups = [...grouped.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, journeys]) => ({ year, journeys }))
  useFocusTrap(drawerRef)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-[#02040b]/78 backdrop-blur-md"
      onClick={onClose}
    >
      <section
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="全部旅程"
        onClick={(event) => event.stopPropagation()}
        className="rg-drawer-in absolute inset-x-3 bottom-3 top-12 mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/12 bg-[rgba(6,9,20,.94)] shadow-[0_30px_120px_rgba(0,0,0,.7)] sm:inset-x-4 sm:bottom-4 sm:top-16"
      >
        <header className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
            <h2 className="mt-1 font-serif text-2xl text-white">全部旅程</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewJourney}
              className="min-h-10 rounded-full border border-cyan-200/20 bg-cyan-200/[.06] px-4 text-xs text-cyan-50/78 transition hover:border-cyan-200/36"
            >
              新增旅程
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭全部旅程"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-lg text-white/65 transition hover:border-white/30 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        <div className="rg-scroll h-[calc(100%-82px)] overflow-y-auto px-4 py-5 sm:px-6">
          {groups.map(({ year, journeys: yearJourneys }) => (
            <section key={year} className="mb-7">
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-mono text-sm tracking-[0.22em] text-amber-100/65">
                  {year}
                </h3>
                <span className="h-px flex-1 bg-gradient-to-r from-amber-100/25 to-transparent" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {yearJourneys.map((summary, index) => (
                  <button
                    key={summary.journey.id}
                    type="button"
                    onClick={() => onOpenJourney(summary.journey.id)}
                    data-journey-theme={summary.journey.theme}
                    className="rg-archive-row grid grid-cols-[7.5rem_1fr] gap-3 rounded-2xl border border-white/9 bg-white/[.035] p-2.5 text-left transition hover:border-white/20 hover:bg-white/[.06]"
                    style={{ '--rg-index': index } as React.CSSProperties}
                  >
                    <span className="block h-24 overflow-hidden rounded-xl">
                      <JourneyCoverMosaic
                        covers={getJourneyCoverVisuals(summary)}
                        title={summary.journey.title}
                        theme={summary.journey.theme}
                      />
                    </span>
                    <span className="min-w-0 py-1">
                      <span className="font-mono text-[10px] text-white/40">
                        {formatDate(summary.journey.startDate)} - {formatDate(summary.journey.endDate)}
                      </span>
                      <span className="mt-1 block truncate font-serif text-lg text-white">
                        {summary.journey.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-white/45">
                        {summary.journey.epigraph ?? summary.journey.summary ?? '返回这段旅程'}
                      </span>
                      <span className="mt-1.5 block text-[10px] tracking-[0.08em] text-white/36">
                        {summary.destinationCityIds.length} 个地点 · {summary.photoCount} 张照片
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
