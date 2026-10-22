import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { MemoryMode, MemoryView } from '@/types'
import {
  clampMemoryIndex,
  filterMemoryCollection,
  filterMemoryPhotos,
  type MemoryCollection,
} from '@/lib/memory'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import MemoryToolbar from '@/components/memory/MemoryToolbar'
import MemoryPhoto from '@/components/memory/MemoryPhoto'
import MemoryFilmstrip from '@/components/memory/MemoryFilmstrip'
import MemoryConstellation from '@/components/memory/MemoryConstellation'
import MemoryChapterCard from '@/components/memory/MemoryChapterCard'
import MemoryFlight from '@/components/memory/MemoryFlight'
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
  const [direction, setDirection] = useState<'next' | 'previous' | 'none'>('none')
  useFocusTrap(rootRef)
  const reducedMotion = useReducedMotion()
  const zoom = usePhotoZoom()
  const { returning, requestClose } = useLayerReturn(onClose)

  const photos = useMemo(() => filterMemoryPhotos(collection, mode), [collection, mode])
  const index = clampMemoryIndex(photoIndex, photos.length)
  const photo = photos[index]
  const chapterCard = useMemoryChapterCard(collection, photo)
  const { flight, openFromConstellation } = useMemoryFlight({
    photos,
    onPhotoIndex,
    onView,
  })
  useMemoryConstellationReturn(view, photoIndex, photos)
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

  const swipe = useSwipeNavigation(
    () => goManually(-1),
    () => goManually(1),
  )

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
    const adjacent = [
      photos[index - 1],
      photos[index + 1],
    ].filter((item) => item !== undefined)

    for (const item of adjacent) {
      const image = new window.Image()
      image.src = photoVariantUrl(item.visitId, item.file, 'preview')
    }
  }, [index, photos])

  if (!photo && view === 'stage') return null
  const constellationCollection = filterMemoryCollection(collection, mode)

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
      className="rg-memory-stage rg-layer rg-transitioning fixed inset-0 z-[70] flex flex-col bg-[#090707]/94 text-[#f5ead8] backdrop-blur-xl"
    >
      <AmbientDust />
      <div aria-hidden className="rg-memory-film-grain absolute inset-0 z-[12]" />
      {view === 'stage' && chapterCard && (
        <MemoryChapterCard
          date={chapterCard.date}
          cityName={chapterCard.cityName}
        />
      )}
      <MemoryToolbar
        mode={mode}
        view={view}
        hasFeatured={collection.hasFeatured}
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
          collection={constellationCollection}
          initialScrollTop={constellationScrollRef.current}
          onScrollTopChange={(scrollTop) => {
            constellationScrollRef.current = scrollTop
          }}
          onOpenPhoto={openFromConstellation}
        />
      </div>
      {view === 'stage' && photo && (
        <>
          <div className="relative flex min-h-0 flex-1 items-center">
            <MemoryPhoto
              photo={photo}
              direction={direction}
              scale={zoom.scale}
              origin={zoom.origin}
              onDoubleClick={zoom.onDoubleClick}
              onPointerDown={swipe.onPointerDown}
              onPointerUp={swipe.onPointerUp}
            />
            <button
              type="button"
              aria-label="上一张"
              onClick={() => goManually(-1)}
              className="rg-memory-arrow absolute left-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-black/20 text-2xl text-white/65 backdrop-blur-md transition hover:border-white/30 hover:text-white sm:left-5"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => goManually(1)}
              className="rg-memory-arrow absolute right-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-black/20 text-2xl text-white/65 backdrop-blur-md transition hover:border-white/30 hover:text-white sm:right-5"
            >
              ›
            </button>
          </div>
          <p aria-live="polite" className="sr-only">
            第 {index + 1} 张，共 {photos.length} 张，{photo.cityName}，{photo.takenAt ?? '拍摄时间未知'}
          </p>
        </>
      )}
      {view === 'stage' && <div className="rg-memory-controls flex items-center gap-2 px-5 pb-2">
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label={playback.playing ? '暂停自动回忆' : '播放自动回忆'}
              onClick={playback.toggle}
              disabled={reducedMotion}
              className="rg-memory-control cursor-pointer rounded-full border border-white/12 px-3 py-2 text-xs text-white/68 transition hover:border-white/28 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {playback.playing ? '暂停' : '播放'}
            </button>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[.03] p-0.5">
              {([0.5, 1, 2] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`回忆 ${value} 倍速`}
                  aria-pressed={playback.speed === value}
                  onClick={() => playback.setSpeed(value)}
                  className={`rg-memory-control min-w-9 cursor-pointer rounded-full px-2 py-1.5 text-[10px] tabular-nums transition ${
                    playback.speed === value
                      ? 'bg-white/12 text-amber-50'
                      : 'text-white/38 hover:text-white/70'
                  }`}
                >
                  {value}×
                </button>
              ))}
            </div>
          </>
        )}
        <div className="relative min-w-0 flex-1">
          {playback.playing && (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px origin-left bg-amber-100/65"
              style={{ transform: `scaleX(${playback.progress})` }}
            />
          )}
          <input
            type="range"
            aria-label="回忆进度"
            min={0}
            max={Math.max(0, photos.length - 1)}
            value={index}
            onChange={(event) => {
              playback.pause()
              zoom.reset()
              setDirection(Number(event.target.value) > index ? 'next' : 'previous')
              onPhotoIndex(Number(event.target.value))
            }}
            className="rg-memory-range w-full"
            style={{
              '--rg-memory-progress': `${
                photos.length <= 1 ? 100 : (index / (photos.length - 1)) * 100
              }%`,
            } as CSSProperties}
          />
        </div>
      </div>}
      {playback.finished && index === photos.length - 1 && (
        <p className="pb-3 text-center font-serif text-lg text-[#f5ead8]/70">
          旅程会继续。
        </p>
      )}
      {view === 'stage' && photos.length > 1 && (
        <MemoryFilmstrip
          photos={photos}
          index={index}
          onIndex={(nextIndex) => {
            playback.pause()
            zoom.reset()
            setDirection(nextIndex > index ? 'next' : 'previous')
            onPhotoIndex(nextIndex)
          }}
        />
      )}
      {flight && (
        <MemoryFlight
          src={flight.src}
          from={flight.from}
          to={flight.to}
        />
      )}
    </div>
  )
}
