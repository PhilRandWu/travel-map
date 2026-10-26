import { useEffect, useRef, useState } from 'react'
import type { TravelData } from '@/types'
import MotionSettings from '@/components/motion/MotionSettings'
import PhotoGrouping from '@/components/photos/PhotoGrouping'

interface Props {
  data: TravelData
  isArchive: boolean
  focusMode: boolean
  onToggleFocus: () => void
}

export default function WorkspaceToolsMenu({
  data,
  isArchive,
  focusMode,
  onToggleFocus,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="workspace-tools"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 text-[10px] tracking-[0.08em] text-white/52 backdrop-blur-md transition hover:border-white/22 hover:text-white/82"
      >
        <GearIcon />
        <span className="hidden sm:inline">工具</span>
      </button>

      {open && (
        <section
          id="workspace-tools"
          aria-label="桌面工具"
          className="rg-tools-in pointer-events-auto absolute right-0 top-12 z-40 w-64 space-y-3 rounded-2xl border border-white/12 bg-[rgba(5,8,17,.94)] p-3 shadow-[0_22px_80px_rgba(0,0,0,.68)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-white/72">专注模式</p>
              <p className="mt-0.5 text-[9px] text-white/30">隐藏工具栏、护照与章节轴</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={focusMode}
              aria-label="专注模式"
              onClick={() => {
                onToggleFocus()
                setOpen(false)
              }}
              className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition ${
                focusMode
                  ? 'border-cyan-200/35 bg-cyan-200/35'
                  : 'border-white/12 bg-white/8'
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[#f5ead8] transition-transform ${
                  focusMode ? 'translate-x-[1.15rem]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-white/8 pt-3">
            <MotionSettings />
          </div>

          {isArchive && (
            <div className="flex justify-end border-t border-white/8 pt-3">
              <PhotoGrouping data={data} />
            </div>
          )}

          <p className="border-t border-white/8 pt-2 font-mono text-[8px] tracking-[0.08em] text-white/24">
            F 专注 · ⌘K / CTRL K 回忆索引
          </p>
        </section>
      )}
    </div>
  )
}

function GearIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
      <path
        d="M8.7 2.6h2.6l.5 1.7 1.4.8 1.8-.4 1.3 2.3-1.2 1.3v1.6l1.2 1.3-1.3 2.3-1.8-.4-1.4.8-.5 1.7H8.7l-.5-1.7-1.4-.8-1.8.4L3.7 11l1.2-1.3V8.1L3.7 6.8l1.3-2.3 1.8.4 1.4-.8.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
