import { useRef, useState } from 'react'
import type { TravelData } from '@/types'
import type { ValidationIssue } from '@/lib/validate'
import {
  downloadTravelData,
  parseTravelDataText,
  readTravelDataFile,
} from '@/lib/travelTransfer'
import { formatSavedAt } from '@/lib/travelStorage'
import { EditorErrors } from '@/components/editor/EditorField'

interface Props {
  data: TravelData
  storageError: string | null
  lastSavedAt?: string | null
  onChange: (data: TravelData) => void
}

interface PendingImport {
  data: TravelData
  fileName: string
}

export default function DataArchivePanel({
  data,
  storageError,
  lastSavedAt = null,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [status, setStatus] = useState<string | null>(null)

  const exportData = () => {
    const fileName = downloadTravelData(data)
    setStatus(`已导出 ${fileName}`)
  }

  const readImport = async (file: File | undefined) => {
    if (!file) return
    setStatus(null)
    setIssues([])
    setPending(null)

    try {
      const parsed = parseTravelDataText(await readTravelDataFile(file))
      setIssues(parsed.issues)
      if (parsed.data) setPending({ data: parsed.data, fileName: file.name })
    } catch (error) {
      setIssues([{
        level: 'error',
        subject: 'import',
        message: `无法读取文件：${(error as Error).message}`,
      }])
    }
  }

  const confirmImport = () => {
    if (!pending) return
    onChange(pending.data)
    setStatus(`已导入 ${pending.fileName}`)
    setPending(null)
    setIssues([])
  }

  return (
    <section className="mt-6 rounded-xl border border-white/9 bg-white/[.025] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] text-white/62">数据存档</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/48">
            提交修改后自动保存到当前浏览器；JSON 仅备份旅行数据。
          </p>
          <p className="mt-1 font-mono text-[10px] text-emerald-100/68">
            {storageError
              ? '自动保存失败'
              : lastSavedAt
                ? `已保存 ${formatSavedAt(lastSavedAt)}`
                : '尚未保存到本机'}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200/16 bg-emerald-200/[.06] px-2 py-1 text-[10px] tracking-[0.08em] text-emerald-100/66">
          LOCAL
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={exportData}
          className="min-h-10 cursor-pointer rounded-full border border-white/12 px-3.5 text-[11px] text-white/66 transition hover:border-white/24 hover:text-white/90"
        >
          导出 JSON
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-10 cursor-pointer rounded-full border border-cyan-100/18 bg-cyan-100/[.055] px-3.5 text-[11px] text-cyan-50/82 transition hover:bg-cyan-100/12"
        >
          导入 JSON
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          aria-label="导入旅行 JSON"
          className="sr-only"
          onChange={(event) => {
            void readImport(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      {storageError && (
        <p role="alert" className="mt-3 rounded-lg border border-amber-200/18 bg-amber-200/[.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/74">
          {storageError}
        </p>
      )}

      {issues.length > 0 && (
        <div className="mt-3">
          <EditorErrors issues={issues} />
        </div>
      )}

      {pending && (
        <div className="mt-3 rounded-lg border border-amber-100/14 bg-amber-100/[.035] p-3">
          <p className="text-[11px] leading-relaxed text-amber-50/78">
            用「{pending.fileName}」覆盖当前 {data.journeys.length} 段旅程、
            {data.visits.length} 次到访与 {data.trips.length} 段行程？
          </p>
          <p className="mt-1 text-[10px] text-white/50">
            照片本体保存在浏览器照片库中，不会写进 JSON。
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="min-h-9 cursor-pointer px-3 text-[11px] text-white/55 hover:text-white/82"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirmImport}
              className="min-h-9 cursor-pointer rounded-full bg-amber-100/12 px-3.5 text-[11px] text-amber-50/88"
            >
              确认导入
            </button>
          </div>
        </div>
      )}

      {status && (
        <p role="status" className="mt-3 text-[11px] text-emerald-100/70">
          {status}
        </p>
      )}
    </section>
  )
}
