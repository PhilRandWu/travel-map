import type { RefObject } from 'react'
import type { Journey, JourneyScope, TravelData } from '@/types'
import type { TravelStats } from '@/lib/derive'
import EditorTrigger from '@/components/editor/EditorTrigger'
import JourneyBreadcrumb from '@/components/journey/JourneyBreadcrumb'
import StatsPanel from '@/components/stats/StatsPanel'
import WorkspaceToolsMenu from '@/components/app/WorkspaceToolsMenu'

interface Props {
  headerRef: RefObject<HTMLElement | null>
  inert: boolean
  data: TravelData
  scope: JourneyScope
  journey?: Journey
  placeName?: string
  stats: TravelStats | null
  isArchive: boolean
  onArchive: () => void
  onJourney: () => void
  onOpenEditor: () => void
  onOpenCommand: () => void
  focusMode: boolean
  onToggleFocus: () => void
}

export default function WorkspaceHeader({
  headerRef,
  inert,
  data,
  scope,
  journey,
  placeName,
  stats,
  isArchive,
  onArchive,
  onJourney,
  onOpenEditor,
  onOpenCommand,
  focusMode,
  onToggleFocus,
}: Props) {
  return (
    <header
      ref={headerRef}
      inert={inert || undefined}
      className="rg-app-reveal rg-focus-chrome rg-safe-top flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4"
    >
      <JourneyBreadcrumb
        scope={scope}
        journey={journey}
        placeName={placeName}
        onArchive={onArchive}
        onJourney={onJourney}
      />
      <div className="flex shrink-0 items-center gap-2 text-xs text-white/50 sm:gap-3">
        <button
          type="button"
          data-command-trigger
          aria-label="打开回忆索引"
          onClick={onOpenCommand}
          className="pointer-events-auto flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-cyan-200/12 bg-cyan-200/[.035] px-3 text-[10px] tracking-[0.08em] text-cyan-50/52 backdrop-blur-md transition hover:border-cyan-200/28 hover:text-cyan-50/85"
        >
          <span aria-hidden>⌕</span>
          <span className="hidden sm:inline">回忆索引</span>
          <kbd className="hidden rounded border border-white/10 px-1 font-mono text-[8px] text-white/28 md:inline">
            ⌘K
          </kbd>
        </button>
        <EditorTrigger onOpen={onOpenEditor} />
        <WorkspaceToolsMenu
          data={data}
          isArchive={isArchive}
          focusMode={focusMode}
          onToggleFocus={onToggleFocus}
        />
        <StatsPanel stats={stats} context={journey?.title} />
      </div>
    </header>
  )
}
