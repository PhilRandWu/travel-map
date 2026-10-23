import { useEffect, useRef, type CSSProperties } from 'react'
import type { MemoryPhoto } from '@/lib/memory'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  photos: MemoryPhoto[]
  index: number
  onIndex: (index: number) => void
}

export default function MemoryFilmstrip({ photos, index, onIndex }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const strip = stripRef.current
    const active = strip?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!strip || !active) return
    const target = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2
    if (typeof strip.scrollTo === 'function') {
      strip.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    } else {
      strip.scrollLeft = Math.max(0, target)
    }
  }, [index])

  return (
    <section aria-label="照片接触印样" className="rg-memory-contact">
      <div className="rg-memory-contact-title">
        <span>CONTACT SHEET</span>
        <span>{String(photos.length).padStart(2, '0')} FRAMES</span>
      </div>
      <div
        ref={stripRef}
        role="list"
        aria-label="照片胶片条"
        className="rg-scroll rg-memory-contact-strip"
      >
        {photos.map((photo, photoIndex) => {
          const firstInChapter = photoIndex === 0
            || photos[photoIndex - 1]?.chapterKey !== photo.chapterKey
          return (
            <button
              key={photo.key}
              type="button"
              role="listitem"
              aria-label={`查看第 ${photoIndex + 1} 张照片`}
              aria-current={photoIndex === index ? 'true' : undefined}
              data-chapter-start={firstInChapter || undefined}
              onClick={() => onIndex(photoIndex)}
              className="rg-memory-thumb cursor-pointer"
              style={{
                '--rg-memory-thumb-index': photoIndex,
              } as CSSProperties}
            >
              <span className="rg-memory-thumb-number">
                {String(photoIndex + 1).padStart(2, '0')}
              </span>
              <span className="rg-memory-thumb-window">
                <img
                  src={photoVariantUrl(photo.visitId, photo.file, 'sm')}
                  alt=""
                  loading="lazy"
                />
              </span>
              <span className="rg-memory-thumb-date">
                {photo.takenAt?.slice(5, 10).replace('-', '.') ?? '—'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
