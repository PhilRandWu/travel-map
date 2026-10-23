import type { RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { ReplayRuntime } from '@/lib/replay'
import type { RouteCameraFraming } from '@/lib/routeCamera'
import type { Tracks } from '@/lib/tracks'
import { useVehiclePlayback } from '@/components/globe/hooks/useVehiclePlayback'
import { useVehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'
import { useVehicleDirectorCamera } from '@/components/globe/hooks/useVehicleDirectorCamera'

interface Options {
  tracks: Tracks
  selectedTripId: string | null
  playbackSignal: number
  replayRuntime: ReplayRuntime | null
  pageVisible: boolean
  directorEnabled: boolean
  globeRef: RefObject<GlobeMethods | undefined>
  framing: RouteCameraFraming
}

export function useVehicleScene({
  tracks,
  selectedTripId,
  playbackSignal,
  replayRuntime,
  pageVisible,
  directorEnabled,
  globeRef,
  framing,
}: Options) {
  const playback = useVehiclePlayback({
    tracks,
    selectedTripId,
    playbackSignal,
  })
  const runtime = useVehicleRuntime({
    playback,
    replayRuntime,
    pageVisible,
    globeRef,
  })
  const directorCamera = useVehicleDirectorCamera({
    globeRef,
    runtime,
    enabled: directorEnabled,
    framing,
  })

  return { playback, runtime, directorCamera }
}
