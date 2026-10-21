import { useState, type CSSProperties } from 'react'
import {
  REPLAY_SPEEDS,
  type PlaybackStatus,
  type ReplaySpeed,
} from '@/lib/replay'

interface Props {
  status: PlaybackStatus
  speed: ReplaySpeed
  progress: number
  activeIndex: number
  total: number
  onToggle: () => void
  onSpeedChange: (speed: ReplaySpeed) => void
  onSeek: (progress: number) => void
}

export default function TimelineControls({
  status,
  speed,
  progress,
  activeIndex,
  total,
  onToggle,
  onSpeedChange,
  onSeek,
}: Props) {
  const [draftProgress, setDraftProgress] = useState<number | null>(null)
  const displayProgress = draftProgress ?? progress
  const isPlaying = status === 'playing'
  const actionLabel = isPlaying
    ? '暂停回放'
    : status === 'paused' ? '继续回放' : '开始旅行回放'

  const commitSeek = () => {
    if (draftProgress === null) return
    onSeek(draftProgress)
    setDraftProgress(null)
  }

  return (
    <div
      data-replay-status={status}
      className="flex items-center gap-3 px-1.5 pb-2"
    >
      <button
        type="button"
        data-replay-toggle
        aria-label={actionLabel}
        title={actionLabel}
        onClick={onToggle}
        className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition ${
          isPlaying
            ? 'border-cyan-200/55 bg-cyan-300/16 text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,.18)]'
            : 'border-white/13 bg-white/6 text-white/72 hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-cyan-100'
        }`}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="text-[9px] tracking-[0.2em] text-white/38">
            {isPlaying ? '正在回放' : status === 'paused' ? '回放暂停' : '旅行回放'}
          </span>
          <span className="font-mono text-[9px] tracking-wider text-white/32">
            {activeIndex >= 0 ? `${activeIndex + 1} / ${total}` : `${total} 个节点`}
          </span>
        </div>
        <input
          type="range"
          data-replay-progress
          aria-label="旅行回放进度"
          aria-valuetext={
            activeIndex >= 0
              ? `第 ${activeIndex + 1} 个，共 ${total} 个节点`
              : `共 ${total} 个节点`
          }
          min={0}
          max={1000}
          step={1}
          value={Math.round(displayProgress * 1000)}
          onChange={(event) => setDraftProgress(Number(event.target.value) / 1000)}
          onPointerUp={commitSeek}
          onPointerCancel={commitSeek}
          onKeyUp={commitSeek}
          onBlur={commitSeek}
          className="rg-replay-range"
          style={{
            '--rg-replay-progress': `${displayProgress * 100}%`,
          } as CSSProperties}
        />
      </div>

      <div
        role="group"
        aria-label="回放速度"
        className="flex shrink-0 items-center gap-1 rounded-full border border-white/9 bg-black/18 p-0.5"
      >
        {REPLAY_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            data-replay-speed={value}
            aria-label={`${value} 倍速`}
            aria-pressed={speed === value}
            onClick={() => onSpeedChange(value)}
            className={`h-5 min-w-8 cursor-pointer rounded-full px-1.5 text-[9px] font-medium tabular-nums transition ${
              speed === value
                ? 'bg-white/13 text-cyan-100'
                : 'text-white/35 hover:text-white/70'
            }`}
          >
            {value}×
          </button>
        ))}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" className="ml-0.5 h-3.5 w-3.5" aria-hidden="true">
      <path d="M6.5 3.8v12.4L16 10 6.5 3.8Z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}
