import { useEffect, useRef } from 'react'
import type { Journey } from '@/types'
import { groupJourneysByYear } from '@/lib/journeys'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  journeys: Journey[]
  onOpenJourney: (journeyId: string) => void
  onClose: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyArchiveDrawer({
  journeys,
  onOpenJourney,
  onClose,
}: Props) {
  const drawerRef = useRef<HTMLElement>(null)
  const groups = groupJourneysByYear(journeys)
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
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭全部旅程"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-lg text-white/65 transition hover:border-white/30 hover:text-white"
          >
            ×
          </button>
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
                {yearJourneys.map((journey, index) => (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => onOpenJourney(journey.id)}
                    data-journey-theme={journey.theme}
                    className="rg-archive-row rounded-2xl border border-white/9 bg-white/[.035] p-4 text-left transition hover:border-white/20 hover:bg-white/[.06]"
                    style={{ '--rg-index': index } as React.CSSProperties}
                  >
                    <span className="font-mono text-[10px] text-white/40">
                      {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
                    </span>
                    <span className="mt-1 block font-serif text-lg text-white">{journey.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/45">
                      {journey.epigraph ?? journey.summary ?? '返回这段旅程'}
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
