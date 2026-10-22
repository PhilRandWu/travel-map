import { useRef } from 'react'
import type { JourneySummary } from '@/lib/journeys'
import JourneyCoverMosaic from '@/components/journey/JourneyCoverMosaic'
import { useJourneyCardMotion } from '@/components/motion/useJourneyCardMotion'

interface Props {
  summary: JourneySummary
  featured?: boolean
  onOpen: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyCard({ summary, featured = false, onOpen }: Props) {
  const { journey, coverSources, destinationCityIds, photoCount, tripCount } = summary
  const cardRef = useRef<HTMLButtonElement>(null)
  useJourneyCardMotion(cardRef)

  return (
    <button
      ref={cardRef}
      type="button"
      aria-label={`打开旅程：${journey.title}，${journey.startDate} 至 ${journey.endDate}`}
      onClick={onOpen}
      data-journey-theme={journey.theme}
      className={`rg-journey-card group pointer-events-auto relative shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-[rgba(7,11,24,.82)] text-left shadow-[0_16px_50px_rgba(0,0,0,.42)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/25 ${
        featured ? 'w-[min(390px,calc(100vw-2rem))]' : 'w-[280px]'
      }`}
    >
      <span className="rg-journey-spark" aria-hidden="true" />
      <div className={`p-2 ${featured ? 'h-36' : 'h-24'}`}>
        <JourneyCoverMosaic
          covers={coverSources.map(({ visitId, file }) => ({ visitId, file }))}
          title={journey.title}
          theme={journey.theme}
          large={featured}
        />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <time className="font-mono text-[10px] tracking-[0.16em] text-[var(--rg-journey-accent)]">
            {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
          </time>
          <span className="font-mono text-[9px] tracking-[0.18em] text-white/28">
            MEMORY / {journey.id.toUpperCase()}
          </span>
        </div>
        <h3 className="mt-1.5 font-serif text-xl tracking-wide text-white">{journey.title}</h3>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-white/48">
          {journey.epigraph ?? journey.summary ?? '一段被重新点亮的旅程'}
        </p>
        <p className="mt-2 text-[10px] tracking-[0.12em] text-white/38">
          {destinationCityIds.length} 个地点 · {photoCount} 张照片 · {tripCount} 段交通
        </p>
      </div>
    </button>
  )
}
