import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { usePageVisibility } from '@/components/motion/usePageVisibility'

export type SceneClockListener = (now: number) => void

export interface SceneClock {
  subscribe: (listener: SceneClockListener, priority?: number) => () => void
  now: () => number
}

const SceneClockContext = createContext<SceneClock | null>(null)

export function SceneClockProvider({ children }: { children: ReactNode }) {
  const pageVisible = usePageVisibility()
  const listenersRef = useRef(new Map<SceneClockListener, number>())
  const frameRef = useRef<number | null>(null)
  const nowRef = useRef(0)

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const tick = useCallback((now: number) => {
    nowRef.current = now
    frameRef.current = null
    if (!pageVisible) return

    const listeners = [...listenersRef.current.entries()]
      .sort((left, right) => left[1] - right[1])
    for (const [listener] of listeners) listener(now)

    if (listenersRef.current.size > 0 && pageVisible) {
      frameRef.current = requestAnimationFrame(tick)
    }
  }, [pageVisible])

  const ensureRunning = useCallback(() => {
    if (
      frameRef.current === null
      && pageVisible
      && listenersRef.current.size > 0
    ) {
      frameRef.current = requestAnimationFrame(tick)
    }
  }, [pageVisible, tick])

  const subscribe = useCallback((
    listener: SceneClockListener,
    priority = 0,
  ) => {
    listenersRef.current.set(listener, priority)
    ensureRunning()
    return () => {
      listenersRef.current.delete(listener)
      if (listenersRef.current.size === 0) stop()
    }
  }, [ensureRunning, stop])

  useEffect(() => {
    if (pageVisible) ensureRunning()
    else stop()
  }, [ensureRunning, pageVisible, stop])

  useEffect(() => stop, [stop])

  const value = useMemo<SceneClock>(() => ({
    subscribe,
    now: () => nowRef.current,
  }), [subscribe])

  return (
    <SceneClockContext.Provider value={value}>
      {children}
    </SceneClockContext.Provider>
  )
}

export function useSceneClock(): SceneClock {
  const clock = useContext(SceneClockContext)
  if (!clock) throw new Error('useSceneClock must be used inside SceneClockProvider')
  return clock
}
