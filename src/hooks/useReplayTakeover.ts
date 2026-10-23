import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReplayRuntime } from '@/lib/replay'

export function useReplayTakeover(replayRuntime: ReplayRuntime | null) {
  const [directorActive, setDirectorActive] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const activeRef = useRef(false)
  const replayActive = replayRuntime !== null
    && replayRuntime.status !== 'idle'
    && replayRuntime.activeIndex >= 0
  const active = directorActive || replayActive

  useEffect(() => {
    if (active === activeRef.current) return
    activeRef.current = active

    if (active) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-replay-toggle]')?.focus()
      })
      return
    }

    const previous = previousFocusRef.current
    previousFocusRef.current = null
    if (!previous?.isConnected) return
    requestAnimationFrame(() => {
      if (!document.querySelector('[role="dialog"]')) previous.focus()
    })
  }, [active])

  const onDirectorCameraChange = useCallback((next: boolean) => {
    setDirectorActive(next)
  }, [])

  return { active, onDirectorCameraChange }
}
