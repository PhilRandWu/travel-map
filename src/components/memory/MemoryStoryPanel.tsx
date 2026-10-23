import type { CSSProperties } from 'react'
import type { MemoryChapter, MemoryPhoto } from '@/lib/memory'
import { memoryDateParts } from '@/lib/memoryPresentation'

export type MemorySpeed = 0.5 | 1 | 2

interface Props {
  photo: MemoryPhoto
  chapter: MemoryChapter
  chapterIndex: number
  chapterCount: number
  index: number
  total: number
  playing: boolean
  speed: MemorySpeed
  progress: number
  finished: boolean
  reducedMotion: boolean
  onTogglePlayback: () => void
  onSpeed: (speed: MemorySpeed) => void
  onProgress: (index: number) => void
}

export default function MemoryStoryPanel({
  photo,
  chapter,
  chapterIndex,
  chapterCount,
  index,
  total,
  playing,
  speed,
  progress,
  finished,
  reducedMotion,
  onTogglePlayback,
  onSpeed,
  onProgress,
}: Props) {
  const parts = memoryDateParts(photo.takenAt ?? chapter.arriveDate)
  const chapterPhotoIndex = chapter.photos.findIndex(
    (item) => item.key === photo.key,
  )
  const progressValue = total <= 1 ? 100 : (index / (total - 1)) * 100

  return (
    <aside aria-label="照片信息与放映控制" className="rg-memory-story">
      <div className="rg-memory-story-kicker">
        <span>CHAPTER {String(chapterIndex + 1).padStart(2, '0')}</span>
        <span>{String(chapterCount).padStart(2, '0')} STOPS</span>
      </div>

      <div className="rg-memory-date-lockup">
        <span className="rg-memory-date-day">{parts?.day ?? '--'}</span>
        <span className="rg-memory-date-side">
          <b>{parts?.monthShort ?? 'DATE'}</b>
          <i>{parts?.year ?? '----'}</i>
        </span>
      </div>

      <p className="rg-memory-place">
        <span>{chapter.cityName}</span>
        <span aria-hidden />
        <span>{photo.takenAt ? 'ON THE ROAD' : 'UNDATED'}</span>
      </p>

      <h2 className="rg-memory-caption">
        {photo.caption || '未命名的片刻'}
      </h2>

      <p className="rg-memory-chapter-range">
        {chapter.arriveDate.replaceAll('-', '.')}
        {chapter.arriveDate !== chapter.leaveDate
          ? ` — ${chapter.leaveDate.replaceAll('-', '.')}`
          : ''}
      </p>

      <dl className="rg-memory-facts">
        <div>
          <dt>CAPTURED</dt>
          <dd>{parts?.time ?? '时间未记'}</dd>
        </div>
        <div>
          <dt>IN CHAPTER</dt>
          <dd>
            {String(chapterPhotoIndex + 1).padStart(2, '0')}
            <span> / {String(chapter.photos.length).padStart(2, '0')}</span>
          </dd>
        </div>
        <div>
          <dt>CURATION</dt>
          <dd>{photo.featured ? '精选' : '沿途'}</dd>
        </div>
      </dl>

      <div className="rg-memory-story-spacer" />

      <section aria-label="自动回忆控制" className="rg-memory-playback">
        <div className="rg-memory-playback-topline">
          <button
            type="button"
            aria-label={playing ? '暂停自动回忆' : '播放自动回忆'}
            onClick={onTogglePlayback}
            disabled={reducedMotion || total <= 1}
            className="rg-memory-play cursor-pointer"
          >
            <span aria-hidden data-playing={playing}>{playing ? 'Ⅱ' : '▶'}</span>
            {playing ? '暂停放映' : finished ? '重新放映' : '自动放映'}
          </button>

          <div aria-label="回忆播放速度" className="rg-memory-speed">
            {([0.5, 1, 2] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`回忆 ${value} 倍速`}
                aria-pressed={speed === value}
                onClick={() => onSpeed(value)}
                className="cursor-pointer"
              >
                {value}×
              </button>
            ))}
          </div>
        </div>

        <div className="rg-memory-timeline">
          <span className="rg-memory-timeline-index">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="relative min-w-0 flex-1">
            {playing && (
              <span
                aria-hidden
                className="rg-memory-timeline-live"
                style={{ transform: `scaleX(${progress})` }}
              />
            )}
            <input
              type="range"
              aria-label="回忆进度"
              min={0}
              max={Math.max(0, total - 1)}
              value={index}
              onChange={(event) => onProgress(Number(event.target.value))}
              className="rg-memory-range w-full"
              style={{
                '--rg-memory-progress': `${progressValue}%`,
              } as CSSProperties}
            />
          </div>
          <span className="rg-memory-timeline-index">
            {String(total).padStart(2, '0')}
          </span>
        </div>

        <p className="rg-memory-playback-note">
          {finished ? '旅程会继续。' : reducedMotion ? '减少动态已开启' : '双击照片可查看细节'}
        </p>
      </section>
    </aside>
  )
}
