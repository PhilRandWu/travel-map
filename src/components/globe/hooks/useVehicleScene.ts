import type { RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { ReplayRuntime } from '@/lib/replay'
import type { Tracks } from '@/lib/tracks'
import { useVehiclePlayback } from '@/components/globe/hooks/useVehiclePlayback'
import { useVehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'
import { useVehicleChaseCamera } from '@/components/globe/hooks/useVehicleChaseCamera'

interface Options {
  tracks: Tracks
  selectedTripId: string | null
  playbackSignal: number
  replayRuntime: ReplayRuntime | null
  pageVisible: boolean
  chaseEnabled: boolean
  globeRef: RefObject<GlobeMethods | undefined>
}

export function useVehicleScene({
  tracks,
  selectedTripId,
  playbackSignal,
  replayRuntime,
  pageVisible,
  chaseEnabled,
  globeRef,
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
  const chaseCamera = useVehicleChaseCamera({
    globeRef,
    runtime,
    enabled: chaseEnabled,
  })

  return { playback, runtime, chaseCamera }
}
