import type { RefObject } from 'react'
import type { Selection, TravelData } from '@/types'
import type { TimelineNode } from '@/lib/derive'
import type { ReplayRuntime } from '@/lib/replay'
import JourneyArchive from '@/components/journey/JourneyArchive'
import JourneyChapterRail from '@/components/journey/JourneyChapterRail'

interface Props {
  footerRef: RefObject<HTMLElement | null>
  focusMode: boolean
  isArchive: boolean
  data: TravelData
  activeJourneyId: string | null
  scopedData: TravelData | null
  timeline: TimelineNode[]
  selection: Selection
  replayStartSignal: number
  onOpenJourney: (journeyId: string) => void
  onNewJourney: () => void
  onRandomMemory: () => void
  onSelectTimelineNode: (node: TimelineNode) => void
  onFinishPlayback: () => void
  onPlaybackRuntimeChange: (runtime: ReplayRuntime) => void
}

export default function WorkspaceChapterFooter({
  footerRef,
  focusMode,
  isArchive,
  data,
  activeJourneyId,
  scopedData,
  timeline,
  selection,
  replayStartSignal,
  onOpenJourney,
  onNewJourney,
  onRandomMemory,
  onSelectTimelineNode,
  onFinishPlayback,
  onPlaybackRuntimeChange,
}: Props) {
  return (
    <footer
      ref={footerRef}
      inert={focusMode || undefined}
      className="rg-app-reveal rg-focus-footer rg-safe-bottom px-3 pb-3 sm:px-6 sm:pb-5"
    >
      {isArchive ? (
        <JourneyArchive
          data={data}
          onOpenJourney={onOpenJourney}
          onNewJourney={onNewJourney}
          onRandomMemory={onRandomMemory}
        />
      ) : scopedData ? (
        <JourneyChapterRail
          key={activeJourneyId ?? 'journey'}
          data={scopedData}
          nodes={timeline}
          selection={selection}
          startSignal={replayStartSignal}
          onSelect={onSelectTimelineNode}
          onFinishPlayback={onFinishPlayback}
          onPlaybackRuntimeChange={onPlaybackRuntimeChange}
        />
      ) : null}
    </footer>
  )
}
