import { useState } from 'react'
import type { Selection, TravelData } from '@/types'
import { findTrip, findVisit, photoThumbUrl } from '@/lib/derive'
import { resolveCities } from '@/lib/cities'

interface Props {
  data: TravelData
  selection: Selection
  onExpand: () => void
}

const fmtDate = (date: string) => date.replaceAll('-', '.')
const fmtRange = (from: string, to: string) =>
  from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`

/**
 * 顶部主图区（T4.3）：玻璃卡片展示当前选中节点的代表照片、日期与一句备注。
 */
export default function HeroPhoto({ data, selection, onExpand }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const cities = resolveCities(data)

  let content: {
    title: string
    meta: string
    note?: string
    photo?: { url: string; alt?: string; motionKey: string }
  } | null = null

  if (selection.kind === 'visit') {
    const visit = findVisit(data, selection.visitId)
    const city = visit ? cities.get(visit.city) : undefined
    const photo = visit?.photos[0]
    if (visit) {
      content = {
        title: city?.name ?? visit.city,
        meta: fmtRange(visit.arriveDate, visit.leaveDate),
        note: visit.note,
        photo: photo
          ? {
              url: photoThumbUrl(visit.id, photo.file),
              alt: photo.caption || city?.name,
              motionKey: `visit:${visit.id}:${photo.file}`,
            }
          : undefined,
      }
    }
  } else if (selection.kind === 'trip') {
    const trip = findTrip(data, selection.tripId)
    if (trip) {
      const route = [trip.from, ...trip.waypoints, trip.to]
        .map((id) => cities.get(id)?.name ?? id)
        .join(' → ')
      const departCity = cities.get(trip.from)
      const arriveVisit = data.visits.find(
        (visit) => visit.city === trip.to && visit.arriveDate >= trip.date,
      )
      const visitPhoto = arriveVisit?.photos[0]
      content = {
        title: route,
        meta: `${fmtDate(trip.date)} · ${trip.type === 'flight' ? '飞机' : '高铁'}`,
        note: trip.note || arriveVisit?.note,
        photo: visitPhoto
          ? {
              url: photoThumbUrl(arriveVisit.id, visitPhoto.file),
              alt: visitPhoto.caption || departCity?.name,
              motionKey: `trip:${trip.id}:${arriveVisit.id}:${visitPhoto.file}`,
            }
          : undefined,
      }
    }
  }

  if (!content) {
    return (
      <div className="pointer-events-auto max-w-80 rounded-xl border border-white/10 bg-[rgba(5,8,17,.68)] px-5 py-4 text-right shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.24em] text-white/38">开始旅程</p>
        <p className="mt-1 text-sm leading-relaxed text-white/72">
          点击时间轴或地球轨迹，查看这段旅行
        </p>
      </div>
    )
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="展开主图区"
        className="pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/12 bg-[rgba(5,8,17,.72)] text-xs text-white/60 backdrop-blur-xl transition hover:border-white/25 hover:text-white"
      >
        ◐
      </button>
    )
  }

  return (
    <div className="rg-hero-in pointer-events-auto w-[302px] overflow-hidden rounded-xl border border-white/12 bg-[rgba(5,8,17,.74)] shadow-[0_20px_70px_rgba(0,0,0,.5)] backdrop-blur-xl">
      <div className="relative">
        {content.photo ? (
          <img
            key={content.photo.motionKey}
            src={content.photo.url}
            alt={content.photo.alt ?? ''}
            className="rg-ken-burns h-[132px] w-full object-cover"
          />
        ) : (
          <div className="flex h-[132px] w-full items-center justify-center bg-gradient-to-br from-[#101a2e] via-[#08101f] to-[#1d2a41] text-2xl text-white/35">
            <span aria-hidden>✈</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,6,13,.94)] via-[rgba(3,6,13,.18)] to-transparent" />
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="收起主图区"
          className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-black/50 text-xs text-white/65 backdrop-blur-md transition hover:bg-white/12 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="px-4 pb-3 pt-2">
        <time className="block font-mono text-[10px] tracking-[0.18em] text-amber-200/70">
          {content.meta}
        </time>
        <h2 className="mt-1 truncate text-sm font-semibold tracking-wide text-white">
          {content.title}
        </h2>
        {content.note && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/52">
            {content.note}
          </p>
        )}
        <button
          type="button"
          onClick={onExpand}
          className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-[10px] tracking-[0.16em] text-cyan-200/70 transition hover:text-cyan-100"
        >
          回到总览 →
        </button>
      </div>
    </div>
  )
}
