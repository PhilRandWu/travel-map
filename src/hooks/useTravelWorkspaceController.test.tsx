import { act, renderHook, waitFor } from '@testing-library/react'
import { useMemo, useReducer } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelNavigationActions } from '@/hooks/useTravelNavigation'
import { useTravelNavigation } from '@/hooks/useTravelNavigation'
import { useTravelWorkspaceController } from '@/hooks/useTravelWorkspaceController'
import {
  navigationReducer,
  type TravelNavigationState,
} from '@/lib/navigation'
import type { TravelData } from '@/types'

const data = dataJson as TravelData
const journeyState: TravelNavigationState = {
  scope: { kind: 'journey', journeyId: 'j001' },
  selection: { kind: 'none' },
  cardCityId: null,
  photo: null,
}

function useControllerHarness() {
  const [state, dispatch] = useReducer(navigationReducer, journeyState)
  const actions = useMemo<TravelNavigationActions>(() => ({
    openArchive: () => dispatch({ type: 'open-archive' }),
    openJourney: (journeyId) => dispatch({ type: 'open-journey', journeyId }),
    openCity: (cityId) => dispatch({ type: 'open-city', cityId }),
    openVisit: (visitId, cityId) => dispatch({
      type: 'open-visit',
      visitId,
      cityId,
    }),
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
  const workspace = useTravelWorkspaceController({
    data,
    state,
    actions,
    onDataChange: vi.fn(),
  })
  return { state, workspace }
}

describe('useTravelWorkspaceController', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    window.location.hash = '#journey=j001'
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('leaves focus mode before starting a journey replay', () => {
    const { result } = renderHook(() => {
      const { state, actions } = useTravelNavigation(data)
      return useTravelWorkspaceController({
        data,
        state,
        actions,
        onDataChange: vi.fn(),
      })
    })
    const initialSignal = result.current.replayStartSignal

    act(() => result.current.setFocusMode(true))
    expect(result.current.focusMode).toBe(true)

    act(() => result.current.startJourneyReplay())

    expect(result.current.focusMode).toBe(false)
    expect(result.current.replayStartSignal).toBe(initialSignal + 1)
  })

  it('keeps photo navigation valid when opening all journey photos', async () => {
    const { result } = renderHook(useControllerHarness)

    act(() => {
      result.current.workspace.memory.openJourneyMemory('j001', 'stage', 'all')
    })

    await waitFor(() => {
      expect(result.current.workspace.memory.overlay.status).toBe('open')
      expect(result.current.state.selection).toEqual({
        kind: 'visit',
        visitId: 'v001',
      })
      expect(result.current.state.cardCityId).toBe('hangzhou')
      expect(result.current.state.photo).toEqual({
        visitId: 'v001',
        file: '01.svg',
      })
    })
  })
})
