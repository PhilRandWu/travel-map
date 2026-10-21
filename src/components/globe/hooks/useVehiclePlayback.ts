import { useMemo } from 'react'
import type { Tracks } from '@/lib/tracks'
import { buildVehicleRoute, type VehicleRoute } from '@/lib/vehicle'

export interface VehiclePlayback {
  /** 每次点击生成新 key，即使重复选择同一条行程也会重新播放 */
  key: number
  type: VehicleRoute['type']
  route: VehicleRoute
  label: string
}

interface Options {
  tracks: Tracks
  selectedTripId: string | null
  playbackSignal: number
}

/** 把当前选中的行程转换为一次性载具播放描述；实际逐帧渲染交给覆盖层。 */
export function useVehiclePlayback({
  tracks,
  selectedTripId,
  playbackSignal,
}: Options): VehiclePlayback | null {
  return useMemo(() => {
    if (!selectedTripId) return null
    const track =
      tracks.flights.find((item) => item.trip.id === selectedTripId) ??
      tracks.trains.find((item) => item.trip.id === selectedTripId)
    if (!track) return null

    const route = buildVehicleRoute(track)
    return {
      key: playbackSignal,
      type: route.type,
      route,
      label: track.label,
    }
  }, [playbackSignal, selectedTripId, tracks])
}
