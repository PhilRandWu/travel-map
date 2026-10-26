import { useEffect, useMemo, useState } from 'react'
import type { City, Journey, TravelData } from '@/types'
import type { CompleteTripDraft, TripDraft } from '@/lib/editorModel'
import type { ValidationIssue } from '@/lib/validate'
import CityCombobox from '@/components/editor/CityCombobox'
import {
  EditorErrors,
  EditorField,
  EditorFormActions,
  editorInputClass,
} from '@/components/editor/EditorField'

interface Props {
  data: TravelData
  journey: Journey
  draft: TripDraft
  errors: ValidationIssue[]
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (draft: CompleteTripDraft) => void
  onCancel: () => void
}

export default function TripForm({
  data,
  journey,
  draft,
  errors,
  onDirtyChange,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<TripDraft>(draft)
  const [waypoints, setWaypoints] = useState<Array<City | null>>(draft.waypoints)
  const dirty = useMemo(() => (
    JSON.stringify({ form, waypoints })
      !== JSON.stringify({ form: draft, waypoints: draft.waypoints })
  ), [draft, form, waypoints])
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  const canSave = form.from !== null
    && form.to !== null
    && form.from.id !== form.to.id
    && form.date !== ''

  const changeType = (type: TripDraft['type']) => {
    setForm({ ...form, type, waypoints: [] })
    setWaypoints([])
  }

  const updateWaypoint = (index: number, city: City | null) => {
    const next = waypoints.map((item, itemIndex) => (itemIndex === index ? city : item))
    setWaypoints(next)
    setForm({
      ...form,
      waypoints: next.filter((item): item is City => item !== null),
    })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.from || !form.to) return
    onSubmit({
      ...form,
      from: form.from,
      to: form.to,
      waypoints: waypoints.filter((city): city is City => city !== null),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-cyan-100/12 bg-cyan-100/[.04] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-100/60">
        {journey.title} · {journey.startDate} 至 {journey.endDate}
        <span className="mt-0.5 block text-white/44">
          日期超出旅程范围时，保存会自动扩展旅程起止日期。
        </span>
      </div>

      <div>
        <p className="mb-2 text-[11px] tracking-[0.12em] text-white/62">交通方式</p>
        <div
          role="group"
          aria-label="交通方式"
          className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[.025] p-1"
        >
          {([
            ['flight', '✈️ 飞机'],
            ['train', '🚄 高铁'],
          ] as const).map(([type, label]) => (
            <button
              key={type}
              type="button"
              aria-pressed={form.type === type}
              onClick={() => changeType(type)}
              className={`min-h-11 cursor-pointer rounded-lg px-3 text-xs transition ${
                form.type === type
                  ? 'bg-cyan-100/10 text-cyan-50'
                  : 'text-white/55 hover:text-white/82'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <EditorField id="trip-date" label="出行日期" hint="必填">
        <input
          id="trip-date"
          type="date"
          required
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
          className={editorInputClass}
        />
      </EditorField>

      <CityCombobox
        data={data}
        label="出发城市"
        autoFocus
        value={form.from}
        onChange={(from) => setForm({ ...form, from })}
      />
      <CityCombobox
        data={data}
        label="到达城市"
        value={form.to}
        onChange={(to) => setForm({ ...form, to })}
      />

      {form.type === 'train' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] tracking-[0.12em] text-white/62">经停城市</p>
            <button
              type="button"
              disabled={waypoints.length >= 4}
              onClick={() => setWaypoints([...waypoints, null])}
              className="min-h-9 cursor-pointer rounded-full border border-white/12 px-3 text-[11px] text-white/60 transition hover:border-white/24 hover:text-white/84 disabled:cursor-not-allowed disabled:opacity-35"
            >
              + 添加经停
            </button>
          </div>
          {waypoints.length === 0 && (
            <p className="rounded-lg border border-white/9 bg-white/[.025] px-3 py-2.5 text-[11px] leading-relaxed text-white/46">
              可留空；高铁会按出发 → 经停 → 到达绘制贴地折线。
            </p>
          )}
          {waypoints.map((waypoint, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <CityCombobox
                  data={data}
                  label={`经停 ${index + 1}`}
                  value={waypoint}
                  onChange={(city) => updateWaypoint(index, city)}
                />
              </div>
              <button
                type="button"
                aria-label={`移除经停 ${index + 1}`}
                onClick={() => {
                  const next = waypoints.filter((_, itemIndex) => itemIndex !== index)
                  setWaypoints(next)
                  setForm({
                    ...form,
                    waypoints: next.filter((city): city is City => city !== null),
                  })
                }}
                className="mt-7 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg text-white/48 transition hover:bg-white/6 hover:text-white/82"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <EditorField id="trip-note" label="交通备注" hint="航班号 / 车次">
        <input
          id="trip-note"
          type="text"
          maxLength={60}
          value={form.note}
          placeholder={form.type === 'flight' ? '例如：CA1234' : '例如：G7558'}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          className={editorInputClass}
        />
      </EditorField>

      {form.from && form.to && form.from.id === form.to.id && (
        <p className="text-[11px] text-amber-100/72">出发与到达不能是同一座城市。</p>
      )}
      <EditorErrors issues={errors} />
      <EditorFormActions saveLabel="保存行程" disabled={!canSave} onCancel={onCancel} />
    </form>
  )
}
