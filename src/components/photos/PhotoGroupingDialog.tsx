import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type InputHTMLAttributes,
} from 'react'
import PhotoGroupingRow, {
  type VisitOption,
} from '@/components/photos/PhotoGroupingRow'
import { usePhotoGrouping } from '@/components/photos/usePhotoGrouping'
import { resolveCities } from '@/lib/cities'
import { buildPhotoExport } from '@/lib/exifGrouping'
import {
  collectDroppedPhotos,
  collectSelectedPhotos,
} from '@/lib/photoFiles'
import type { TravelData } from '@/types'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  data: TravelData
  onClose: () => void
}

const directoryInputProps = {
  webkitdirectory: '',
  directory: '',
} as InputHTMLAttributes<HTMLInputElement>

export default function PhotoGroupingDialog({ data, onClose }: Props) {
  const photos = usePhotoGrouping(data)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const [dragging, setDragging] = useState(false)
  useFocusTrap(dialogRef)

  const visits = useMemo<VisitOption[]>(() => {
    const cityMap = resolveCities(data)
    return [...data.visits]
      .sort((a, b) => a.arriveDate.localeCompare(b.arriveDate))
      .map((visit) => ({
        id: visit.id,
        label: `${cityMap.get(visit.city)?.name ?? visit.city} · ${visit.arriveDate}–${visit.leaveDate}`,
      }))
  }, [data])

  const exportPreview = useMemo(() => buildPhotoExport(
    data,
    photos.includedRows.map((row) => ({
      id: row.id,
      visitId: row.targetVisitId,
      fileName: row.file.name,
      takenAt: row.capturedAt ?? undefined,
    })),
  ), [data, photos.includedRows])
  const finalFiles = useMemo(
    () => new Map(exportPreview.files.map((file) => [file.id, file.fileName])),
    [exportPreview.files],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !photos.scanning) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, photos.scanning])

  const addSelected = async (files: FileList | File[]) => {
    await photos.addPhotos(collectSelectedPhotos(files))
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (photos.scanning) return
    await photos.addPhotos(await collectDroppedPhotos(event.dataTransfer))
  }

  const exportJson = () => {
    if (exportPreview.files.length === 0) return
    const blob = new Blob(
      [JSON.stringify(exportPreview.data, null, 2)],
      { type: 'application/json;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'trips.exif-grouped.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    photos.setNotice(
      `已导出 ${exportPreview.files.length} 张照片的归组数据，请替换 src/data/trips.json`,
    )
  }

  return (
    <div
      data-photo-grouping-dialog
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-grouping-title"
      className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/62 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !photos.scanning) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="rg-card-in flex max-h-[min(90vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,10,20,.94)] shadow-[0_28px_100px_rgba(0,0,0,.72)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[9px] tracking-[0.24em] text-cyan-200/48">EXIF IMPORT</p>
            <h2 id="photo-grouping-title" className="mt-1 text-base font-semibold text-white/86">
              照片自动归组
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-white/38">
              只在本机读取拍摄时间，不上传照片。确认后导出完整 trips.json。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={photos.scanning}
            aria-label="关闭照片归组"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 text-sm text-white/45 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            ×
          </button>
        </header>

        <div className="rg-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div
            data-photo-dropzone
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border border-dashed px-4 py-5 text-center transition ${
              dragging
                ? 'border-cyan-200/55 bg-cyan-200/8'
                : 'border-white/13 bg-black/15'
            }`}
          >
            <p className="text-xs text-white/62">拖入照片或整个文件夹</p>
            <p className="mt-1 text-[9px] text-white/30">
              支持 JPEG、HEIC、PNG、WebP、TIFF 等；无 EXIF 的照片会列为未匹配
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photos.scanning}
                className="cursor-pointer rounded-lg border border-cyan-200/20 bg-cyan-200/8 px-3 py-1.5 text-[10px] text-cyan-100/75 transition hover:bg-cyan-200/13 disabled:cursor-wait disabled:opacity-40"
              >
                选择照片
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={photos.scanning}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[10px] text-white/55 transition hover:bg-white/8 disabled:cursor-wait disabled:opacity-40"
              >
                选择文件夹
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void addSelected(event.target.files)
                event.target.value = ''
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              {...directoryInputProps}
              onChange={(event) => {
                if (event.target.files) void addSelected(event.target.files)
                event.target.value = ''
              }}
            />
          </div>

          {photos.scanning && (
            <div
              role="status"
              aria-live="polite"
              className="mt-3"
            >
              <div className="mb-1 flex justify-between text-[9px] text-white/35">
                <span>正在读取 EXIF</span>
                <span>{Math.round(photos.progress * 100)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="照片 EXIF 读取进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(photos.progress * 100)}
                className="h-1 overflow-hidden rounded-full bg-white/8"
              >
                <div
                  className="h-full rounded-full bg-cyan-300/70 transition-[width]"
                  style={{ width: `${photos.progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {photos.notice && !photos.scanning && (
            <p
              role="status"
              aria-live="polite"
              className="mt-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-[10px] text-white/42"
            >
              {photos.notice}
            </p>
          )}

          {photos.rows.length > 0 ? (
            <div
              data-photo-count={photos.rows.length}
              className="mt-4 space-y-2"
            >
              {photos.rows.map((row) => (
                <PhotoGroupingRow
                  key={row.id}
                  row={row}
                  visits={visits}
                  finalFileName={finalFiles.get(row.id)}
                  onChangeVisit={(visitId) => photos.updateTarget(row.id, visitId)}
                  onToggle={() => photos.toggleIncluded(row.id)}
                  onRemove={() => photos.remove(row.id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 py-6 text-center text-[10px] text-white/25">
              添加照片后，会自动按拍摄日期匹配到访记录
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-5 py-3.5">
          <div className="text-[10px] text-white/38">
            已确认 <span data-export-count className="font-mono text-cyan-100/75">{exportPreview.files.length}</span> 张
            <span className="ml-2 text-white/22">照片文件仍需按目标路径复制</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={photos.clear}
              disabled={photos.rows.length === 0 || photos.scanning}
              className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[10px] text-white/32 transition hover:bg-white/6 hover:text-white/62 disabled:cursor-not-allowed disabled:opacity-25"
            >
              清空列表
            </button>
            <button
              type="button"
              onClick={exportJson}
              disabled={exportPreview.files.length === 0}
              data-export-photos
              className="cursor-pointer rounded-lg border border-cyan-200/28 bg-cyan-300/12 px-3.5 py-1.5 text-[10px] font-medium text-cyan-100 shadow-[0_0_20px_rgba(103,232,249,.1)] transition hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/3 disabled:text-white/22 disabled:shadow-none"
            >
              导出 JSON
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
