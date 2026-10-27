import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import data from '@/data/trips.json'
import type { TransportType, TravelData } from '@/types'
import { buildTracks } from '@/lib/tracks'
import type { ReplayRuntime } from '@/lib/replay'
import { useTrackPresentation } from '@/components/globe/hooks/useTrackPresentation'

const allTypes: TransportType[] = ['flight', 'train', 'metro', 'ship', 'car']
const travelData: TravelData = {
  ...(data as TravelData),
  trips: allTypes.map((type, index) => ({
    id: `route-${type}`,
    journeyId: data.journeys[0]?.id ?? 'journey-test',
    date: `2025-05-0${index + 1}`,
    type,
    from: 'beijing',
    to: 'shanghai',
    waypoints: ['jiaxing'],
  })),
}

describe('useTrackPresentation', () => {
  it('maps unified routes into arc legs and surface paths', () => {
    const tracks = buildTracks(travelData)
    const { result } = renderHook(() => useTrackPresentation({
      tracks,
      selectedTripId: 'route-ship',
      replayRuntime: null,
      lastInteractRef: { current: 0 },
      onSelectTripRef: { current: vi.fn() },
    }))

    expect(result.current.visibleTrackCounts).toEqual({
      total: 5,
      surface: 4,
      stardust: 0,
    })
    expect(result.current.activeRoute?.trip.id).toBe('route-ship')
    expect(result.current.activeRoute?.stops.map((city) => city.id))
      .toEqual(['beijing', 'jiaxing', 'shanghai'])
    expect(result.current.trackProps.arcsData).toHaveLength(2)
    expect(result.current.trackProps.pathsData).toHaveLength(4)
  })

  it('keeps the current replay route active for waypoint markers', () => {
    const tracks = buildTracks(travelData)
    const replayRuntime: ReplayRuntime = {
      status: 'playing',
      activeIndex: 0,
      seekRevision: 0,
      plan: {
        steps: [{
          node: {
            kind: 'trip',
            date: '2025-05-04',
            refId: 'route-ship',
            cityId: 'beijing',
            label: '',
          },
          startMs: 0,
          durationMs: 1000,
        }],
        totalMs: 1000,
      },
      getPosition: () => ({ index: 0, elapsedMs: 0 }),
    }
    const { result } = renderHook(() => useTrackPresentation({
      tracks,
      selectedTripId: null,
      replayRuntime,
      lastInteractRef: { current: 0 },
      onSelectTripRef: { current: vi.fn() },
    }))

    expect(result.current.activeRoute?.trip.id).toBe('route-ship')
    expect(result.current.activeCityIds).toEqual(
      new Set(['beijing', 'jiaxing', 'shanghai']),
    )
  })
})
