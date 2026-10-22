import type { CSSProperties } from 'react'
import type { Journey, TravelData } from '@/types'
import { photoThumbUrl } from '@/lib/derive'
import { summarizeJourney } from '@/lib/journeys'

interface Props {
  data: TravelData
  journey: Journey
  onStartReplay: () => void
  showOtherJourneys: boolean
  onShowOtherJourneysChange: (visible: boolean) => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyPassport({
  data,
  journey,
  onStartReplay,
  showOtherJourneys,
  onShowOtherJourneysChange,
}: Props) {
  const summary = summarizeJourney(data, journey)

  return (
    <aside
      data-journey-theme={journey.theme}
      className="rg-passport pointer-events-auto w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,10,22,.84)] p-4 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--rg-journey-accent)]">
            {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
          </p>
          <h2 className="mt-1 font-serif text-2xl tracking-wide text-white">{journey.title}</h2>
        </div>
        <span className="mt-1 border-b border-[var(--rg-journey-accent)] pb-1 font-mono text-[9px] tracking-[0.18em] text-white/35">
          PASSPORT
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-white/50">
        {journey.epigraph ?? journey.summary}
      </p>

      <div className="mt-3 grid h-24 grid-cols-[1.45fr_1fr_1fr] gap-1.5 overflow-hidden rounded-xl">
        {summary.coverSources.slice(0, 3).map((cover, index) => (
          <img
            key={`${cover.visitId}:${cover.file}`}
            src={photoThumbUrl(cover.visitId, cover.file)}
            alt=""
            loading="lazy"
            style={{ '--rg-index': index } as CSSProperties}
            className="rg-stagger-item h-full w-full object-cover"
          />
        ))}
        {summary.coverSources.length === 0 && (
          <div className="col-span-full flex items-center justify-center bg-[radial-gradient(circle_at_70%_20%,var(--rg-journey-glow),transparent_60%),linear-gradient(135deg,#0b1729,#07101f)] font-mono text-[9px] tracking-[0.2em] text-white/35">
            MEMORY
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1 text-[10px] text-white/58">
          {summary.destinationCityIds.length} 个地点
        </span>
        <span className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1 text-[10px] text-white/58">
          {summary.photoCount} 张照片
        </span>
        <span className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1 text-[10px] text-white/58">
          {summary.distanceKm.toLocaleString()} km
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-white/8 py-3 text-center">
        <Metric value={summary.tripCount} label="段交通" />
        <Metric value={summary.visitCount} label="处停留" />
        <Metric value={summary.coverSources.length} label="帧封面" />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={showOtherJourneys}
        onClick={() => onShowOtherJourneysChange(!showOtherJourneys)}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-left text-[11px] text-white/52 transition hover:border-white/16 hover:text-white/75"
      >
        <span>显示其他旅程</span>
        <span
          aria-hidden
          className={`relative h-4 w-7 rounded-full transition ${
            showOtherJourneys ? 'bg-cyan-200/55' : 'bg-white/12'
          }`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#f5ead8] transition-transform ${
              showOtherJourneys ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={onStartReplay}
        className="rg-passport-action mt-3 w-full rounded-xl border bg-white/[.045] px-4 py-2.5 text-sm tracking-wide text-white/85 transition hover:bg-white/[.075] hover:text-white"
      >
        开始旅程回放
      </button>
    </aside>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-lg tabular-nums text-white/88">{value}</div>
      <div className="text-[9px] tracking-[0.12em] text-white/35">{label}</div>
    </div>
  )
}
