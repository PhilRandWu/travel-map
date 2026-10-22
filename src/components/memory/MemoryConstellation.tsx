import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import type { MemoryCollection } from '@/lib/memory'
import {
  buildConstellationLayout,
  filterConstellationNodes,
} from '@/lib/constellation'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  collection: MemoryCollection
  initialScrollTop?: number
  onScrollTopChange?: (scrollTop: number) => void
  onOpenPhoto: (index: number) => void
}

const CANVAS = { width: 1400, height: 900 }
const OVERSCAN = 160

export default function MemoryConstellation({
  collection,
  initialScrollTop = 0,
  onScrollTopChange,
  onOpenPhoto,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [mobile, setMobile] = useState(() => window.innerWidth < 640)
  const [viewport, setViewport] = useState({
    left: 0,
    top: initialScrollTop,
    width: 1200,
    height: 760,
    overscan: OVERSCAN,
  })

  const nodes = useMemo(
    () => buildConstellationLayout(collection, CANVAS),
    [collection],
  )
  const visibleNodes = useMemo(
    () => filterConstellationNodes(nodes, viewport),
    [nodes, viewport],
  )

  useEffect(() => {
    const host = hostRef.current
    host?.scrollTo({ top: initialScrollTop })
    const updateMode = () => setMobile(window.innerWidth < 640)
    const syncViewport = () => {
      if (!host) return
      const next = {
        left: host.scrollLeft,
        top: host.scrollTop,
        width: host.clientWidth,
        height: host.clientHeight,
        overscan: OVERSCAN,
      }
      setViewport(next)
      onScrollTopChange?.(next.top)
    }

    window.addEventListener('resize', updateMode)
    host?.addEventListener('scroll', syncViewport, { passive: true })
    syncViewport()
    return () => {
      window.removeEventListener('resize', updateMode)
      host?.removeEventListener('scroll', syncViewport)
    }
  }, [initialScrollTop, onScrollTopChange])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const host = event.currentTarget
    setViewport({
      left: host.scrollLeft,
      top: host.scrollTop,
      width: host.clientWidth,
      height: host.clientHeight,
      overscan: OVERSCAN,
    })
    onScrollTopChange?.(host.scrollTop)
  }

  if (mobile) {
    return (
      <div className="rg-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {collection.chapters.map((chapter) => (
          <section key={chapter.key} className="mb-6">
            <h3 className="mb-2 font-serif text-lg text-[#f5ead8]">
              {chapter.arriveDate.slice(5).replace('-', '.')} · {chapter.cityName}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {chapter.photos.map((photo) => (
                <button
                  key={photo.key}
                  type="button"
                  onClick={() => onOpenPhoto(
                    collection.photos.findIndex((item) => item.key === photo.key),
                  )}
                  className="rg-memory-constellation-card overflow-hidden rounded-lg border border-white/10 text-left"
                >
                  <img
                    src={photoVariantUrl(photo.visitId, photo.file, 'sm')}
                    alt={photo.caption ?? `${photo.cityName}照片`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <span className="block px-2 py-1.5 text-[10px] text-[#f5ead8]/60">
                    {photo.caption || photo.file}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={hostRef}
      onScroll={handleScroll}
      className="rg-memory-constellation relative min-h-0 flex-1 overflow-auto"
    >
      <div
        className="relative mx-auto h-[900px] w-[1400px]"
        style={{
          background:
            'radial-gradient(circle at 50% 45%,rgba(126,92,49,.15),transparent 34%),radial-gradient(circle at 20% 70%,rgba(46,90,111,.12),transparent 30%)',
        }}
      >
        <svg aria-hidden viewBox="0 0 1400 900" className="absolute inset-0 h-full w-full">
          {visibleNodes.slice(1).map((node, index) => (
            <line
              key={node.photo.key}
              x1={visibleNodes[index].x}
              y1={visibleNodes[index].y}
              x2={node.x}
              y2={node.y}
              stroke="rgba(245,234,216,.09)"
            />
          ))}
        </svg>
        {visibleNodes.map((node) => {
          const index = collection.photos.findIndex(
            (photo) => photo.key === node.photo.key,
          )
          return (
            <button
              key={node.photo.key}
              type="button"
              aria-label={`打开${node.photo.cityName}照片：${node.photo.caption ?? node.photo.file}`}
              onClick={() => onOpenPhoto(index)}
              className="rg-memory-constellation-card absolute w-28 overflow-hidden rounded-lg border border-white/12 bg-black/40 shadow-[0_12px_36px_rgba(0,0,0,.45)]"
              style={{
                left: node.x - 56,
                top: node.y - 38,
                transform: `rotate(${node.rotation}deg) scale(${node.scale})`,
                zIndex: Math.round(node.y),
              }}
            >
              <img
                src={photoVariantUrl(node.photo.visitId, node.photo.file, 'md')}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="block truncate px-2 py-1 text-left text-[9px] text-[#f5ead8]/65">
                {node.photo.cityName}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
