import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from 'react'
import type { MemoryCollection } from '@/lib/memory'
import {
  buildConstellationMap,
  filterConstellationNodes,
  getConstellationParallax,
} from '@/lib/constellation'
import { photoVariantUrl } from '@/lib/photoUrls'
import { useMotion } from '@/components/motion/MotionProvider'
import ConstellationBoard from '@/components/memory/ConstellationBoard'

interface Props {
  collection: MemoryCollection
  initialScrollTop?: number
  onScrollTopChange?: (scrollTop: number) => void
  onOpenPhoto: (index: number, sourceRect: DOMRect) => void
}

const OVERSCAN = 160

function constellationCanvas() {
  return {
    width: Math.max(1080, Math.min(1700, window.innerWidth)),
    height: Math.max(680, Math.min(1040, window.innerHeight - 100)),
  }
}

export default function MemoryConstellation({
  collection,
  initialScrollTop = 0,
  onScrollTopChange,
  onOpenPhoto,
}: Props) {
  const { effectiveLevel, touchDevice } = useMotion()
  const hostRef = useRef<HTMLDivElement>(null)
  const [mobile, setMobile] = useState(() => window.innerWidth < 640)
  const [canvas, setCanvas] = useState(constellationCanvas)
  const [viewport, setViewport] = useState({
    left: 0,
    top: initialScrollTop,
    width: 1200,
    height: 760,
    overscan: OVERSCAN,
  })

  const map = useMemo(
    () => buildConstellationMap(collection, canvas),
    [canvas, collection],
  )
  const visibleNodes = useMemo(
    () => filterConstellationNodes(map.nodes, viewport),
    [map.nodes, viewport],
  )

  useEffect(() => {
    const host = hostRef.current
    if (host && typeof host.scrollTo === 'function') {
      host.scrollTo({ top: initialScrollTop })
    } else if (host) {
      host.scrollTop = initialScrollTop
    }
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
    const handleResize = () => {
      setMobile(window.innerWidth < 640)
      setCanvas(constellationCanvas())
      syncViewport()
    }

    window.addEventListener('resize', handleResize)
    host?.addEventListener('scroll', syncViewport, { passive: true })
    syncViewport()
    return () => {
      window.removeEventListener('resize', handleResize)
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

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (effectiveLevel !== 'immersive' || touchDevice) return
    const rect = event.currentTarget.getBoundingClientRect()
    const parallax = getConstellationParallax(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
      effectiveLevel,
    )
    event.currentTarget.style.setProperty('--rg-depth-x', `${parallax.x}px`)
    event.currentTarget.style.setProperty('--rg-depth-y', `${parallax.y}px`)
  }

  const resetPointerDepth = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--rg-depth-x', '0px')
    event.currentTarget.style.setProperty('--rg-depth-y', '0px')
  }

  if (mobile) {
    return (
      <div
        data-constellation-host
        className="rg-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6"
      >
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
                  data-photo-key={photo.key}
                  onClick={(event) => onOpenPhoto(
                    collection.photos.findIndex(
                      (item) => item.key === photo.key,
                    ),
                    event.currentTarget.getBoundingClientRect(),
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
      data-constellation-host
      onScroll={handleScroll}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointerDepth}
      className="rg-memory-constellation rg-scroll relative min-h-0 flex-1 overflow-auto"
    >
      <ConstellationBoard
        map={map}
        visibleNodes={visibleNodes}
        onOpenPhoto={onOpenPhoto}
      />
    </div>
  )
}
