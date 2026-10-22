import { useMemo, useReducer } from 'react'
import {
  INITIAL_NAVIGATION_STATE,
  navigationReducer,
} from '@/lib/navigation'

export interface TravelNavigationActions {
  openArchive: () => void
  openJourney: (journeyId: string) => void
  openCity: (cityId: string) => void
  openVisit: (visitId: string, cityId: string) => void
  openTrip: (tripId: string) => void
  closePlace: () => void
  clearSelection: () => void
}

export function useTravelNavigation() {
  const [state, dispatch] = useReducer(navigationReducer, INITIAL_NAVIGATION_STATE)
  const actions = useMemo<TravelNavigationActions>(() => ({
    openArchive: () => dispatch({ type: 'open-archive' }),
    openJourney: (journeyId) => dispatch({ type: 'open-journey', journeyId }),
    openCity: (cityId) => dispatch({ type: 'open-city', cityId }),
    openVisit: (visitId, cityId) => dispatch({ type: 'open-visit', visitId, cityId }),
    openTrip: (tripId) => dispatch({ type: 'open-trip', tripId }),
    closePlace: () => dispatch({ type: 'close-place' }),
    clearSelection: () => dispatch({ type: 'clear-selection' }),
  }), [])

  return { state, actions }
}
