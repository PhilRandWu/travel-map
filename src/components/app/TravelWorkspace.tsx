import GlobeLoader from '@/components/common/GlobeLoader'
import Starfield from '@/components/globe/Starfield'
import PlaceChapter from '@/components/journey/PlaceChapter'
import MemoryStage from '@/components/memory/MemoryStage'
import ReplayFinale from '@/components/timeline/ReplayFinale'
import WorkspaceEditor from '@/components/app/WorkspaceEditor'
import WorkspaceChapterFooter from '@/components/app/WorkspaceChapterFooter'
import WorkspaceGlobe from '@/components/app/WorkspaceGlobe'
import WorkspaceHeader from '@/components/app/WorkspaceHeader'
import WorkspaceStoryPanel from '@/components/app/WorkspaceStoryPanel'
import FocusModeBar from '@/components/app/FocusModeBar'
import TravelCommandPalette from '@/components/search/TravelCommandPalette'
import { useTravelNavigation } from '@/hooks/useTravelNavigation'
import { useTravelWorkspaceController } from '@/hooks/useTravelWorkspaceController'
import type { TravelData } from '@/types'

interface Props {
  data: TravelData
  storageError: string | null
  lastSavedAt: string | null
  onDataChange: (data: TravelData) => void
}

export default function TravelWorkspace({
  data,
  storageError,
  lastSavedAt,
  onDataChange,
}: Props) {
  const { state, actions } = useTravelNavigation(data)
  const workspace = useTravelWorkspaceController({
    data,
    state,
    actions,
    onDataChange,
  })

  return (
    <div
      data-replay-takeover={workspace.replayTakeover.active}
      data-focus-mode={workspace.focusMode ? 'true' : undefined}
      data-focus-idle={workspace.focusIdle ? 'true' : undefined}
      className="relative h-[100svh] w-screen overflow-hidden bg-black font-sans text-white select-none"
    >
      <Starfield />
      <main id="travel-map-main" aria-label="旅行足迹地图" className="absolute inset-0">
        <WorkspaceGlobe
          litCities={workspace.litCities}
          homeCity={workspace.homeCity}
          tracks={workspace.tracks}
          stardustTracks={workspace.stardustTracks}
          selectedCityId={state.cardCityId}
          selectedTripId={workspace.selectedTripId}
          journeyId={workspace.activeJourneyId}
          focusPoint={workspace.focusPoint}
          tripPlaybackSignal={workspace.tripPlaybackSignal}
          replayRuntime={workspace.replayRuntime}
          framing={workspace.replaySafeFrame.frame}
          resetSignal={workspace.resetSignal}
          onReady={() => workspace.setGlobeReady(true)}
          onDirectorCameraChange={workspace.replayTakeover.onDirectorCameraChange}
          onSelectCity={(cityId) => {
            workspace.setRegion(null)
            if (cityId) actions.openCity(cityId)
            else actions.closePlace()
          }}
          onSelectTrip={workspace.handleSelectTrip}
          region={workspace.region}
          onPick={(region) => {
            workspace.setRegion(region)
            actions.clearSelection()
          }}
          onFailure={() => workspace.setGlobeFailed(true)}
        />
      </main>
      <GlobeLoader ready={workspace.globeReady || workspace.globeFailed} />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
        <WorkspaceHeader
          headerRef={workspace.replaySafeFrame.headerRef}
          inert={workspace.replayTakeover.active || workspace.focusMode}
          data={data}
          scope={state.scope}
          journey={workspace.activeJourney}
          placeName={workspace.activePlaceName}
          stats={workspace.stats}
          isArchive={workspace.isArchive}
          onArchive={workspace.openArchive}
          onJourney={workspace.resetOverview}
          onOpenEditor={() => workspace.setEditorOpen(true)}
          onOpenCommand={() => workspace.setCommandOpen(true)}
          focusMode={workspace.focusMode}
          onToggleFocus={() => workspace.setFocusMode((current) => !current)}
        />

        <WorkspaceStoryPanel
          inert={workspace.replayTakeover.active || workspace.focusMode}
          activeJourney={workspace.activeJourney}
          scopedData={workspace.scopedData}
          isArchive={workspace.isArchive}
          selection={state.selection}
          placeOpen={Boolean(state.cardCityId)}
          showOtherJourneys={workspace.showOtherJourneys}
          onShowOtherJourneysChange={workspace.setShowOtherJourneys}
          onStartReplay={workspace.startJourneyReplay}
          onOpenMemory={(view, mode) => {
            if (workspace.activeJourney) {
              workspace.memory.openJourneyMemory(
                workspace.activeJourney.id,
                view,
                mode,
              )
            }
          }}
          onExpand={workspace.resetOverview}
        />

        <WorkspaceChapterFooter
          footerRef={workspace.replaySafeFrame.footerRef}
          focusMode={workspace.focusMode}
          isArchive={workspace.isArchive}
          data={data}
          activeJourneyId={workspace.activeJourneyId}
          scopedData={workspace.scopedData}
          timeline={workspace.timeline}
          selection={state.selection}
          replayStartSignal={workspace.replayStartSignal}
          onOpenJourney={workspace.openJourney}
          onNewJourney={() => workspace.setEditorOpen(true)}
          onRandomMemory={workspace.openRandomMemory}
          onSelectTimelineNode={workspace.openTimelineNode}
          onFinishPlayback={() => workspace.setFinaleOpen(true)}
          onPlaybackRuntimeChange={workspace.setReplayRuntime}
        />
      </div>

      {workspace.scopedData && state.cardCityId && (
        <div
          inert={workspace.replayTakeover.active || undefined}
          className="rg-focus-place pointer-events-none absolute bottom-40 left-0 top-0 z-20 flex items-center px-3 sm:px-6"
        >
          <PlaceChapter
            data={workspace.scopedData}
            cityId={state.cardCityId}
            activeVisitId={state.selection.kind === 'visit'
              ? state.selection.visitId
              : undefined}
            selection={state.selection}
            onSelectVisit={actions.openVisit}
            onSelectTrip={workspace.handleSelectTrip}
            onOpenMemory={workspace.memory.openMemory}
            onClose={actions.closePlace}
          />
        </div>
      )}

      {!workspace.isArchive
        && !workspace.region
        && !state.cardCityId
        && state.selection.kind === 'none' && (
        <div className="rg-hint rg-focus-chrome pointer-events-none absolute bottom-48 left-1/2 z-10 max-w-[calc(100vw-2rem)] whitespace-nowrap rounded-full border border-white/10 bg-black/40 px-5 py-2 text-center text-xs tracking-[0.2em] text-white/55 backdrop-blur-md">
          点击城市、轨迹或章节，重新走进这段旅程
        </div>
      )}

      {workspace.memory.overlay.status === 'open' && workspace.memory.collection && (
        <MemoryStage
          collection={workspace.memory.collection}
          mode={workspace.memory.overlay.mode}
          view={workspace.memory.overlay.view}
          photoIndex={workspace.memory.overlay.photoIndex}
          onPhotoIndex={workspace.memory.setPhotoIndex}
          onMode={(mode) => workspace.memory.setMode(mode, 0)}
          onView={workspace.memory.setView}
          onClose={workspace.closeMemory}
        />
      )}
      {workspace.finaleOpen && workspace.activeJourney && workspace.finaleSummary && (
        <ReplayFinale
          journey={workspace.activeJourney}
          summary={workspace.finaleSummary}
          onClose={() => workspace.setFinaleOpen(false)}
          onReplay={workspace.startJourneyReplay}
        />
      )}
      {workspace.editorOpen && (
        <WorkspaceEditor
          data={data}
          storageError={storageError}
          lastSavedAt={lastSavedAt}
          initialJourneyId={workspace.activeJourneyId ?? undefined}
          onChange={workspace.applyEditorData}
          onClose={() => workspace.setEditorOpen(false)}
        />
      )}
      {workspace.commandOpen && (
        <TravelCommandPalette
          data={data}
          onOpenResult={workspace.openSearchResult}
          onRandomMemory={workspace.openRandomMemory}
          onClose={() => workspace.setCommandOpen(false)}
        />
      )}
      {workspace.focusMode && (
        <FocusModeBar
          journeyTitle={workspace.activeJourney?.title}
          onOpenCommand={() => workspace.setCommandOpen(true)}
          onReplay={workspace.activeJourney ? workspace.startJourneyReplay : undefined}
          onExit={() => workspace.setFocusMode(false)}
        />
      )}
    </div>
  )
}
