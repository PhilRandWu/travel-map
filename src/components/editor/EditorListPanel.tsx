import type { Journey, TravelData } from '@/types'
import { resolveCity } from '@/lib/cities'
import { getJourneyTrips, getJourneyVisits } from '@/lib/journeys'

export type EditorTab = 'visits' | 'trips'
export type EditorDeleteTarget = { kind: 'visit' | 'trip'; id: string }

interface Props {
  data: TravelData
  journey: Journey
  tab: EditorTab
  deleteTarget: EditorDeleteTarget | null
  onTab: (tab: EditorTab) => void
  onNewVisit: () => void
  onNewTrip: () => void
  onEditVisit: (visitId: string) => void
  onEditTrip: (tripId: string) => void
  onDeleteTarget: (target: EditorDeleteTarget | null) => void
  onConfirmDelete: () => void
}

const formatDate = (date: string) => date.replaceAll('-', '.')

export default function EditorListPanel({
  data,
  journey,
  tab,
  deleteTarget,
  onTab,
  onNewVisit,
  onNewTrip,
  onEditVisit,
  onEditTrip,
  onDeleteTarget,
  onConfirmDelete,
}: Props) {
  const visits = getJourneyVisits(data, journey.id)
  const trips = getJourneyTrips(data, journey.id)

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="编辑内容"
          className="flex gap-1 rounded-full border border-white/9 bg-white/[.025] p-0.5"
        >
          {([
            ['visits', `到访 ${visits.length}`],
            ['trips', `行程 ${trips.length}`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              id={`editor-tab-${value}`}
              role="tab"
              aria-selected={tab === value}
              aria-controls={`editor-panel-${value}`}
              onClick={() => {
                onTab(value)
                onDeleteTarget(null)
              }}
              className={`min-h-10 cursor-pointer rounded-full px-3.5 text-[11px] transition ${
                tab === value
                  ? 'bg-amber-100/10 text-amber-50'
                  : 'text-white/55 hover:text-white/82'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={tab === 'visits' ? onNewVisit : onNewTrip}
          className="min-h-10 cursor-pointer rounded-full border border-cyan-100/20 bg-cyan-100/8 px-3.5 text-[11px] text-cyan-50 transition hover:bg-cyan-100/14"
        >
          + 新增{tab === 'visits' ? '到访' : '行程'}
        </button>
      </div>

      {tab === 'visits' && (
        <div
          id="editor-panel-visits"
          role="tabpanel"
          aria-labelledby="editor-tab-visits"
          className="space-y-2"
        >
          {visits.length === 0 && (
            <p className="rounded-xl border border-white/9 px-4 py-5 text-center text-xs text-white/50">
              还没有到访，点击「新增到访」开始。
            </p>
          )}
          {visits.map((visit) => {
            const city = resolveCity(data, visit.city)
            const deleting = deleteTarget?.kind === 'visit' && deleteTarget.id === visit.id
            return (
              <article key={visit.id} className="rounded-xl border border-white/9 bg-white/[.025] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-base text-white/88">{city?.name ?? visit.city}</h3>
                    <p className="mt-1 font-mono text-[10px] tracking-[0.06em] text-white/50">
                      {formatDate(visit.arriveDate)} - {formatDate(visit.leaveDate)}
                      {' · '}{visit.photos.length} 张照片
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEditVisit(visit.id)}
                      className="min-h-9 cursor-pointer rounded-full px-2.5 text-[11px] text-white/58 hover:bg-white/6 hover:text-white/86"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTarget({ kind: 'visit', id: visit.id })}
                      className="min-h-9 cursor-pointer rounded-full px-2.5 text-[11px] text-white/44 hover:bg-red-300/8 hover:text-red-100/78"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {visit.note && <p className="mt-1.5 text-[11px] leading-relaxed text-white/54">{visit.note}</p>}
                {deleting && (
                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/7 pt-2">
                    <span className="mr-auto text-[10px] text-red-100/58">同时移除旅程封面引用</span>
                    <button type="button" onClick={() => onDeleteTarget(null)} className="min-h-9 cursor-pointer px-2.5 text-[11px] text-white/55">取消</button>
                    <button type="button" onClick={onConfirmDelete} className="min-h-9 cursor-pointer rounded-full bg-red-300/12 px-3 text-[11px] text-red-100/84">确认删除</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {tab === 'trips' && (
        <div
          id="editor-panel-trips"
          role="tabpanel"
          aria-labelledby="editor-tab-trips"
          className="space-y-2"
        >
          {trips.length === 0 && (
            <p className="rounded-xl border border-white/9 px-4 py-5 text-center text-xs text-white/50">
              还没有行程，点击「新增行程」开始。
            </p>
          )}
          {trips.map((trip) => {
            const from = resolveCity(data, trip.from)
            const to = resolveCity(data, trip.to)
            const deleting = deleteTarget?.kind === 'trip' && deleteTarget.id === trip.id
            return (
              <article key={trip.id} className="rounded-xl border border-white/9 bg-white/[.025] px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-base text-white/88">
                      {from?.name ?? trip.from} → {to?.name ?? trip.to}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] tracking-[0.06em] text-white/50">
                      {formatDate(trip.date)} · {trip.type === 'flight' ? '飞机' : '高铁'}
                      {trip.waypoints.length > 0 ? ` · 经停 ${trip.waypoints.length}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEditTrip(trip.id)}
                      className="min-h-9 cursor-pointer rounded-full px-2.5 text-[11px] text-white/58 hover:bg-white/6 hover:text-white/86"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTarget({ kind: 'trip', id: trip.id })}
                      className="min-h-9 cursor-pointer rounded-full px-2.5 text-[11px] text-white/44 hover:bg-red-300/8 hover:text-red-100/78"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {trip.note && <p className="mt-1.5 text-[11px] leading-relaxed text-white/54">{trip.note}</p>}
                {deleting && (
                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/7 pt-2">
                    <button type="button" onClick={() => onDeleteTarget(null)} className="min-h-9 cursor-pointer px-2.5 text-[11px] text-white/55">取消</button>
                    <button type="button" onClick={onConfirmDelete} className="min-h-9 cursor-pointer rounded-full bg-red-300/12 px-3 text-[11px] text-red-100/84">确认删除</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
