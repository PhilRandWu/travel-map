import { useMemo, useState, type ReactNode } from 'react'
import type { Selection, TravelData } from '@/types'
import { resolveCities } from '@/lib/cities'
import { getCityTrips, getCityVisits, photoUrl } from '@/lib/derive'
import Lightbox, { type LightboxPhoto } from '@/components/common/Lightbox'

interface Props {
  data: TravelData
  cityId: string
  selection: Selection
  /** 卡片内点击关联行程 → Selection 切到 trip */
  onSelectTrip: (tripId: string) => void
  onClose: () => void
}

const fmtDate = (d: string) => d.replaceAll('-', '.')
const fmtRange = (a: string, b: string) =>
  a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`

/**
 * 城市卡片（PRD 3.1）：
 * 城市名 / 首末到访 / 到访次数 / 按次分组的到访记录与照片 / 关联行程。
 * 玻璃拟态，悬浮于地球左侧，不遮挡主视区。
 */
export default function CityCard({
  data,
  cityId,
  selection,
  onSelectTrip,
  onClose,
}: Props) {
  const cities = useMemo(() => resolveCities(data), [data])
  const city = cities.get(cityId)
  const visits = useMemo(() => getCityVisits(data, cityId), [data, cityId])
  const trips = useMemo(() => getCityTrips(data, cityId), [data, cityId])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { photos, offsets } = useMemo(() => {
    const photos: LightboxPhoto[] = []
    const offsets = new Map<string, number>()
    for (const v of visits) {
      offsets.set(v.id, photos.length)
      for (const p of v.photos) {
        photos.push({
          url: photoUrl(v.id, p.file),
          caption: p.caption,
          meta: `${fmtRange(v.arriveDate, v.leaveDate)} · ${city?.name ?? ''}`,
        })
      }
    }
    return { photos, offsets }
  }, [visits, city])

  if (!city) return null

  const firstDate = visits[0]?.arriveDate
  const lastDate = visits[visits.length - 1]?.leaveDate
  const selectedTripId = selection.kind === 'trip' ? selection.tripId : null

  return (
    <>
      <aside className="rg-card-in pointer-events-auto flex max-h-[min(74vh,660px)] w-[344px] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(8,11,22,.78)] shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3.5">
          <div>
            <h2 className="text-lg font-semibold tracking-[0.06em] text-white">
              {city.name}
            </h2>
            <p className="mt-0.5 text-[11px] tracking-wide text-white/45">
              {city.province} · {city.country}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭城市卡片"
            onClick={onClose}
            className="mt-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/5 text-sm text-white/60 transition hover:bg-white/15 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* 概要 */}
        <div className="grid grid-cols-3 gap-1 border-b border-white/8 px-4 py-3 text-center">
          <Stat value={`${visits.length}`} label="到访次数" accent />
          <Stat value={firstDate ? fmtDate(firstDate) : '—'} label="首次到访" />
          <Stat value={lastDate ? fmtDate(lastDate) : '—'} label="最近到访" />
        </div>

        <div className="rg-scroll flex-1 overflow-y-auto px-4 py-3">
          {/* 到访记录 */}
          <SectionTitle>到访记录</SectionTitle>
          <div className="space-y-2">
            {visits.map((v, i) => {
              const offset = offsets.get(v.id) ?? 0
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-white/8 bg-white/[.03] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs tracking-wide text-white/75">
                      {fmtRange(v.arriveDate, v.leaveDate)}
                    </span>
                    {visits.length > 1 && (
                      <span className="text-[10px] tracking-wider text-white/35">
                        第 {i + 1} 次
                      </span>
                    )}
                  </div>
                  {v.note && (
                    <p className="mt-1 text-xs leading-relaxed text-white/50">{v.note}</p>
                  )}
                  {v.photos.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {v.photos.map((p, pi) => (
                        <button
                          key={p.file}
                          type="button"
                          aria-label={p.caption || `查看照片 ${pi + 1}`}
                          onClick={() => setLightboxIndex(offset + pi)}
                          className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-white/5"
                        >
                          <img
                            src={photoUrl(v.id, p.file)}
                            alt={p.caption || '旅行照片'}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 关联行程 */}
          {trips.length > 0 && (
            <>
              <SectionTitle className="mt-4">相关行程</SectionTitle>
              <div className="space-y-1.5">
                {trips.map((t) => {
                  const route = [t.from, ...t.waypoints, t.to]
                    .map((id) => cities.get(id)?.name ?? id)
                    .join(' → ')
                  const selected = t.id === selectedTripId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTrip(t.id)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                        selected
                          ? 'border-cyan-300/40 bg-cyan-300/10'
                          : 'border-white/8 bg-white/[.03] hover:bg-white/[.07]'
                      }`}
                    >
                      <span className="text-sm" aria-hidden>
                        {t.type === 'flight' ? '✈️' : '🚄'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs tracking-wide text-white/80">
                          <span className="text-white/45">{fmtDate(t.date)}</span>
                          <span className="mx-1.5 text-white/20">·</span>
                          {route}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-white/40">
                          {t.note ?? (t.type === 'flight' ? '飞机' : '高铁')}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div
        className={`text-sm font-semibold tabular-nums ${accent ? 'text-amber-200' : 'text-white/85'}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] tracking-[0.12em] text-white/35">{label}</div>
    </div>
  )
}

function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h3
      className={`mb-2 text-[10px] font-medium tracking-[0.22em] text-white/40 ${className}`}
    >
      {children}
    </h3>
  )
}
