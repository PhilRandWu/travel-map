import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import { useTravelNavigation } from '@/hooks/useTravelNavigation'
import { useTravelWorkspaceController } from '@/hooks/useTravelWorkspaceController'
import type { TravelData } from '@/types'

const data = dataJson as TravelData

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
})
