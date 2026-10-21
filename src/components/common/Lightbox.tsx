import { useCallback, useEffect, useRef, useState } from 'react'

export interface LightboxPhoto {
  url: string
  caption?: string
  /** 副信息：日期 / 城市 */
  meta?: string
}

interface Props {
  photos: LightboxPhoto[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

/**
 * 照片大图浏览（PRD 3.5）：
 * - 点击遮罩 / Esc 关闭；← → 切换，触屏按钮同理；
 * - 仅挂载时渲染 <img>，即「打开才请求原图」。
 */
export default function Lightbox({ photos, index, onClose, onIndexChange }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [closing, setClosing] = useState(false)
  const photo = photos[index]
  const total = photos.length

  const go = useCallback((delta: number) => {
    if (total <= 1) return
    onIndexChange((index + delta + total) % total)
  }, [index, onIndexChange, total])

  const requestClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    closeTimerRef.current = window.setTimeout(onClose, 180)
  }, [closing, onClose])

  useEffect(() => {
    closeRef.current?.focus()
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go, requestClose])

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || '照片浏览'}
      className={`rg-lightbox fixed inset-0 z-50 flex flex-col items-center justify-center overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-6 ${
        closing ? 'rg-lightbox-out' : ''
      }`}
      onClick={requestClose}
    >
      <div
        className="relative flex max-h-full max-w-5xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={photo.url}
          src={photo.url}
          alt={photo.caption || '旅行照片'}
          width={1200}
          height={800}
          decoding="async"
          className={`rg-lightbox-photo max-h-[76vh] max-w-[86vw] rounded-xl object-contain shadow-[0_20px_80px_rgba(0,0,0,.6)] ${
            closing ? 'rg-lightbox-photo-out' : ''
          }`}
        />

        <div
          aria-live="polite"
          className="mt-4 flex min-h-10 flex-col items-center gap-1 text-center"
        >
          {photo.caption && (
            <p className="text-sm tracking-wide text-white/90">{photo.caption}</p>
          )}
          <p className="text-xs tracking-[0.15em] text-white/45">
            {photo.meta}
            {total > 1 && (
              <span className="ml-3 tabular-nums">
                {index + 1} / {total}
              </span>
            )}
          </p>
        </div>

        <button
          ref={closeRef}
          type="button"
          aria-label="关闭"
          onClick={requestClose}
          className="absolute -right-2 -top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/60 text-lg text-white/75 backdrop-blur-md transition hover:border-white/30 hover:text-white"
        >
          ×
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-black/40 text-xl text-white/70 backdrop-blur-md transition hover:bg-black/65 hover:text-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-black/40 text-xl text-white/70 backdrop-blur-md transition hover:bg-black/65 hover:text-white"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}
