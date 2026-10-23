import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { ReplayRuntime } from '@/lib/replay'
import type { VehiclePlayback } from '@/lib/vehicle'
import {
  buildVehicleRuntimeFrame,
  type VehicleRuntimeFrame,
} from '@/lib/vehicleRuntime'
import { vehicleNodeDurationMs } from '@/lib/vehicleMotion'
import { useSceneClock } from '@/components/scene/SceneClockProvider'

type FrameListener = (frame: VehicleRuntimeFrame | null) => void

export interface VehicleRuntime {
  subscribe: (listener: FrameListener, priority?: number) => () => void
  getFrame: () => VehicleRuntimeFrame | null
}

interface Options {
  playback: VehiclePlayback | null
  replayRuntime: ReplayRuntime | null
  pageVisible: boolean
  globeRef: RefObject<GlobeMethods | undefined>
}

interface ReplayFollowing {
  playback: VehiclePlayback
  index: number
}

const MAX_FRAME_DELTA_MS = 120

export function useVehicleRuntime({
  playback,
  replayRuntime,
  pageVisible,
  globeRef,
}: Options): VehicleRuntime {
  const frameRef = useRef<VehicleRuntimeFrame | null>(null)
  const listenersRef = useRef(new Map<FrameListener, number>())
  const singleElapsedRef = useRef(0)
  const singleKeyRef = useRef<number | null>(null)
  const replayFollowingRef = useRef<ReplayFollowing | null>(null)
  const clock = useSceneClock()

  const emit = useCallback((frame: VehicleRuntimeFrame | null) => {
    frameRef.current = frame
    const listeners = [...listenersRef.current.entries()]
      .sort((left, right) => left[1] - right[1])
    for (const [listener] of listeners) listener(frame)
  }, [])

  const subscribe = useCallback((listener: FrameListener, priority = 0) => {
    listenersRef.current.set(listener, priority)
    listener(frameRef.current)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const getFrame = useCallback(() => frameRef.current, [])

  useEffect(() => {
    if (!globeRef.current) {
      emit(null)
      return
    }

    if (!playback) {
      const following = replayFollowingRef.current
      if (
        following
        && replayRuntime
        && replayRuntime.activeIndex > following.index
      ) {
        emit(buildVehicleRuntimeFrame(
          following.playback,
          vehicleNodeDurationMs(following.playback.route.durationMs),
          replayRuntime.seekRevision,
        ))
        replayFollowingRef.current = null
      } else {
        replayFollowingRef.current = null
        emit(null)
      }
      return
    }

    if (replayRuntime && replayRuntime.status !== 'idle') {
      if (replayRuntime.activeIndex < 0) {
        replayFollowingRef.current = null
        emit(null)
        return
      }

      const drawReplay = () => {
        const position = replayRuntime.getPosition()
        const step = replayRuntime.plan.steps[position.index]
        if (step?.node.kind === 'trip' && step.node.refId === playback.tripId) {
          replayFollowingRef.current = { playback, index: position.index }
          const frame = buildVehicleRuntimeFrame(
            playback,
            position.elapsedMs,
            replayRuntime.seekRevision,
          )
          emit(frame)
          return frame
        }

        const following = replayFollowingRef.current
        if (following && position.index > following.index) {
          const frame = buildVehicleRuntimeFrame(
            following.playback,
            vehicleNodeDurationMs(following.playback.route.durationMs),
            replayRuntime.seekRevision,
          )
          emit(frame)
          replayFollowingRef.current = null
          return frame
        }

        replayFollowingRef.current = null
        emit(null)
        return null
      }

      let unsubscribe: (() => void) | null = null
      const replayFrame = () => {
        const frame = drawReplay()
        if (frame?.stage === 'complete') {
          unsubscribe?.()
        }
      }

      drawReplay()
      if (replayRuntime.status === 'playing' && pageVisible) {
        unsubscribe = clock.subscribe(
          replayFrame,
          -50,
        )
        return () => {
          unsubscribe?.()
          unsubscribe = null
        }
      }
      return
    }

    if (replayFollowingRef.current) {
      replayFollowingRef.current = null
      emit(null)
      return
    }

    if (singleKeyRef.current !== playback.key) {
      singleKeyRef.current = playback.key
      singleElapsedRef.current = 0
    }

    const drawSingle = (deltaMs: number) => {
      singleElapsedRef.current += deltaMs
      const frame = buildVehicleRuntimeFrame(
        playback,
        singleElapsedRef.current,
        playback.key,
      )
      emit(frame)
      return frame
    }

    let lastFrameAt = performance.now()
    let unsubscribe: (() => void) | null = null
    const singleFrame = (now: number) => {
      const delta = Math.min(
        MAX_FRAME_DELTA_MS,
        Math.max(0, now - lastFrameAt),
      )
      lastFrameAt = now
      const frame = drawSingle(delta)
      if (frame.stage === 'complete') unsubscribe?.()
    }

    const frame = drawSingle(0)
    if (pageVisible && frame.stage !== 'complete') {
      lastFrameAt = performance.now()
      unsubscribe = clock.subscribe(singleFrame, -50)
      return () => {
        unsubscribe?.()
        unsubscribe = null
      }
    }
  }, [clock, emit, globeRef, pageVisible, playback, replayRuntime])

  useEffect(() => () => emit(null), [emit])

  return useMemo(() => ({ subscribe, getFrame }), [getFrame, subscribe])
}
