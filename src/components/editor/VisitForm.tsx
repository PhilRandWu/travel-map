import { useEffect, useMemo, useState } from 'react'
import type { Journey, TravelData } from '@/types'
import type { CompleteVisitDraft, VisitDraft } from '@/lib/editorModel'
import type { ValidationIssue } from '@/lib/validate'
import CityCombobox from '@/components/editor/CityCombobox'
import {
  EditorErrors,
  EditorField,
  EditorFormActions,
  editorInputClass,
} from '@/components/editor/EditorField'
import PhotoDropzone from '@/components/editor/PhotoDropzone'

interface Props {
  data: TravelData
  journey: Journey
  draft: VisitDraft
  errors: ValidationIssue[]
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (draft: CompleteVisitDraft) => void
  onCancel: () => void
}

export default function VisitForm({
  data,
  journey,
  draft,
  errors,
  onDirtyChange,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<VisitDraft>(draft)
  const [photosBusy, setPhotosBusy] = useState(false)
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(draft),
    [draft, form],
  )
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  const canSave = form.city !== null
    && form.arriveDate !== ''
    && form.leaveDate !== ''
    && form.arriveDate <= form.leaveDate
    && !photosBusy

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.city) return
    onSubmit({ ...form, city: form.city })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-cyan-100/12 bg-cyan-100/[.04] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-100/60">
        {journey.title} · {journey.startDate} 至 {journey.endDate}
        <span className="mt-0.5 block text-white/44">
          日期超出旅程范围时，保存会自动扩展旅程起止日期。
        </span>
      </div>

      <CityCombobox
        data={data}
        label="到访城市"
        hint="必填"
        autoFocus
        value={form.city}
        excludeCityIds={[data.meta.homeCity]}
        onChange={(city) => setForm({ ...form, city })}
      />

      <div className="grid grid-cols-2 gap-3">
        <EditorField id="visit-arrive" label="到达日期">
          <input
            id="visit-arrive"
            type="date"
            required
            value={form.arriveDate}
            onChange={(event) => setForm({ ...form, arriveDate: event.target.value })}
            className={editorInputClass}
          />
        </EditorField>
        <EditorField id="visit-leave" label="离开日期">
          <input
            id="visit-leave"
            type="date"
            required
            min={form.arriveDate}
            value={form.leaveDate}
            onChange={(event) => setForm({ ...form, leaveDate: event.target.value })}
            className={editorInputClass}
          />
        </EditorField>
      </div>

      <EditorField id="visit-note" label="到访备注" hint="可选">
        <textarea
          id="visit-note"
          rows={2}
          maxLength={120}
          value={form.note}
          placeholder="例如：五一西湖行"
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          className={`${editorInputClass} resize-none`}
        />
      </EditorField>

      <EditorField label="照片" hint={`${form.photos.length} 张`}>
        <PhotoDropzone
          visitId={form.id}
          photos={form.photos}
          onChange={(photos) => setForm({ ...form, photos })}
          onBusyChange={setPhotosBusy}
        />
      </EditorField>

      {!form.city && (
        <p className="text-[11px] leading-relaxed text-amber-100/68">
          先选择城市；若城市尚未收录，可在搜索结果中新建并填写经纬度。
        </p>
      )}
      <EditorErrors issues={errors} />
      <EditorFormActions saveLabel="保存到访" disabled={!canSave} onCancel={onCancel} />
    </form>
  )
}
