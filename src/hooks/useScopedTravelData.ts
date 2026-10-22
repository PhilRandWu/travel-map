import { useMemo } from 'react'
import type { JourneyScope, TravelData } from '@/types'
import {
  buildTimelineNodes,
  computeStats,
  selectLitCities,
} from '@/lib/derive'
import { getHomeCity, scopeTravelData } from '@/lib/journeys'

export function useScopedTravelData(data: TravelData | null, scope: JourneyScope) {
  return useMemo(() => {
    if (!data) {
      return {
        scopedData: null,
        litCities: [],
        homeCity: undefined,
        timeline: [],
        stats: null,
      }
    }

    const scopedData = scopeTravelData(data, scope)

    return {
      scopedData,
      litCities: selectLitCities(scopedData),
      homeCity: getHomeCity(data),
      timeline: buildTimelineNodes(scopedData),
      stats: computeStats(scopedData),
    }
  }, [data, scope])
}
