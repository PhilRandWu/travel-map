import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { MemorySource, Selection, TravelData } from '@/types'
import { getCityTrips, getCityVisits } from '@/lib/derive'
import { resolveCity, resolveCities } from '@/lib/cities'
import {
  photoObjectPosition,
  photoOriginalUrl,
  photoVariantUrl,
} from '@/lib/photoUrls'
import { useLayerReturn } from '@/components/motion/useLayerReturn'
import Lightbox from '@/components/common/Lightbox'

interface Props {
  data: TravelData
  cityId: string
  activeVisitId?: string
  selection: Selection
  onSelectVisit: (visitId: string, cityId: string) => void
  onSelectTrip: (tripId: string) => void
  onOpenMemory: (source: MemorySource, photoIndex: number) => void
  onClose: () => void
}

const date = (value: string) => value.replaceAll('-', '.')

export default function PlaceChapter({
  data,
  cityId,
  activeVisitId,
  selection,
  onSelectVisit,
  onSelectTrip,
  onOpenMemory,
  onClose,
}: Props) {
  const { returning, requestClose } = useLayerReturn(onClose)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const city = resolveCity(data, cityId)
  const cities = useMemo(() => resolveCities(data), [data])
  const visits = useMemo(() => getCityVisits(data, cityId), [data, cityId])
  const trips = useMemo(() => getCityTrips(data, cityId), [data, cityId])
  const active = visits.find((visit) => visit.id === activeVisitId) ?? visits.at(-1)
  const hero = active?.photos.find((photo) => photo.featured) ?? active?.photos[0]
  const auxiliaries = active?.photos.filter((photo) => photo !== hero).slice(0, 4) ?? []
  const selectedTripId = selection.kind === 'trip' ? selection.tripId : null
  const heroIndex = active && hero ? active.photos.indexOf(hero) : 0
  const lightboxPhotos = active?.photos.map((photo) => ({
    url: photoOriginalUrl(active.id, photo.file),
    caption: photo.caption,
    meta: `${date(active.arriveDate)} · ${city?.name ?? cityId}`,
  })) ?? []

  useEffect(() => {
    setLightboxIndex(null)
  }, [active?.id])

  if (!city) return null

  return (
    <aside
      aria-label={`${city.name}地点篇章`}
      data-returning={returning}
      className="rg-place-chapter rg-layer rg-card-in pointer-events-auto flex max-h-[min(calc(100svh-12rem),720px)] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(8,11,22,.84)] shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3.5">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-amber-100/45">PLACE CHAPTER</p>
          <h2 className="mt-1 font-serif text-2xl text-white">{city.name}</h2>
          <p className="text-[11px] tracking-wide text-white/42">
            {city.province} · {city.country}
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭地点篇章"
          onClick={requestClose}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/12 text-white/60 transition hover:border-white/24 hover:bg-white/8 hover:text-white"
        >
          ×
        </button>
      </header>

      <div className="rg-scroll flex-1 overflow-y-auto px-4 py-3">
        {visits.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5" aria-label="到访日期">
            {visits.map((visit) => (
              <button
                key={visit.id}
                type="button"
                aria-pressed={visit.id === active?.id}
                onClick={() => onSelectVisit(visit.id, cityId)}
                className={`cursor-pointer rounded-full border px-2.5 py-1.5 font-mono text-[10px] transition ${
                  visit.id === active?.id
                    ? 'border-amber-200/35 bg-amber-200/10 text-amber-50'
                    : 'border-white/9 text-white/42 hover:text-white/70'
                }`}
              >
                {date(visit.arriveDate)}
              </button>
            ))}
          </div>
        )}

        {active && (
          <>
            <p className="font-mono text-[10px] tracking-[0.14em] text-white/45">
              {date(active.arriveDate)} — {date(active.leaveDate)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {active.note ?? '这一天，在这里停留。'}
            </p>

            {hero ? (
              <div className="mt-3 grid h-44 grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-xl">
                <button
                  type="button"
                  aria-label={`查看照片：${hero.caption || hero.file}`}
                  onClick={() => setLightboxIndex(heroIndex)}
                  className="rg-photo-reveal col-span-2 row-span-2 overflow-hidden"
                >
                  <img
                    src={photoVariantUrl(active.id, hero.file, 'md')}
                    alt={hero.caption || `${city.name}主图`}
                    style={{ objectPosition: photoObjectPosition(hero.focalPoint) }}
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.025]"
                  />
                </button>
                {auxiliaries.map((photo, index) => (
                  <button
                    key={photo.file}
                    type="button"
                    aria-label={`查看照片：${photo.caption || photo.file}`}
                    onClick={() => setLightboxIndex(active.photos.indexOf(photo))}
                    className="rg-photo-reveal overflow-hidden"
                    style={{ '--rg-index': index + 1 } as CSSProperties}
                  >
                    <img
                      src={photoVariantUrl(active.id, photo.file, 'md')}
                      alt={photo.caption ?? ''}
                      loading="lazy"
                      style={{ objectPosition: photoObjectPosition(photo.focalPoint) }}
                      className="h-full w-full object-cover transition duration-500 hover:scale-[1.025]"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid h-32 place-items-center rounded-xl border border-white/8 bg-white/[.025] font-serif text-3xl text-white/25">
                {city.name.slice(0, 1)}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.12em] text-white/35">
                {active.photos.length} 张照片
              </span>
              <button
                type="button"
                disabled={active.photos.length === 0}
                onClick={() => onOpenMemory({ kind: 'visit', visitId: active.id }, 0)}
                className="cursor-pointer rounded-xl border border-cyan-200/22 bg-cyan-200/8 px-4 py-2 text-xs text-cyan-50 transition hover:border-cyan-200/40 hover:bg-cyan-200/14 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {active.photos.length === 0 ? '暂无照片' : '进入照片回忆'}
              </button>
            </div>
          </>
        )}

        {trips.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-[10px] tracking-[0.2em] text-white/35">相关交通</h3>
            <div className="space-y-1.5">
              {trips.map((trip) => {
                const route = [trip.from, ...trip.waypoints, trip.to]
                  .map((id) => cities.get(id)?.name ?? id)
                  .join(' → ')
                return (
                  <button
                    key={trip.id}
                    type="button"
                    aria-pressed={trip.id === selectedTripId}
                    onClick={() => onSelectTrip(trip.id)}
                    className={`block w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition ${
                      trip.id === selectedTripId
                        ? 'border-cyan-200/35 bg-cyan-200/8 text-cyan-50'
                        : 'border-white/8 bg-white/[.025] text-white/58 hover:bg-white/[.06]'
                    }`}
                  >
                    <span className="font-mono text-[9px] text-white/35">
                      {date(trip.date)}
                    </span>
                    <span className="mt-0.5 block">{route}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
      {lightboxIndex !== null && lightboxPhotos.length > 0 && (
        <Lightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </aside>
  )
}
