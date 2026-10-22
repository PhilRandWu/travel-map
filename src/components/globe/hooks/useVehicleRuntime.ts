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
import { VEHICLE_ARRIVAL_TOTAL_MS } from '@/lib/vehicleMotion'

type FrameListener = (frame: VehicleRuntimeFrame | null) => void

export interface VehicleRuntime {
  subscribe: (listener: FrameListener) => () => void
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
  const listenersRef = useRef(new Set<FrameListener>())
  const singleElapsedRef = useRef(0)
  const singleKeyRef = useRef<number | null>(null)
  const replayFollowingRef = useRef<ReplayFollowing | null>(null)

  const emit = useCallback((frame: VehicleRuntimeFrame | null) => {
    frameRef.current = frame
    listenersRef.current.forEach((listener) => listener(frame))
  }, [])

  const subscribe = useCallback((listener: FrameListener) => {
    listenersRef.current.add(listener)
    listener(frameRef.current)
    return () => listenersRef.current.delete(listener)
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
          following.playback.route.durationMs + VEHICLE_ARRIVAL_TOTAL_MS,
          replayRuntime.seekRevision,
        ))
        replayFollowingRef.current = null
      } else {
        emit(null)
      }
      return
    }

    let raf = 0
    let cancelled = false

    if (replayRuntime) {
      if (replayRuntime.status === 'idle' || replayRuntime.activeIndex < 0) {
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
            following.playback.route.durationMs + VEHICLE_ARRIVAL_TOTAL_MS,
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

      const replayFrame = () => {
        if (cancelled) return
        const frame = drawReplay()
        if (
          frame?.stage !== 'complete'
          && replayRuntime.status === 'playing'
          && pageVisible
        ) {
          raf = requestAnimationFrame(replayFrame)
        }
      }

      drawReplay()
      if (replayRuntime.status === 'playing' && pageVisible) {
        raf = requestAnimationFrame(replayFrame)
      }
      return () => {
        cancelled = true
        cancelAnimationFrame(raf)
      }
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
    const singleFrame = (now: number) => {
      if (cancelled) return
      const delta = Math.min(
        MAX_FRAME_DELTA_MS,
        Math.max(0, now - lastFrameAt),
      )
      lastFrameAt = now
      const frame = drawSingle(delta)
      if (frame.stage !== 'complete') {
        raf = requestAnimationFrame(singleFrame)
      }
    }

    const frame = drawSingle(0)
    if (pageVisible && frame.stage !== 'complete') {
      lastFrameAt = performance.now()
      raf = requestAnimationFrame(singleFrame)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [emit, globeRef, pageVisible, playback, replayRuntime])

  useEffect(() => () => emit(null), [emit])

  return useMemo(() => ({ subscribe, getFrame }), [getFrame, subscribe])
}
