import { useEffect, useRef } from 'react'
import type { Journey } from '@/types'
import type { JourneySummary } from '@/lib/journeys'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  journey: Journey
  summary: JourneySummary
  onClose: () => void
  onReplay: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function ReplayFinale({
  journey,
  summary,
  onClose,
  onReplay,
}: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  useFocusTrap(dialogRef, '[data-replay-toggle]')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-[#03050c]/72 p-5 backdrop-blur-md">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${journey.title}回放结束`}
        className="rg-finale-in w-full max-w-xl rounded-3xl border border-amber-100/15 bg-[rgba(12,10,8,.92)] p-8 text-center text-[#f5ead8] shadow-[0_30px_120px_rgba(0,0,0,.75)]"
      >
        <p className="font-mono text-[10px] tracking-[0.24em] opacity-55">
          {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
        </p>
        <h2 className="mt-3 font-serif text-4xl">{journey.title}</h2>
        <p className="mt-3 text-sm leading-relaxed opacity-55">
          {journey.epigraph ?? journey.summary}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/8 py-4">
          <Metric value={summary.distanceKm.toLocaleString()} label="公里" />
          <Metric value={String(summary.visitCount)} label="处停留" />
          <Metric value={String(summary.photoCount)} label="张照片" />
        </div>
        <p className="mt-5 font-serif text-lg opacity-80">旅程会继续。</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="cursor-pointer rounded-full border border-amber-100/24 bg-amber-100/8 px-5 py-2.5 text-sm text-amber-50 transition hover:border-amber-100/45 hover:bg-amber-100/13"
          >
            再看一次
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-white/11 px-5 py-2.5 text-sm text-white/62 transition hover:border-white/24 hover:text-white"
          >
            回到旅程
          </button>
        </div>
      </section>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-xl tabular-nums">{value}</div>
      <div className="mt-1 text-[9px] tracking-[0.16em] opacity-40">{label}</div>
    </div>
  )
}
