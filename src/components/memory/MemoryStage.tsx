import { useEffect, useMemo, useRef, useState } from 'react'
import type { MemoryMode, MemoryView } from '@/types'
import {
  clampMemoryIndex,
  filterMemoryCollection,
  type MemoryCollection,
} from '@/lib/memory'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import MemoryToolbar from '@/components/memory/MemoryToolbar'
import MemoryFilmstrip from '@/components/memory/MemoryFilmstrip'
import MemoryConstellation from '@/components/memory/MemoryConstellation'
import MemoryChapterCard from '@/components/memory/MemoryChapterCard'
import MemoryFlight from '@/components/memory/MemoryFlight'
import MemoryStageScene from '@/components/memory/MemoryStageScene'
import AmbientDust from '@/components/motion/AmbientDust'
import { useLayerReturn } from '@/components/motion/useLayerReturn'
import { useMemoryChapterCard } from '@/components/memory/hooks/useMemoryChapterCard'
import { useMemoryConstellationReturn } from '@/components/memory/hooks/useMemoryConstellationReturn'
import { useMemoryFlight } from '@/components/memory/hooks/useMemoryFlight'
import { useMemoryPlayback } from '@/components/memory/hooks/useMemoryPlayback'
import { usePhotoZoom } from '@/components/memory/hooks/usePhotoZoom'
import { useSwipeNavigation } from '@/components/memory/hooks/useSwipeNavigation'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  collection: MemoryCollection
  mode: MemoryMode
  view: MemoryView
  photoIndex: number
  onPhotoIndex: (index: number) => void
  onMode: (mode: MemoryMode) => void
  onView: (view: MemoryView) => void
  onClose: () => void
}

export default function MemoryStage({
  collection,
  mode,
  view,
  photoIndex,
  onPhotoIndex,
  onMode,
  onView,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const constellationScrollRef = useRef(0)
  const previousIndexRef = useRef(photoIndex)
  const [direction, setDirection] = useState<'next' | 'previous' | 'none'>('none')
  useFocusTrap(rootRef)
  const reducedMotion = useReducedMotion()
  const zoom = usePhotoZoom()
  const { returning, requestClose } = useLayerReturn(onClose)

  const filtered = useMemo(
    () => filterMemoryCollection(collection, mode),
    [collection, mode],
  )
  const photos = filtered.photos
  const index = clampMemoryIndex(photoIndex, photos.length)
  const photo = photos[index]
  const chapter = photo
    ? filtered.chapters.find((item) => item.key === photo.chapterKey)
    : undefined
  const chapterIndex = chapter
    ? filtered.chapters.findIndex((item) => item.key === chapter.key)
    : 0
  const chapterCard = useMemoryChapterCard(filtered, photo)
  const { flight, openFromConstellation } = useMemoryFlight({
    photos,
    onPhotoIndex,
    onView,
  })
  useMemoryConstellationReturn(view, index, photos)
  const playback = useMemoryPlayback({
    photoCount: photos.length,
    index,
    onIndex: onPhotoIndex,
    reducedMotion,
  })

  const go = (delta: number) => {
    if (photos.length <= 1) return
    setDirection(delta > 0 ? 'next' : 'previous')
    onPhotoIndex((index + delta + photos.length) % photos.length)
  }

  const goManually = (delta: number) => {
    playback.pause()
    zoom.reset()
    go(delta)
  }

  const goTo = (nextIndex: number) => {
    playback.pause()
    zoom.reset()
    setDirection(nextIndex >= index ? 'next' : 'previous')
    onPhotoIndex(nextIndex)
  }

  const swipe = useSwipeNavigation(
    () => goManually(-1),
    () => goManually(1),
  )

  useEffect(() => {
    if (previousIndexRef.current !== index && direction === 'none') {
      setDirection(index > previousIndexRef.current ? 'next' : 'previous')
    }
    previousIndexRef.current = index
  }, [direction, index])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
      if (event.key === 'ArrowLeft') goManually(-1)
      if (event.key === 'ArrowRight') goManually(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, photos.length, requestClose])

  useEffect(() => {
    if (photos.length <= 1) return
    for (const item of [photos[index - 1], photos[index + 1]]) {
      if (!item) continue
      const image = new window.Image()
      image.src = photoVariantUrl(item.visitId, item.file, 'preview')
    }
  }, [index, photos])

  if (!photo && view === 'stage') return null

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`照片回忆：${photo?.cityName ?? '旅行照片'}`}
      data-returning={returning}
      data-finished={reducedMotion ? 'true' : undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.dataset.finished = 'true'
        }
      }}
      className="rg-memory-stage rg-layer rg-transitioning fixed inset-0 z-[70] flex flex-col overflow-hidden bg-[#08090c] text-[var(--rg-memory-paper)]"
    >
      {photo && (
        <div
          aria-hidden
          className="rg-memory-backdrop"
          style={{
            backgroundImage: `url(${photoVariantUrl(photo.visitId, photo.file, 'blur')})`,
          }}
        />
      )}
      <div aria-hidden className="rg-memory-film-grain" />
      <div aria-hidden className="rg-memory-stage-architecture" />
      <AmbientDust />

      {view === 'stage' && chapterCard && (
        <MemoryChapterCard date={chapterCard.date} cityName={chapterCard.cityName} />
      )}

      <MemoryToolbar
        collection={collection}
        mode={mode}
        view={view}
        hasFeatured={collection.hasFeatured}
        index={index}
        total={photos.length}
        onMode={(nextMode) => {
          playback.pause()
          zoom.reset()
          onMode(nextMode)
        }}
        onView={(nextView) => {
          playback.pause()
          zoom.reset()
          onView(nextView)
        }}
        onClose={requestClose}
      />

      <div className={view === 'stage' ? 'hidden' : 'contents'}>
        <MemoryConstellation
          collection={filtered}
          initialScrollTop={constellationScrollRef.current}
          onScrollTopChange={(scrollTop) => {
            constellationScrollRef.current = scrollTop
          }}
          onOpenPhoto={openFromConstellation}
        />
      </div>

      {view === 'stage' && photo && chapter && (
        <MemoryStageScene
          photo={photo}
          chapter={chapter}
          chapterIndex={chapterIndex}
          chapterCount={filtered.chapters.length}
          index={index}
          total={photos.length}
          direction={direction}
          scale={zoom.scale}
          origin={zoom.origin}
          playing={playback.playing}
          speed={playback.speed}
          progress={playback.progress}
          finished={playback.finished}
          reducedMotion={reducedMotion}
          onDoubleClick={zoom.onDoubleClick}
          onPointerDown={swipe.onPointerDown}
          onPointerUp={swipe.onPointerUp}
          onPrevious={() => goManually(-1)}
          onNext={() => goManually(1)}
          onTogglePlayback={playback.toggle}
          onSpeed={playback.setSpeed}
          onProgress={goTo}
        />
      )}

      {view === 'stage' && photos.length > 1 && (
        <MemoryFilmstrip photos={photos} index={index} onIndex={goTo} />
      )}

      {flight && (
        <MemoryFlight src={flight.src} from={flight.from} to={flight.to} />
      )}
    </div>
  )
}
