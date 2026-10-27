import { useEffect, useState } from 'react'
import type { Journey, TravelData } from '@/types'
import {
  getJourneyTrips,
  getJourneyVisits,
} from '@/lib/journeys'
import JourneySwitcher from '@/components/editor/JourneySwitcher'

interface Props {
  data: TravelData
  journeys: Journey[]
  journeyId: string
  disabled: boolean
  onChange: (journeyId: string) => void
  onNew: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const actionClass =
  'min-h-10 cursor-pointer rounded-full border px-3 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-35'

export default function EditorJourneyBar({
  data,
  journeys,
  journeyId,
  disabled,
  onChange,
  onNew,
  onEdit,
  onDuplicate,
  onDelete,
}: Props) {
  const hasCurrent = journeys.some((journey) => journey.id === journeyId)
  const current = journeys.find((journey) => journey.id === journeyId)
  const visitCount = current ? getJourneyVisits(data, current.id).length : 0
  const tripCount = current ? getJourneyTrips(data, current.id).length : 0
  const [confirmDelete, setConfirmDelete] = useState(false)
  const actionsDisabled = disabled || !hasCurrent

  useEffect(() => {
    setConfirmDelete(false)
  }, [journeyId])

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] tracking-[0.12em] text-white/62">
          当前旅程
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={onNew}
            className="min-h-10 cursor-pointer rounded-full border border-cyan-100/18 bg-cyan-100/[.055] px-3.5 text-[11px] text-cyan-50/82 transition hover:bg-cyan-100/12 disabled:cursor-not-allowed disabled:opacity-35"
          >
            + 新增旅程
          </button>
        </div>
      </div>

      <JourneySwitcher
        journeys={journeys}
        journeyId={hasCurrent ? journeyId : ''}
        disabled={disabled}
        onChange={onChange}
      />

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={actionsDisabled || confirmDelete}
          onClick={onEdit}
          className={`${actionClass} border-white/12 text-white/62 hover:border-white/24 hover:text-white/88`}
        >
          编辑旅程
        </button>
        <button
          type="button"
          disabled={actionsDisabled || confirmDelete}
          onClick={onDuplicate}
          className={`${actionClass} border-white/12 text-white/62 hover:border-white/24 hover:text-white/88`}
        >
          复制设置
        </button>
        <button
          type="button"
          disabled={actionsDisabled || confirmDelete}
          onClick={() => setConfirmDelete(true)}
          className={`${actionClass} border-red-200/16 text-red-100/58 hover:border-red-200/28 hover:text-red-50/82`}
        >
          删除旅程
        </button>
      </div>

      {confirmDelete && current && (
        <div
          role="alertdialog"
          aria-labelledby="journey-delete-title"
          className="mt-2 rounded-xl border border-red-200/20 bg-red-200/[.045] p-3"
        >
          <p id="journey-delete-title" className="text-xs text-red-50/85">
            删除「{current.title}」？
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">
            将同时移除 {visitCount} 次到访、{tripCount} 段行程及相关照片引用，无法撤销。
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmDelete(false)}
              className="min-h-9 cursor-pointer px-3 text-[11px] text-white/58 hover:text-white/82"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
              className="min-h-9 cursor-pointer rounded-full bg-red-200/12 px-3.5 text-[11px] text-red-50/85 hover:bg-red-200/18"
            >
              确认删除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
