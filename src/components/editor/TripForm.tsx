import { useEffect, useMemo, useState } from 'react'
import type { City, Journey, TravelData } from '@/types'
import type { CompleteTripDraft, TripDraft } from '@/lib/editorModel'
import type { ValidationIssue } from '@/lib/validate'
import { getTransportMode } from '@/lib/transportModes'
import CityCombobox from '@/components/editor/CityCombobox'
import TransportTypePicker from '@/components/editor/TransportTypePicker'
import WaypointEditor from '@/components/editor/WaypointEditor'
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
  const selectedWaypoints = waypoints.filter((city): city is City => city !== null)
  const routeIds = [
    form.from?.id,
    ...selectedWaypoints.map((city) => city.id),
    form.to?.id,
  ].filter((id): id is string => Boolean(id))
  const routeUnique = new Set(routeIds).size === routeIds.length
  const canSave = form.from !== null
    && form.to !== null
    && form.from.id !== form.to.id
    && form.date !== ''
    && routeUnique

  const changeType = (type: TripDraft['type']) => {
    setForm((current) => ({ ...current, type }))
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.from || !form.to) return
    onSubmit({
      ...form,
      from: form.from,
      to: form.to,
      waypoints: selectedWaypoints,
    })
  }

  const mode = getTransportMode(form.type)

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
        <TransportTypePicker value={form.type} onChange={changeType} />
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

      <WaypointEditor
        data={data}
        from={form.from}
        to={form.to}
        value={waypoints}
        onChange={(next) => {
          setWaypoints(next)
          setForm((current) => ({
            ...current,
            waypoints: next.filter((city): city is City => city !== null),
          }))
        }}
      />

      <EditorField id="trip-note" label="交通备注" hint={mode.noteHint}>
        <input
          id="trip-note"
          type="text"
          maxLength={60}
          value={form.note}
          placeholder={mode.notePlaceholder}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          className={editorInputClass}
        />
      </EditorField>

      {form.from && form.to && form.from.id === form.to.id && (
        <p className="text-[11px] text-amber-100/72">出发与到达不能是同一座城市。</p>
      )}
      {!routeUnique && (
        <p className="text-[11px] text-amber-100/72">
          经停城市不能与出发、到达或其他经停城市重复。
        </p>
      )}
      <EditorErrors issues={errors} />
      <EditorFormActions saveLabel="保存行程" disabled={!canSave} onCancel={onCancel} />
    </form>
  )
}
