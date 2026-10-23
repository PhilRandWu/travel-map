import type {
  MouseEventHandler,
  PointerEventHandler,
} from 'react'
import type { MemoryChapter, MemoryPhoto } from '@/lib/memory'
import MemoryPhotoFrame from '@/components/memory/MemoryPhoto'
import MemoryStoryPanel, {
  type MemorySpeed,
} from '@/components/memory/MemoryStoryPanel'

interface Props {
  photo: MemoryPhoto
  chapter: MemoryChapter
  chapterIndex: number
  chapterCount: number
  index: number
  total: number
  direction: 'next' | 'previous' | 'none'
  scale: number
  origin: string
  playing: boolean
  speed: MemorySpeed
  progress: number
  finished: boolean
  reducedMotion: boolean
  onDoubleClick: MouseEventHandler<HTMLElement>
  onPointerDown: PointerEventHandler<HTMLElement>
  onPointerUp: PointerEventHandler<HTMLElement>
  onPrevious: () => void
  onNext: () => void
  onTogglePlayback: () => void
  onSpeed: (speed: MemorySpeed) => void
  onProgress: (index: number) => void
}

export default function MemoryStageScene({
  photo,
  chapter,
  chapterIndex,
  chapterCount,
  index,
  total,
  direction,
  scale,
  origin,
  playing,
  speed,
  progress,
  finished,
  reducedMotion,
  onDoubleClick,
  onPointerDown,
  onPointerUp,
  onPrevious,
  onNext,
  onTogglePlayback,
  onSpeed,
  onProgress,
}: Props) {
  return (
    <section aria-label="逐张回忆" className="rg-memory-scene">
      <div className="rg-memory-scene-visual">
        <div aria-hidden className="rg-memory-scene-caption">
          <span>PRIVATE SCREENING</span>
          <span>{String(index + 1).padStart(2, '0')} — {String(total).padStart(2, '0')}</span>
        </div>

        <MemoryPhotoFrame
          key={photo.key}
          photo={photo}
          index={index}
          total={total}
          direction={direction}
          scale={scale}
          origin={origin}
          onDoubleClick={onDoubleClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        />

        <div className="rg-memory-scene-nav">
          <button
            type="button"
            aria-label="上一张"
            onClick={onPrevious}
            disabled={total <= 1}
            className="rg-memory-step cursor-pointer"
          >
            <i aria-hidden>←</i>
            <span>上一帧</span>
            <b>PREV</b>
          </button>
          <span aria-hidden className="rg-memory-scene-rule">
            <i />
          </span>
          <button
            type="button"
            aria-label="下一张"
            onClick={onNext}
            disabled={total <= 1}
            className="rg-memory-step cursor-pointer"
          >
            <b>NEXT</b>
            <span>下一帧</span>
            <i aria-hidden>→</i>
          </button>
        </div>

        <p aria-live="polite" className="sr-only">
          第 {index + 1} 张，共 {total} 张，{photo.cityName}，
          {photo.takenAt ?? '拍摄时间未知'}
        </p>
      </div>

      <MemoryStoryPanel
        photo={photo}
        chapter={chapter}
        chapterIndex={chapterIndex}
        chapterCount={chapterCount}
        index={index}
        total={total}
        playing={playing}
        speed={speed}
        progress={progress}
        finished={finished}
        reducedMotion={reducedMotion}
        onTogglePlayback={onTogglePlayback}
        onSpeed={onSpeed}
        onProgress={onProgress}
      />
    </section>
  )
}
