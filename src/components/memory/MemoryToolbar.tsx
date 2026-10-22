import type { MemoryMode, MemoryView } from '@/types'

interface Props {
  mode: MemoryMode
  view: MemoryView
  hasFeatured: boolean
  onMode: (mode: MemoryMode) => void
  onView: (view: MemoryView) => void
  onClose: () => void
}

export default function MemoryToolbar({
  mode,
  view,
  hasFeatured,
  onMode,
  onView,
  onClose,
}: Props) {
  return (
    <header className="rg-memory-toolbar flex items-center justify-between gap-3 px-5 py-4 text-[#f5ead8]">
      <div className="flex flex-wrap items-center gap-1.5">
        {hasFeatured && (
          <div className="flex items-center gap-1 rounded-full border border-white/12 bg-white/[.035] p-0.5">
            <button
              type="button"
              aria-pressed={mode === 'featured'}
              onClick={() => onMode('featured')}
              className="rg-memory-chip cursor-pointer rounded-full px-3 py-1.5 text-xs"
            >
              精选
            </button>
            <button
              type="button"
              aria-pressed={mode === 'all'}
              onClick={() => onMode('all')}
              className="rg-memory-chip cursor-pointer rounded-full px-3 py-1.5 text-xs"
            >
              全部
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-full border border-white/12 bg-white/[.035] p-0.5">
          <button
            type="button"
            aria-pressed={view === 'stage'}
            onClick={() => onView('stage')}
            className="rg-memory-chip cursor-pointer rounded-full px-3 py-1.5 text-xs"
          >
            逐张回忆
          </button>
          <button
            type="button"
            aria-pressed={view === 'constellation'}
            onClick={() => onView('constellation')}
            className="rg-memory-chip cursor-pointer rounded-full px-3 py-1.5 text-xs"
          >
            回忆星图
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="关闭照片回忆"
        onClick={onClose}
        className="cursor-pointer rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/25 hover:text-white"
      >
        关闭
      </button>
    </header>
  )
}
