import type { JourneySummary } from '@/lib/journeys'
import { photoThumbUrl } from '@/lib/derive'

interface Props {
  summary: JourneySummary
  featured?: boolean
  onOpen: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function JourneyCard({ summary, featured = false, onOpen }: Props) {
  const { journey, coverSources, destinationCityIds, photoCount, tripCount } = summary

  return (
    <button
      type="button"
      aria-label={`打开旅程：${journey.title}，${journey.startDate} 至 ${journey.endDate}`}
      onClick={onOpen}
      data-journey-theme={journey.theme}
      className={`rg-journey-card group pointer-events-auto relative shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-[rgba(7,11,24,.82)] text-left shadow-[0_16px_50px_rgba(0,0,0,.42)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/25 ${
        featured ? 'w-[min(390px,calc(100vw-2rem))]' : 'w-[280px]'
      }`}
    >
      <span className="rg-journey-spark" aria-hidden="true" />
      <div className={`grid gap-1.5 p-2 ${featured ? 'h-36 grid-cols-3' : 'h-24 grid-cols-2'}`}>
        {coverSources.length > 0 ? coverSources.slice(0, featured ? 3 : 2).map((cover, index) => (
          <span
            key={`${cover.visitId}:${cover.file}`}
            className={`relative overflow-hidden rounded-xl ${
              index === 0 && featured ? 'row-span-2' : ''
            }`}
          >
            <img
              src={photoThumbUrl(cover.visitId, cover.file)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          </span>
        )) : (
          <div className="col-span-full row-span-full rounded-xl bg-[radial-gradient(circle_at_65%_30%,var(--rg-journey-glow),transparent_55%),linear-gradient(135deg,#0a1730,#07101f)] p-4">
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/50">
              {formatDate(journey.startDate)} - {formatDate(journey.endDate)}
            </span>
          </div>
        )}
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
