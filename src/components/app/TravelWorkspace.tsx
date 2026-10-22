import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import CityCard from '@/components/city/CityCard'
import GlobeLoader from '@/components/common/GlobeLoader'
import Starfield from '@/components/globe/Starfield'
import type { PickedRegion } from '@/components/globe/pickedRegion'
import HeroPhoto from '@/components/hero/HeroPhoto'
import JourneyArchive from '@/components/journey/JourneyArchive'
import JourneyBreadcrumb from '@/components/journey/JourneyBreadcrumb'
import JourneyChapterRail from '@/components/journey/JourneyChapterRail'
import JourneyPassport from '@/components/journey/JourneyPassport'
import PhotoGrouping from '@/components/photos/PhotoGrouping'
import StatsPanel from '@/components/stats/StatsPanel'
import { useScopedTravelData } from '@/hooks/useScopedTravelData'
import { useTravelNavigation } from '@/hooks/useTravelNavigation'
import { resolveCity } from '@/lib/cities'
import { findTrip } from '@/lib/derive'
import { preloadGeoData } from '@/lib/geoLookup'
import { getOtherJourneyTrips } from '@/lib/journeys'
import type { ReplayRuntime } from '@/lib/replay'
import { buildTracks, type Tracks } from '@/lib/tracks'
import type { TravelData } from '@/types'

const TravelGlobe = lazy(() => import('@/components/globe/TravelGlobe'))
const EMPTY_TRACKS: Tracks = { flights: [], trains: [] }

interface Props {
  data: TravelData
}

export default function TravelWorkspace({ data }: Props) {
  const { state, actions } = useTravelNavigation()
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
  const [showOtherJourneys, setShowOtherJourneys] = useState(false)
  const [replayStartSignal, setReplayStartSignal] = useState(0)
  const isArchive = state.scope.kind === 'archive'
  const activeJourneyId = state.scope.kind === 'journey' ? state.scope.journeyId : null
  const activeJourney = activeJourneyId
    ? data.journeys.find((journey) => journey.id === activeJourneyId)
    : undefined
  const selectedTripId = state.selection.kind === 'trip' ? state.selection.tripId : null
  const activePlaceName = state.cardCityId
    ? resolveCity(data, state.cardCityId)?.name
    : undefined
  const stardustTracks = useMemo(() => {
    if (!activeJourneyId || !showOtherJourneys) return EMPTY_TRACKS

    return buildTracks({
      ...data,
      journeys: [],
      trips: getOtherJourneyTrips(data, activeJourneyId),
      visits: [],
    })
  }, [activeJourneyId, data, showOtherJourneys])

  useEffect(() => {
    const idle = (window as unknown as {
      requestIdleCallback?: (callback: () => void) => number
    }).requestIdleCallback

    if (idle) {
      idle(() => preloadGeoData())
      return
    }

    const timer = setTimeout(preloadGeoData, 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setShowOtherJourneys(false)
    setReplayStartSignal(0)
  }, [activeJourneyId])

  const focusPoint = useMemo(() => {
    if (!selectedTripId) return null
    const track = [...tracks.flights, ...tracks.trains]
      .find((item) => item.trip.id === selectedTripId)

    return track ? {
      lat: (track.fromLat + track.toLat) / 2,
      lng: (track.fromLng + track.toLng) / 2,
    } : null
  }, [selectedTripId, tracks])

  const openJourney = (journeyId: string) => {
    setReplayRuntime(null)
    setRegion(null)
    setShowOtherJourneys(false)
    setReplayStartSignal(0)
    setResetSignal((signal) => signal + 1)
    actions.openJourney(journeyId)
  }

  const openArchive = () => {
    setReplayRuntime(null)
    setRegion(null)
    setShowOtherJourneys(false)
    setReplayStartSignal(0)
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
    setRegion(null)
    setReplayStartSignal((signal) => signal + 1)
  }

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden bg-black font-sans text-white select-none">
      <Starfield />
      <main id="travel-map-main" aria-label="旅行足迹地图" className="absolute inset-0">
        <Suspense fallback={null}>
          <TravelGlobe
            litCities={litCities}
            homeCity={homeCity}
            tracks={tracks}
            stardustTracks={stardustTracks}
            selectedCityId={state.cardCityId}
            selectedTripId={selectedTripId}
            focusPoint={focusPoint}
            tripPlaybackSignal={tripPlaybackSignal}
            replayRuntime={replayRuntime}
            resetSignal={resetSignal}
            onReady={() => setGlobeReady(true)}
            onSelectCity={(cityId) => {
              setRegion(null)
              if (cityId) actions.openCity(cityId)
              else actions.closePlace()
            }}
            onSelectTrip={handleSelectTrip}
            region={region}
            onPick={(next) => {
              setRegion(next)
              actions.clearSelection()
            }}
          />
        </Suspense>
      </main>
      <GlobeLoader ready={globeReady} />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
        <header className="rg-app-reveal flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <JourneyBreadcrumb
            scope={state.scope}
            journey={activeJourney}
            placeName={activePlaceName}
            onArchive={openArchive}
            onJourney={resetOverview}
          />
          <div className="flex shrink-0 items-center gap-2 text-xs text-white/50 sm:gap-3">
            {isArchive && <PhotoGrouping data={data} />}
            <StatsPanel stats={stats} context={activeJourney?.title} />
          </div>
        </header>

        <div className="rg-scroll flex max-h-full flex-1 flex-col items-end gap-3 overflow-y-auto px-4 py-2 sm:px-6">
          {activeJourney && scopedData && (
            <JourneyPassport
              data={scopedData}
              journey={activeJourney}
              onStartReplay={startJourneyReplay}
              showOtherJourneys={showOtherJourneys}
              onShowOtherJourneysChange={setShowOtherJourneys}
            />
          )}
          {!isArchive && scopedData && state.selection.kind !== 'none' && (
            <div className="hidden sm:block">
              <HeroPhoto
                data={scopedData}
                selection={state.selection}
                onExpand={resetOverview}
              />
            </div>
          )}
        </div>

        <footer className="rg-app-reveal px-3 pb-3 sm:px-6 sm:pb-5">
          {isArchive ? (
            <JourneyArchive data={data} onOpenJourney={openJourney} />
          ) : scopedData ? (
            <JourneyChapterRail
              key={activeJourneyId ?? 'journey'}
              data={scopedData}
              nodes={timeline}
              selection={state.selection}
              startSignal={replayStartSignal}
              onSelect={openTimelineNode}
              onFinishPlayback={resetOverview}
              onPlaybackRuntimeChange={setReplayRuntime}
            />
          ) : null}
        </footer>
      </div>

      {scopedData && state.cardCityId && (
        <div className="pointer-events-none absolute bottom-40 left-0 top-0 z-20 flex items-center px-3 sm:px-6">
          <CityCard
            data={scopedData}
            cityId={state.cardCityId}
            selection={state.selection}
            onSelectTrip={handleSelectTrip}
            onClose={actions.closePlace}
          />
        </div>
      )}

      {!isArchive && !region && !state.cardCityId && state.selection.kind === 'none' && (
        <div className="rg-hint pointer-events-none absolute bottom-48 left-1/2 z-10 max-w-[calc(100vw-2rem)] whitespace-nowrap rounded-full border border-white/10 bg-black/40 px-5 py-2 text-center text-xs tracking-[0.2em] text-white/55 backdrop-blur-md">
          点击城市、轨迹或章节，重新走进这段旅程
        </div>
      )}
    </div>
  )
}
