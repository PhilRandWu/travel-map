import type { MemoryMode, MemoryView } from '@/types'
import type { MemoryCollection } from '@/lib/memory'
import { memoryDateRange, memoryRoute } from '@/lib/memoryPresentation'

interface Props {
  collection: MemoryCollection
  mode: MemoryMode
  view: MemoryView
  hasFeatured: boolean
  index: number
  total: number
  onMode: (mode: MemoryMode) => void
  onView: (view: MemoryView) => void
  onClose: () => void
}

export default function MemoryToolbar({
  collection,
  mode,
  view,
  hasFeatured,
  index,
  total,
  onMode,
  onView,
  onClose,
}: Props) {
  const featuredCount = collection.photos.filter((photo) => photo.featured).length
  const route = memoryRoute(collection.chapters)
  const dateRange = memoryDateRange(collection.chapters)

  return (
    <header className="rg-memory-toolbar relative z-30 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-8 px-7 py-4 text-[var(--rg-memory-paper)]">
      <div className="flex min-w-0 items-center gap-4">
        <span aria-hidden className="rg-memory-monogram">
          <span>旅</span>
          <i />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.22em] text-[var(--rg-memory-muted)]">
            <span>{dateRange}</span>
            <span aria-hidden className="h-px w-8 bg-[var(--rg-memory-line)]" />
            <span className="truncate">{route || 'PRIVATE ARCHIVE'}</span>
          </div>
          <h1 className="mt-1 truncate font-serif text-[clamp(1.35rem,2vw,2rem)] tracking-[0.08em] text-[var(--rg-memory-paper)]">
            {view === 'stage' ? '回忆放映室' : '旅行记忆图谱'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {hasFeatured && (
          <div aria-label="照片范围" className="rg-memory-switch">
            <span className="rg-memory-switch-label">CURATION</span>
            <button
              type="button"
              aria-pressed={mode === 'featured'}
              onClick={() => onMode('featured')}
              className="rg-memory-switch-button cursor-pointer"
            >
              精选
              <span>{String(featuredCount).padStart(2, '0')}</span>
            </button>
            <button
              type="button"
              aria-pressed={mode === 'all'}
              onClick={() => onMode('all')}
              className="rg-memory-switch-button cursor-pointer"
            >
              全部
              <span>{String(collection.photos.length).padStart(2, '0')}</span>
            </button>
          </div>
        )}

        <nav aria-label="回忆视图" className="rg-memory-view-switch">
          <button
            type="button"
            aria-pressed={view === 'stage'}
            onClick={() => onView('stage')}
            className="rg-memory-view-button cursor-pointer"
          >
            <span>01</span>
            逐张回忆
          </button>
          <button
            type="button"
            aria-pressed={view === 'constellation'}
            onClick={() => onView('constellation')}
            className="rg-memory-view-button cursor-pointer"
          >
            <span>02</span>
            回忆星图
          </button>
        </nav>

        <div className="hidden min-w-16 text-right xl:block">
          <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--rg-memory-muted)]">
            FRAME
          </p>
          <p className="mt-0.5 font-serif text-lg tabular-nums text-[var(--rg-memory-paper)]">
            {String(Math.min(index + 1, total)).padStart(2, '0')}
            <span className="text-[var(--rg-memory-muted)]"> / {String(total).padStart(2, '0')}</span>
          </p>
        </div>

        <button
          type="button"
          aria-label="关闭照片回忆"
          onClick={onClose}
          className="rg-memory-close cursor-pointer"
        >
          <span>ESC</span>
          <i aria-hidden />
          <b>关闭</b>
        </button>
      </div>
    </header>
  )
}
