import type { JourneyScope, Selection } from '@/types'

export interface TravelNavigationState {
  scope: JourneyScope
  selection: Selection
  cardCityId: string | null
}

export type TravelNavigationAction =
  | { type: 'open-archive' }
  | { type: 'open-journey'; journeyId: string }
  | { type: 'open-city'; cityId: string }
  | { type: 'open-visit'; visitId: string; cityId: string }
  | { type: 'open-trip'; tripId: string }
  | { type: 'close-place' }
  | { type: 'clear-selection' }

export const INITIAL_NAVIGATION_STATE: TravelNavigationState = {
  scope: { kind: 'archive' },
  selection: { kind: 'none' },
  cardCityId: null,
}

export function navigationReducer(
  state: TravelNavigationState,
  action: TravelNavigationAction,
): TravelNavigationState {
  switch (action.type) {
    case 'open-archive':
      return INITIAL_NAVIGATION_STATE
    case 'open-journey':
      return {
        scope: { kind: 'journey', journeyId: action.journeyId },
        selection: { kind: 'none' },
        cardCityId: null,
      }
    case 'open-city':
      return {
        ...state,
        selection: { kind: 'city', cityId: action.cityId },
        cardCityId: action.cityId,
      }
    case 'open-visit':
      return {
        ...state,
        selection: { kind: 'visit', visitId: action.visitId },
        cardCityId: action.cityId,
      }
    case 'open-trip':
      return {
        ...state,
        selection: { kind: 'trip', tripId: action.tripId },
        cardCityId: null,
      }
    case 'close-place':
    case 'clear-selection':
      return {
        ...state,
        selection: { kind: 'none' },
        cardCityId: null,
      }
  }
}
