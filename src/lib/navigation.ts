import type { JourneyScope, Selection, TravelData } from '@/types'

export interface PhotoNavigationTarget {
  visitId: string
  file: string
}

export interface TravelNavigationState {
  scope: JourneyScope
  selection: Selection
  cardCityId: string | null
  photo: PhotoNavigationTarget | null
}

export type TravelNavigationAction =
  | { type: 'open-archive' }
  | { type: 'open-journey'; journeyId: string }
  | { type: 'open-city'; cityId: string }
  | { type: 'open-visit'; visitId: string; cityId: string }
  | { type: 'open-trip'; tripId: string }
  | { type: 'open-photo'; visitId: string; cityId: string; file: string }
  | { type: 'set-photo'; photo: PhotoNavigationTarget | null }
  | { type: 'close-place' }
  | { type: 'clear-selection' }
  | { type: 'replace'; state: TravelNavigationState }

export const INITIAL_NAVIGATION_STATE: TravelNavigationState = {
  scope: { kind: 'archive' },
  selection: { kind: 'none' },
  cardCityId: null,
  photo: null,
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
        photo: null,
      }
    case 'open-city':
      return {
        ...state,
        selection: { kind: 'city', cityId: action.cityId },
        cardCityId: action.cityId,
        photo: null,
      }
    case 'open-visit':
      return {
        ...state,
        selection: { kind: 'visit', visitId: action.visitId },
        cardCityId: action.cityId,
        photo: null,
      }
    case 'open-trip':
      return {
        ...state,
        selection: { kind: 'trip', tripId: action.tripId },
        cardCityId: null,
        photo: null,
      }
    case 'open-photo':
      return {
        ...state,
        selection: { kind: 'visit', visitId: action.visitId },
        cardCityId: action.cityId,
        photo: { visitId: action.visitId, file: action.file },
      }
    case 'set-photo':
      return { ...state, photo: action.photo }
    case 'close-place':
    case 'clear-selection':
      return {
        ...state,
        selection: { kind: 'none' },
        cardCityId: null,
        photo: null,
      }
    case 'replace':
      return action.state
  }
}

export function parseNavigationHash(hash: string): TravelNavigationState {
  const raw = hash.replace(/^#/, '').replace(/^\?/, '')
  const params = new URLSearchParams(raw)
  const journeyId = params.get('journey')?.trim()
  if (!journeyId) return INITIAL_NAVIGATION_STATE

  const cityId = params.get('city')?.trim() || null
  const visitId = params.get('visit')?.trim() || null
  const tripId = params.get('trip')?.trim() || null
  let selection: Selection = { kind: 'none' }
  let cardCityId: string | null = null

  if (visitId) {
    selection = { kind: 'visit', visitId }
    cardCityId = cityId
  } else if (tripId) {
    selection = { kind: 'trip', tripId }
  } else if (cityId) {
    selection = { kind: 'city', cityId }
    cardCityId = cityId
  }

  const photoValue = params.get('photo') ?? ''
  const separator = photoValue.indexOf('/')
  const photo = separator > 0 && separator < photoValue.length - 1
    && photoValue.slice(0, separator) === visitId
    ? {
        visitId,
        file: photoValue.slice(separator + 1),
      }
    : null

  return {
    scope: { kind: 'journey', journeyId },
    selection,
    cardCityId,
    photo,
  }
}

export function serializeNavigationHash(
  state: TravelNavigationState,
): string {
  if (state.scope.kind === 'archive') return ''
  const params = new URLSearchParams()
  params.set('journey', state.scope.journeyId)

  if (state.cardCityId) params.set('city', state.cardCityId)
  if (state.selection.kind === 'visit') {
    params.set('visit', state.selection.visitId)
  } else if (state.selection.kind === 'trip') {
    params.set('trip', state.selection.tripId)
  }
  if (state.photo) {
    params.set('photo', `${state.photo.visitId}/${state.photo.file}`)
  }

  return `#${params.toString()}`
}

export function sanitizeNavigationState(
  state: TravelNavigationState,
  data: TravelData,
): TravelNavigationState {
  if (state.scope.kind === 'archive') return INITIAL_NAVIGATION_STATE
  const scope = state.scope
  const journey = data.journeys.find((item) => item.id === scope.journeyId)
  if (!journey) return INITIAL_NAVIGATION_STATE

  if (state.selection.kind === 'visit') {
    const visitId = state.selection.visitId
    const visit = data.visits.find((item) => (
      item.id === visitId && item.journeyId === journey.id
    ))
    if (!visit) {
      return {
        scope,
        selection: { kind: 'none' },
        cardCityId: null,
        photo: null,
      }
    }
    const photo = state.photo?.visitId === visit.id
      && visit.photos.some((item) => item.file === state.photo?.file)
      ? state.photo
      : null
    return {
      scope,
      selection: state.selection,
      cardCityId: visit.city,
      photo,
    }
  }

  if (state.selection.kind === 'trip') {
    const tripId = state.selection.tripId
    const trip = data.trips.find((item) => (
      item.id === tripId && item.journeyId === journey.id
    ))
    if (!trip) {
      return {
        scope,
        selection: { kind: 'none' },
        cardCityId: null,
        photo: null,
      }
    }
    return {
      scope,
      selection: state.selection,
      cardCityId: null,
      photo: null,
    }
  }

  if (state.selection.kind === 'city') {
    const cityId = state.selection.cityId
    const visit = data.visits.find((item) => (
      item.city === cityId && item.journeyId === journey.id
    ))
    return visit
      ? {
          scope,
          selection: state.selection,
          cardCityId: cityId,
          photo: null,
        }
      : {
          scope,
          selection: { kind: 'none' },
          cardCityId: null,
          photo: null,
        }
  }

  return {
    scope,
    selection: { kind: 'none' },
    cardCityId: null,
    photo: null,
  }
}
