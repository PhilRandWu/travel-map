import { useMotion } from '@/components/motion/MotionProvider'
import { MOTION_LEVELS, type MotionLevel } from '@/lib/motion'

const LABELS: Record<MotionLevel, string> = {
  calm: '静谧',
  cinematic: '电影感',
  immersive: '沉浸',
}

export default function MotionSettings() {
  const {
    userLevel,
    effectiveLevel,
    reducedMotion,
    touchDevice,
    setUserLevel,
  } = useMotion()
  const forcedBySystem = reducedMotion && effectiveLevel === 'calm'
  const forcedByTouch = touchDevice && userLevel === 'immersive'

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div
        role="group"
        aria-label="动效强度"
        className="flex items-center rounded-full border border-white/10 bg-white/[.04] p-0.5 backdrop-blur-md"
      >
        {MOTION_LEVELS.map((level) => {
          const active = userLevel === level
          const disabled = reducedMotion && level !== 'calm'
          return (
            <button
              key={level}
              type="button"
              data-motion-level={level}
              aria-pressed={active}
              aria-label={`${LABELS[level]}动效`}
              disabled={disabled}
              onClick={() => setUserLevel(level)}
              className={`min-h-8 cursor-pointer rounded-full px-1 text-[9px] tracking-wide transition sm:px-2.5 ${
                active
                  ? 'bg-amber-100/13 text-amber-50'
                  : 'text-white/38 hover:text-white/72'
              } disabled:cursor-not-allowed disabled:opacity-30`}
            >
              {LABELS[level]}
            </button>
          )
        })}
      </div>
      {(forcedBySystem || forcedByTouch) && (
        <span className="pr-1 text-[8px] tracking-[0.08em] text-white/28">
          {forcedBySystem ? '已跟随系统减少动态' : '触屏设备使用电影感'}
        </span>
      )}
    </div>
  )
}
