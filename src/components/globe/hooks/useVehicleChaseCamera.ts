import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import {
  buildChaseCameraPose,
  buildOverviewPose,
  type CameraPose,
} from '@/lib/chaseCamera'
import {
  VEHICLE_ARRIVAL_HOLD_MS,
  VEHICLE_ARRIVAL_RETURN_MS,
  VEHICLE_CHASE_ENTRY_MS,
} from '@/lib/vehicleMotion'
import type { VehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'
import type { VehicleRuntimeFrame } from '@/lib/vehicleRuntime'

interface SavedCamera {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  up: [number, number, number]
  target: [number, number, number]
  enabled: boolean
  autoRotate: boolean
}

interface CameraStatus {
  label: string
  type: 'flight' | 'train'
}

interface Options {
  globeRef: RefObject<GlobeMethods | undefined>
  runtime: VehicleRuntime
  enabled: boolean
}

const smoothstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function applyPose(globe: GlobeMethods, pose: CameraPose): void {
  const camera = globe.camera()
  camera.position.set(...pose.position)
  camera.up.set(...pose.up)
  camera.lookAt(...pose.target)
}

function interpolatePose(
  from: CameraPose,
  to: CameraPose,
  value: number,
): CameraPose {
  const t = smoothstep(value)
  const mix = (start: number, end: number) => start + (end - start) * t
  return {
    position: [
      mix(from.position[0], to.position[0]),
      mix(from.position[1], to.position[1]),
      mix(from.position[2], to.position[2]),
    ],
    target: [
      mix(from.target[0], to.target[0]),
      mix(from.target[1], to.target[1]),
      mix(from.target[2], to.target[2]),
    ],
    up: [
      mix(from.up[0], to.up[0]),
      mix(from.up[1], to.up[1]),
      mix(from.up[2], to.up[2]),
    ],
  }
}

export function useVehicleChaseCamera({
  globeRef,
  runtime,
  enabled,
}: Options) {
  const [locked, setLocked] = useState(false)
  const [status, setStatus] = useState<CameraStatus | null>(null)
  const savedRef = useRef<SavedCamera | null>(null)
  const activeRef = useRef(false)
  const completedRef = useRef(false)
  const entryStartedRef = useRef(0)
  const entryPoseRef = useRef<CameraPose | null>(null)
  const lastRevisionRef = useRef<number | null>(null)
  const lastTripRef = useRef<string | null>(null)
  const lastFrameRef = useRef<VehicleRuntimeFrame | null>(null)
  const lastLabelRef = useRef('')

  const restore = useCallback((completed: boolean) => {
    const globe = globeRef.current
    const saved = savedRef.current
    if (!globe || !saved) {
      activeRef.current = false
      setLocked(false)
      setStatus(null)
      return
    }

    const camera = globe.camera()
    const controls = globe.controls()
    if (completed) {
      controls.target.set(0, 0, 0)
    } else {
      camera.position.set(...saved.position)
      camera.quaternion.set(...saved.quaternion)
      camera.up.set(...saved.up)
      controls.target.set(...saved.target)
    }
    controls.enabled = saved.enabled
    controls.autoRotate = saved.autoRotate
    controls.update()
    savedRef.current = null
    entryPoseRef.current = null
    activeRef.current = false
    lastFrameRef.current = null
    lastTripRef.current = null
    lastRevisionRef.current = null
    lastLabelRef.current = ''
    setLocked(false)
    setStatus(null)
  }, [globeRef])

  const onFrame = useCallback((frame: VehicleRuntimeFrame | null) => {
    const globe = globeRef.current
    if (!globe) return
    if (!frame) {
      if (activeRef.current) restore(completedRef.current)
      completedRef.current = false
      return
    }

    const controls = globe.controls()
    const camera = globe.camera()
    if (!activeRef.current || lastTripRef.current !== frame.tripId) {
      savedRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        quaternion: [
          camera.quaternion.x,
          camera.quaternion.y,
          camera.quaternion.z,
          camera.quaternion.w,
        ],
        up: [camera.up.x, camera.up.y, camera.up.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        enabled: controls.enabled,
        autoRotate: controls.autoRotate,
      }
      entryPoseRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
      }
      entryStartedRef.current = performance.now()
      lastRevisionRef.current = frame.revision
      lastTripRef.current = frame.tripId
      activeRef.current = true
      completedRef.current = false
      controls.enabled = false
      controls.autoRotate = false
      setLocked(true)
    }

    const seeked = lastRevisionRef.current !== null
      && lastRevisionRef.current !== frame.revision
    lastRevisionRef.current = frame.revision
    lastFrameRef.current = frame

    if (frame.motion.phaseLabel !== lastLabelRef.current) {
      lastLabelRef.current = frame.motion.phaseLabel
      setStatus({ label: frame.motion.phaseLabel, type: frame.playback.type })
    }

    const chasePose = buildChaseCameraPose(
      globe,
      frame.playback.route,
      frame.motion,
    )
    let pose = chasePose

    if (frame.stage === 'returning') {
      const destination = buildOverviewPose(
        globe,
        frame.motion.position.lat,
        frame.motion.position.lng,
      )
      const progress = (
        frame.arrivalElapsedMs - VEHICLE_ARRIVAL_HOLD_MS
      ) / VEHICLE_ARRIVAL_RETURN_MS
      pose = interpolatePose(chasePose, destination, progress)
    }

    if (
      !seeked
      && frame.stage === 'moving'
      && entryPoseRef.current
      && performance.now() - entryStartedRef.current < VEHICLE_CHASE_ENTRY_MS
    ) {
      const progress = (
        performance.now() - entryStartedRef.current
      ) / VEHICLE_CHASE_ENTRY_MS
      pose = interpolatePose(entryPoseRef.current, chasePose, progress)
    }

    if (!pose.position.every(Number.isFinite)) {
      restore(false)
      return
    }
    applyPose(globe, pose)

    if (frame.stage === 'complete') {
      const destination = buildOverviewPose(
        globe,
        frame.motion.position.lat,
        frame.motion.position.lng,
      )
      applyPose(globe, destination)
      completedRef.current = true
      restore(true)
    }
  }, [globeRef, restore])

  useEffect(() => {
    document.documentElement.dataset.vehicleChase = String(locked)
    return () => {
      delete document.documentElement.dataset.vehicleChase
    }
  }, [locked])

  useEffect(() => {
    if (!enabled) {
      if (activeRef.current) restore(false)
      return
    }
    const unsubscribe = runtime.subscribe(onFrame)
    return () => {
      unsubscribe()
      if (activeRef.current) restore(false)
    }
  }, [enabled, onFrame, restore, runtime])

  return { locked, status }
}
