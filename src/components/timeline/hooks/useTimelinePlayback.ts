import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimelineNode } from '@/lib/derive'
import {
  getReplayProgress,
  seekReplayPlan,
  type ReplayPlan,
  type ReplaySpeed,
} from '@/lib/replay'

export type PlaybackStatus = 'idle' | 'playing' | 'paused'

interface Options {
  plan: ReplayPlan
  onActivate: (node: TimelineNode) => void
  onFinish: () => void
}

interface PlaybackPosition {
  index: number
  elapsedMs: number
}

const UI_UPDATE_INTERVAL_MS = 80
const MAX_FRAME_DELTA_MS = 120

export function useTimelinePlayback({
  plan,
  onActivate,
  onFinish,
}: Options) {
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [speed, setSpeed] = useState<ReplaySpeed>(1)
  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)

  const planRef = useRef(plan)
  const statusRef = useRef(status)
  const speedRef = useRef(speed)
  const positionRef = useRef<PlaybackPosition>({ index: 0, elapsedMs: 0 })
  const frameTimeRef = useRef(0)
  const lastUiUpdateRef = useRef(0)
  const callbacksRef = useRef({ onActivate, onFinish })
  planRef.current = plan
  statusRef.current = status
  speedRef.current = speed
  callbacksRef.current = { onActivate, onFinish }

  const applyPosition = useCallback((position: PlaybackPosition) => {
    positionRef.current = position
    setActiveIndex(position.index)
    setProgress(getReplayProgress(
      planRef.current,
      position.index,
      position.elapsedMs,
    ))
  }, [])

  const start = useCallback(() => {
    const currentPlan = planRef.current
    if (currentPlan.steps.length === 0) return
    applyPosition({ index: 0, elapsedMs: 0 })
    callbacksRef.current.onActivate(currentPlan.steps[0].node)
    frameTimeRef.current = performance.now()
    lastUiUpdateRef.current = frameTimeRef.current
    setStatus('playing')
  }, [applyPosition])

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    setStatus('playing')
  }, [])

  const toggle = useCallback(() => {
    if (statusRef.current === 'playing') pause()
    else if (statusRef.current === 'paused') resume()
    else start()
  }, [pause, resume, start])

  const seek = useCallback((nextProgress: number) => {
    const currentPlan = planRef.current
    const position = seekReplayPlan(currentPlan, nextProgress)
    if (!position) return
    applyPosition(position)
    callbacksRef.current.onActivate(currentPlan.steps[position.index].node)
    frameTimeRef.current = performance.now()
    if (statusRef.current === 'idle') setStatus('paused')
  }, [applyPosition])

  const stop = useCallback(() => {
    positionRef.current = { index: 0, elapsedMs: 0 }
    setStatus('idle')
    setActiveIndex(-1)
    setProgress(0)
  }, [])

  useEffect(() => {
    if (status !== 'playing') return
    let animationFrame = 0
    let cancelled = false
    frameTimeRef.current = performance.now()

    const tick = (now: number) => {
      if (cancelled) return
      const currentPlan = planRef.current
      const delta = Math.min(
        MAX_FRAME_DELTA_MS,
        Math.max(0, now - frameTimeRef.current),
      ) * speedRef.current
      frameTimeRef.current = now

      let index = positionRef.current.index
      let elapsedMs = positionRef.current.elapsedMs + delta
      let indexChanged = false

      while (
        index < currentPlan.steps.length
        && elapsedMs >= currentPlan.steps[index].durationMs
      ) {
        elapsedMs -= currentPlan.steps[index].durationMs
        index += 1
        indexChanged = true
        if (index < currentPlan.steps.length) {
          callbacksRef.current.onActivate(currentPlan.steps[index].node)
        }
      }

      if (index >= currentPlan.steps.length) {
        const last = currentPlan.steps.length - 1
        positionRef.current = {
          index: last,
          elapsedMs: currentPlan.steps[last]?.durationMs ?? 0,
        }
        setActiveIndex(last)
        setProgress(1)
        setStatus('idle')
        callbacksRef.current.onFinish()
        return
      }

      positionRef.current = { index, elapsedMs }
      if (indexChanged) setActiveIndex(index)
      if (indexChanged || now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
        lastUiUpdateRef.current = now
        setProgress(getReplayProgress(currentPlan, index, elapsedMs))
      }
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)
    }
  }, [status])

  return {
    status,
    speed,
    progress,
    activeIndex,
    isPlaying: status === 'playing',
    toggle,
    stop,
    seek,
    setSpeed,
  }
}
