import type { Journey, JourneyScope } from '@/types'
import WakeTitle from '@/components/motion/WakeTitle'

interface Props {
  scope: JourneyScope
  journey?: Journey
  placeName?: string
  onArchive: () => void
  onJourney: () => void
}

export default function JourneyBreadcrumb({
  scope,
  journey,
  placeName,
  onArchive,
  onJourney,
}: Props) {
  return (
    <nav
      aria-label="旅行层级"
      className="pointer-events-auto flex min-w-0 items-center gap-2 text-xs"
    >
      <button
        type="button"
        aria-label="返回旅行档案"
        onClick={onArchive}
        className="whitespace-nowrap text-white/45 transition hover:text-white"
      >
        {scope.kind === 'archive' ? <WakeTitle /> : '旅行档案'}
      </button>
      {scope.kind === 'journey' && (
        <>
          <span aria-hidden className="text-white/20">/</span>
          <button
            type="button"
            onClick={onJourney}
            className="max-w-40 truncate font-serif text-sm tracking-wide text-amber-100/80 transition hover:text-amber-50"
          >
            {journey?.title ?? '旅程'}
          </button>
        </>
      )}
      {placeName && (
        <>
          <span aria-hidden className="text-white/20">/</span>
          <span aria-current="page" className="truncate text-cyan-100/75">
            {placeName}
          </span>
        </>
      )}
    </nav>
  )
}
