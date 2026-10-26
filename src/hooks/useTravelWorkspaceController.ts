import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PickedRegion } from '@/components/globe/pickedRegion'
import { useGeoDataPreload } from '@/hooks/useGeoDataPreload'
import { useFocusIdle } from '@/hooks/useFocusIdle'
import { useJourneyMemory } from '@/hooks/useJourneyMemory'
import { useReplaySafeFrame } from '@/hooks/useReplaySafeFrame'
import { useReplayTakeover } from '@/hooks/useReplayTakeover'
import { useScopedTravelData } from '@/hooks/useScopedTravelData'
import type { TravelNavigationActions } from '@/hooks/useTravelNavigation'
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts'
import { resolveCity } from '@/lib/cities'
import { findTrip } from '@/lib/derive'
import { selectionWasRemoved } from '@/lib/editorSelection'
import { getOtherJourneyTrips, summarizeJourney } from '@/lib/journeys'
import type { TravelNavigationState } from '@/lib/navigation'
import type { ReplayRuntime } from '@/lib/replay'
import { buildTracks, type Tracks } from '@/lib/tracks'
import { pickRandomMemory } from '@/lib/travelDiscovery'
import type { TravelSearchResult } from '@/lib/travelSearch'
import type { TravelData } from '@/types'

const EMPTY_TRACKS: Tracks = { flights: [], trains: [] }

interface Options {
  data: TravelData
  state: TravelNavigationState
  actions: TravelNavigationActions
  onDataChange: (data: TravelData) => void
}

