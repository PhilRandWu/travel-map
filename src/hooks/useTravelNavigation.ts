import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { TravelData } from '@/types'
import {
  INITIAL_NAVIGATION_STATE,
  navigationReducer,
  parseNavigationHash,
  sanitizeNavigationState,
  serializeNavigationHash,
} from '@/lib/navigation'

export interface TravelNavigationActions {
  openArchive: () => void
  openJourney: (journeyId: string) => void
  openCity: (cityId: string) => void
  openVisit: (visitId: string, cityId: string) => void
  openTrip: (tripId: string) => void
  openPhoto: (visitId: string, cityId: string, file: string) => void
  setPhoto: (visitId: string, file: string) => void
  clearPhoto: () => void
  closePlace: () => void
  clearSelection: () => void
}

export function useTravelNavigation(data: TravelData) {
  const [state, dispatch] = useReducer(
    navigationReducer,
    data,
    (initialData) => sanitizeNavigationState(
      typeof window === 'undefined'
        ? INITIAL_NAVIGATION_STATE
        : parseNavigationHash(window.location.hash),
      initialData,
    ),
  )
  const firstWriteRef = useRef(true)
  const actions = useMemo<TravelNavigationActions>(() => ({
    openArchive: () => dispatch({ type: 'open-archive' }),
    openJourney: (journeyId) => dispatch({ type: 'open-journey', journeyId }),
    openCity: (cityId) => dispatch({ type: 'open-city', cityId }),
    openVisit: (visitId, cityId) => dispatch({ type: 'open-visit', visitId, cityId }),
    openTrip: (tripId) => dispatch({ type: 'open-trip', tripId }),
    openPhoto: (visitId, cityId, file) => dispatch({
      type: 'open-photo',
      visitId,
      cityId,
      file,
    }),
    setPhoto: (visitId, file) => dispatch({
      type: 'set-photo',
      photo: { visitId, file },
    }),
    clearPhoto: () => dispatch({ type: 'set-photo', photo: null }),
    closePlace: () => dispatch({ type: 'close-place' }),
    clearSelection: () => dispatch({ type: 'clear-selection' }),
  }), [])

  useEffect(() => {
    const syncFromUrl = () => {
      const next = sanitizeNavigationState(
        parseNavigationHash(window.location.hash),
        data,
      )
      dispatch({ type: 'replace', state: next })
    }
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener('hashchange', syncFromUrl)
    return () => {
      window.removeEventListener('popstate', syncFromUrl)
      window.removeEventListener('hashchange', syncFromUrl)
    }
  }, [data])

  useEffect(() => {
    const next = sanitizeNavigationState(state, data)
    if (serializeNavigationHash(next) === serializeNavigationHash(state)) return
    dispatch({ type: 'replace', state: next })
  }, [data, state])

  useEffect(() => {
    const nextHash = serializeNavigationHash(state)
    const firstWrite = firstWriteRef.current
    firstWriteRef.current = false
    if (window.location.hash === nextHash) return
    const url = nextHash || `${window.location.pathname}${window.location.search}`

    if (firstWrite) {
      window.history.replaceState(null, '', url)
      return
    }
    window.history.pushState(null, '', url)
  }, [state])

  return { state, actions }
}
