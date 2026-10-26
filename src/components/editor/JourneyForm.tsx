import { useEffect, useMemo, useState } from 'react'
import type { JourneyTheme, TravelData } from '@/types'
import type { JourneyDraft } from '@/lib/journeyEditorModel'
import type { ValidationIssue } from '@/lib/validate'
import JourneyCoverPicker from '@/components/editor/JourneyCoverPicker'
import {
  EditorErrors,
  EditorField,
  EditorFormActions,
  editorInputClass,
} from '@/components/editor/EditorField'

interface Props {
  data: TravelData
  draft: JourneyDraft
  errors: ValidationIssue[]
  onDirtyChange: (dirty: boolean) => void
  onSubmit: (draft: JourneyDraft) => void
  onCancel: () => void
}

const THEME_OPTIONS: Array<{
  value: JourneyTheme
  label: string
  color: string
}> = [
  { value: 'amber', label: '琥珀', color: '#f3c579' },
  { value: 'cyan', label: '海雾', color: '#7dd3e8' },
  { value: 'sage', label: '苔绿', color: '#b8d6b2' },
  { value: 'rose', label: '暮粉', color: '#e8b1b8' },
]

export default function JourneyForm({
  data,
  draft,
  errors,
  onDirtyChange,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<JourneyDraft>(draft)
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(draft),
    [draft, form],
  )
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  const datesValid = form.startDate !== ''
    && form.endDate !== ''
    && form.startDate <= form.endDate
  const canSave = form.title.trim() !== '' && datesValid

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    onSubmit(form)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-cyan-100/12 bg-cyan-100/[.04] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-100/60">
        旅程是地图、章节轴与照片回忆的范围边界。
        <span className="mt-0.5 block text-white/44">
          缩短日期后若与已有到访或行程冲突，保存会被阻止并列出冲突记录。
        </span>
      </div>

      <EditorField id="journey-title" label="旅程标题" hint="必填">
        <input
          id="journey-title"
          type="text"
          required
          autoComplete="off"
          maxLength={40}
          value={form.title}
          placeholder="例如：京都秋日…"
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          className={editorInputClass}
        />
      </EditorField>

      <div className="grid grid-cols-2 gap-3">
        <EditorField id="journey-start" label="开始日期">
          <input
            id="journey-start"
            type="date"
            required
            value={form.startDate}
            onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            className={editorInputClass}
          />
        </EditorField>
        <EditorField id="journey-end" label="结束日期">
          <input
            id="journey-end"
            type="date"
            required
            min={form.startDate}
            aria-invalid={!datesValid}
            aria-describedby={!datesValid ? 'journey-date-error' : undefined}
            value={form.endDate}
            onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            className={editorInputClass}
          />
        </EditorField>
      </div>

      {!datesValid && (
        <p id="journey-date-error" role="alert" className="text-[11px] text-amber-100/74">
          结束日期不能早于开始日期。
        </p>
      )}

      <EditorField id="journey-epigraph" label="旅程引言" hint="可选">
        <input
          id="journey-epigraph"
          type="text"
          autoComplete="off"
          maxLength={100}
          value={form.epigraph}
          placeholder="一句能唤起这段旅程的话…"
          onChange={(event) => setForm({ ...form, epigraph: event.target.value })}
          className={editorInputClass}
        />
      </EditorField>

      <EditorField id="journey-summary" label="旅程摘要" hint="可选">
        <textarea
          id="journey-summary"
          rows={3}
          maxLength={240}
          value={form.summary}
          placeholder="路线、同行者或这段旅程想记住的事…"
          onChange={(event) => setForm({ ...form, summary: event.target.value })}
          className={`${editorInputClass} resize-none`}
        />
      </EditorField>

      <fieldset>
        <legend className="mb-2 text-[11px] tracking-[0.12em] text-white/62">
          旅程主题
        </legend>
        <div className="grid grid-cols-4 gap-1.5">
          {THEME_OPTIONS.map((option) => {
            const active = form.theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setForm({ ...form, theme: option.value })}
                data-journey-theme={option.value}
                style={{
                  borderColor: active ? option.color : undefined,
                  color: active ? option.color : undefined,
                }}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-[11px] transition ${
                  active
                    ? 'bg-white/[.08]'
                    : 'border-white/12 bg-white/[.03] text-white/55 hover:border-white/24 hover:text-white/82'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <JourneyCoverPicker
        data={data}
        journeyId={form.id}
        covers={form.coverPhotos}
        onChange={(coverPhotos) => setForm({ ...form, coverPhotos })}
      />

      <EditorErrors issues={errors} />
      <EditorFormActions saveLabel="保存旅程" disabled={!canSave} onCancel={onCancel} />
    </form>
  )
}