export function useTravelWorkspaceController({
  data,
  state,
  actions,
  onDataChange,
}: Options) {
  const { scopedData, litCities, homeCity, timeline, stats } =
    useScopedTravelData(data, state.scope)
  const tracks = useMemo(
    () => (scopedData ? buildTracks(scopedData) : EMPTY_TRACKS),
    [scopedData],
  )
  const [region, setRegion] = useState<PickedRegion | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [tripPlaybackSignal, setTripPlaybackSignal] = useState(0)
  const [replayRuntime, setReplayRuntime] = useState<ReplayRuntime | null>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const [globeFailed, setGlobeFailed] = useState(false)
  const [showOtherJourneys, setShowOtherJourneys] = useState(false)
  const [replayStartSignal, setReplayStartSignal] = useState(0)
  const [finaleOpen, setFinaleOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const focusIdle = useFocusIdle(focusMode)
  const previousPhotoRef = useRef(state.photo)
  useGeoDataPreload()

  const isArchive = state.scope.kind === 'archive'
  const activeJourneyId = state.scope.kind === 'journey'
    ? state.scope.journeyId
    : null
  const activeJourney = activeJourneyId
    ? data.journeys.find((journey) => journey.id === activeJourneyId)
    : undefined
  const selectedTripId = state.selection.kind === 'trip'
    ? state.selection.tripId
    : null
  const activePlaceName = state.cardCityId
    ? resolveCity(data, state.cardCityId)?.name
    : undefined
  const memory = useJourneyMemory(data, activeJourneyId ?? 'archive')
  const replayTakeover = useReplayTakeover(replayRuntime)
  const replaySafeFrame = useReplaySafeFrame()
  const stardustTracks = useMemo(() => {
    if (!activeJourneyId || !showOtherJourneys) return EMPTY_TRACKS
    return buildTracks({
      ...data,
      journeys: [],
      trips: getOtherJourneyTrips(data, activeJourneyId),
      visits: [],
    })
  }, [activeJourneyId, data, showOtherJourneys])
  const focusPoint = useMemo(() => {
    if (!selectedTripId) return null
    const track = [...tracks.flights, ...tracks.trains]
      .find((item) => item.trip.id === selectedTripId)
    return track ? {
      lat: (track.fromLat + track.toLat) / 2,
      lng: (track.fromLng + track.toLng) / 2,
    } : null
  }, [selectedTripId, tracks])

  useEffect(() => {
    setShowOtherJourneys(false)
    setReplayStartSignal(0)
    setFinaleOpen(false)
  }, [activeJourneyId])

  useEffect(() => {
    if (!state.photo || !activeJourneyId) return
    if (memory.overlay.status === 'open') return
    const visit = data.visits.find((item) => (
      item.id === state.photo?.visitId && item.journeyId === activeJourneyId
    ))
    if (!visit) return
    memory.openMemoryPhoto({ kind: 'visit', visitId: visit.id }, state.photo.file)
  }, [
    activeJourneyId,
    data.visits,
    memory.openMemoryPhoto,
    memory.overlay.status,
    state.photo,
  ])

  useEffect(() => {
    if (memory.overlay.status !== 'open') return
    const photo = memory.photos[memory.overlay.photoIndex]
    if (!photo) return
    if (state.photo?.visitId === photo.visitId && state.photo.file === photo.file) return
    actions.setPhoto(photo.visitId, photo.file)
  }, [actions, memory.overlay, memory.photos, state.photo])

  useEffect(() => {
    const previous = previousPhotoRef.current
    previousPhotoRef.current = state.photo
    if (previous && !state.photo && memory.overlay.status === 'open') {
      memory.close()
    }
  }, [memory.close, memory.overlay.status, state.photo])

  const openJourney = (journeyId: string) => {
    setReplayRuntime(null)
    setRegion(null)
    setShowOtherJourneys(false)
    setReplayStartSignal(0)
    setFinaleOpen(false)
    setResetSignal((signal) => signal + 1)
    actions.openJourney(journeyId)
  }

  const openArchive = () => {
    setReplayRuntime(null)
    setRegion(null)
    setShowOtherJourneys(false)
    setReplayStartSignal(0)
    setFinaleOpen(false)
    setResetSignal((signal) => signal + 1)
    actions.openArchive()
  }

  const openTimelineNode = (node: (typeof timeline)[number]) => {
    setRegion(null)
    if (node.kind === 'visit') {
      actions.openVisit(node.refId, node.cityId)
      return
    }
    const trip = scopedData ? findTrip(scopedData, node.refId) : undefined
    if (trip) {
      actions.openTrip(trip.id)
      setTripPlaybackSignal((signal) => signal + 1)
    }
  }

  const handleSelectTrip = (tripId: string) => {
    actions.openTrip(tripId)
    setRegion(null)
    setTripPlaybackSignal((signal) => signal + 1)
  }

  const resetOverview = useCallback(() => {
    actions.clearSelection()
    setRegion(null)
    setResetSignal((signal) => signal + 1)
  }, [actions])

  const startJourneyReplay = () => {
    setFocusMode(false)
    setRegion(null)
    setFinaleOpen(false)
    setReplayStartSignal((signal) => signal + 1)
  }

  const closeMemory = () => {
    memory.close()
    actions.clearPhoto()
  }

  const openSearchResult = (result: TravelSearchResult) => {
    setCommandOpen(false)
    openJourney(result.journeyId)
    if (result.kind === 'visit' && result.visitId && result.cityId) {
      actions.openVisit(result.visitId, result.cityId)
    } else if (result.kind === 'trip' && result.tripId) {
      actions.openTrip(result.tripId)
      setTripPlaybackSignal((signal) => signal + 1)
    } else if (
      result.kind === 'photo'
      && result.visitId
      && result.cityId
      && result.photoFile
    ) {
      actions.openVisit(result.visitId, result.cityId)
      actions.openPhoto(result.visitId, result.cityId, result.photoFile)
    }
  }

  const openRandomMemory = () => {
    const target = pickRandomMemory(data)
    if (!target) return
    setCommandOpen(false)
    openJourney(target.journeyId)
    actions.openVisit(target.visitId, target.cityId)
    if (target.photoFile) {
      actions.openPhoto(target.visitId, target.cityId, target.photoFile)
    }
  }

  const blocked = editorOpen
    || commandOpen
    || finaleOpen
    || memory.overlay.status === 'open'
    || replayTakeover.active
  useWorkspaceShortcuts({
    blocked,
    onCommandOpen: () => setCommandOpen(true),
    onToggleFocus: () => setFocusMode((current) => !current),
    onExitFocus: () => setFocusMode(false),
  })

  const applyEditorData = (next: TravelData) => {
    if (selectionWasRemoved(state.selection, next)) actions.clearSelection()
    onDataChange(next)
  }

  const finaleSummary = activeJourney
    ? summarizeJourney(data, activeJourney)
    : null

  return {
    scopedData,
    litCities,
    homeCity,
    timeline,
    stats,
    tracks,
    stardustTracks,
    region,
    setRegion,
    resetSignal,
    tripPlaybackSignal,
    replayRuntime,
    setReplayRuntime,
    globeReady,
    setGlobeReady,
    globeFailed,
    setGlobeFailed,
    showOtherJourneys,
    setShowOtherJourneys,
    replayStartSignal,
    finaleOpen,
    setFinaleOpen,
    editorOpen,
    setEditorOpen,
    focusMode,
    focusIdle,
    setFocusMode,
    commandOpen,
    setCommandOpen,
    isArchive,
    activeJourneyId,
    activeJourney,
    selectedTripId,
    activePlaceName,
    memory,
    replayTakeover,
    replaySafeFrame,
    focusPoint,
    finaleSummary,
    openJourney,
    openArchive,
    openTimelineNode,
    handleSelectTrip,
    resetOverview,
    startJourneyReplay,
    closeMemory,
    openSearchResult,
    openRandomMemory,
    applyEditorData,
  }
}
