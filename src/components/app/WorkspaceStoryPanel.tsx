import type { Journey, MemoryMode, MemoryView, Selection, TravelData } from '@/types'
import HeroPhoto from '@/components/hero/HeroPhoto'
import JourneyPassport from '@/components/journey/JourneyPassport'

interface Props {
  inert: boolean
  activeJourney?: Journey
  scopedData: TravelData | null
  isArchive: boolean
  selection: Selection
  placeOpen: boolean
  showOtherJourneys: boolean
  onShowOtherJourneysChange: (show: boolean) => void
  onStartReplay: () => void
  onOpenMemory: (view: MemoryView, mode?: MemoryMode) => void
  onExpand: () => void
}

export default function WorkspaceStoryPanel({
  inert,
  activeJourney,
  scopedData,
  isArchive,
  selection,
  placeOpen,
  showOtherJourneys,
  onShowOtherJourneysChange,
  onStartReplay,
  onOpenMemory,
  onExpand,
}: Props) {
  return (
    <div
      inert={inert || undefined}
      className="rg-scroll rg-focus-chrome flex max-h-full flex-1 flex-col items-end gap-3 overflow-y-auto px-4 py-2 sm:px-6"
    >
      {activeJourney && scopedData && (
        <JourneyPassport
          data={scopedData}
          journey={activeJourney}
          onStartReplay={onStartReplay}
          onOpenMemory={(view, mode) => onOpenMemory(view, mode)}
          showOtherJourneys={showOtherJourneys}
          onShowOtherJourneysChange={onShowOtherJourneysChange}
          compact={placeOpen}
        />
      )}
      {!isArchive && scopedData && selection.kind === 'trip' && (
        <div className="hidden sm:block">
          <HeroPhoto data={scopedData} selection={selection} onExpand={onExpand} />
        </div>
      )}
    </div>
  )
}
