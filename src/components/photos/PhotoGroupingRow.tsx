import type { PendingPhoto } from '@/components/photos/usePhotoGrouping'

export interface VisitOption {
  id: string
  label: string
}

interface Props {
  row: PendingPhoto
  visits: VisitOption[]
  finalFileName?: string
  onChangeVisit: (visitId: string) => void
  onToggle: () => void
  onRemove: () => void
}

const CONFIDENCE_STYLE = {
  exact: 'border-emerald-300/20 bg-emerald-300/8 text-emerald-200/80',
  near: 'border-amber-300/22 bg-amber-300/8 text-amber-200/80',
  none: 'border-white/10 bg-white/4 text-white/35',
} as const

const CONFIDENCE_LABEL = {
  exact: '日期匹配',
  near: '相差 1 天',
  none: '未匹配',
} as const

export default function PhotoGroupingRow({
  row,
  visits,
  finalFileName,
  onChangeVisit,
  onToggle,
  onRemove,
}: Props) {
  const targetPath = finalFileName && row.targetVisitId
    ? `public/photos/${row.targetVisitId}/${finalFileName}`
    : null

  return (
    <div
      data-photo-row
      className={`grid gap-2 rounded-xl border px-3 py-2.5 transition ${
        row.included
          ? 'border-cyan-200/12 bg-cyan-200/[0.035]'
          : 'border-white/7 bg-black/12 opacity-70'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <input
          type="checkbox"
          checked={row.included}
          disabled={!row.targetVisitId}
          onChange={onToggle}
          aria-label={`导出 ${row.file.name}`}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-300"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[11px] font-medium text-white/78" title={row.sourcePath}>
              {row.file.name}
            </p>
            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] tracking-wide ${CONFIDENCE_STYLE[row.match.confidence]}`}>
              {CONFIDENCE_LABEL[row.match.confidence]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] text-white/35">
            <time>
              {row.capturedAt
                ? row.capturedAt.replace('T', ' ').slice(0, 19)
                : '无拍摄日期'}
            </time>
            {row.sourcePath !== row.file.name && (
              <span className="max-w-60 truncate" title={row.sourcePath}>
                {row.sourcePath}
              </span>
            )}
            <span>{row.match.reason}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`移除 ${row.file.name}`}
          className="shrink-0 cursor-pointer rounded px-1 text-xs text-white/25 transition hover:bg-white/8 hover:text-white/70"
        >
          ×
        </button>
      </div>

      <div className="pl-6">
        <div className="flex items-center gap-2">
          <select
            value={row.targetVisitId}
            onChange={(event) => onChangeVisit(event.target.value)}
            aria-label={`${row.file.name} 的目标到访`}
            className="min-w-0 flex-1 cursor-pointer rounded-lg border border-white/10 bg-[#0a1020] px-2 py-1.5 text-[10px] text-white/65 transition focus:border-cyan-200/35"
          >
            <option value="">不归组</option>
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.label}
              </option>
            ))}
          </select>
          {targetPath && (
            <code
              className="hidden max-w-[44%] truncate rounded-md bg-black/24 px-2 py-1 text-[8px] text-cyan-100/45 lg:block"
              title={targetPath}
            >
              {targetPath}
            </code>
          )}
        </div>
        {targetPath && (
          <code className="mt-1 block truncate text-[8px] text-cyan-100/35 lg:hidden">
            {targetPath}
          </code>
        )}
      </div>
    </div>
  )
}
