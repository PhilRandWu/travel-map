import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import type { TransportType } from '@/types'
import {
  buildDestinationPose,
  buildRouteCameraPose,
  interpolatePose,
  type CameraPose,
  type RouteCameraFraming,
} from '@/lib/routeCamera'
import {
  VEHICLE_ARRIVAL_HOLD_MS,
  VEHICLE_ARRIVAL_RETURN_MS,
} from '@/lib/vehicleMotion'
import type { VehicleRuntime } from '@/components/globe/hooks/useVehicleRuntime'
import type { VehicleRuntimeFrame } from '@/lib/vehicleRuntime'
import type { VehicleCameraStatusData } from '@/components/globe/VehicleCameraStatus'
import { getTransportMode } from '@/lib/transportModes'

interface SavedCamera {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  up: [number, number, number]
  target: [number, number, number]
  enabled: boolean
  autoRotate: boolean
}

interface Options {
  globeRef: RefObject<GlobeMethods | undefined>
  runtime: VehicleRuntime
  enabled: boolean
  framing: RouteCameraFraming
}

const CAMERA_PRIORITY = -100

function applyPose(globe: GlobeMethods, pose: CameraPose): void {
  const camera = globe.camera()
  camera.position.set(...pose.position)
  camera.up.set(...pose.up)
  camera.lookAt(...pose.target)
  // DOM projection reads matrixWorldInverse later in the same frame.
  camera.updateMatrixWorld(true)
}

function preparationLabel(type: TransportType): string {
  return getTransportMode(type).camera.preparingLabel
}

export function useVehicleDirectorCamera({
  globeRef,
  runtime,
  enabled,
  framing,
}: Options) {
  const [locked, setLocked] = useState(false)
  const [status, setStatus] = useState<VehicleCameraStatusData | null>(null)
  const savedRef = useRef<SavedCamera | null>(null)
  const entryPoseRef = useRef<CameraPose | null>(null)
  const activeRef = useRef(false)
  const completedRef = useRef(false)
  const lastTripRef = useRef<string | null>(null)
  const lastLabelRef = useRef('')
  const lastProgressBucketRef = useRef(-1)

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
    camera.updateMatrixWorld(true)
    controls.enabled = saved.enabled
    controls.autoRotate = saved.autoRotate
    controls.update()
    savedRef.current = null
    entryPoseRef.current = null
    activeRef.current = false
    lastTripRef.current = null
    lastLabelRef.current = ''
    lastProgressBucketRef.current = -1
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
      lastTripRef.current = frame.tripId
      lastLabelRef.current = ''
      lastProgressBucketRef.current = -1
      activeRef.current = true
      completedRef.current = false
      controls.enabled = false
      controls.autoRotate = false
      setLocked(true)
    }

    const nextLabel = frame.stage === 'preparing'
      ? preparationLabel(frame.playback.type)
      : frame.motion.phaseLabel
    const progressBucket = Math.round(
      (frame.stage === 'preparing' ? 0 : frame.motion.progress) * 100,
    )
    if (
      nextLabel !== lastLabelRef.current
      || progressBucket !== lastProgressBucketRef.current
    ) {
      lastLabelRef.current = nextLabel
      lastProgressBucketRef.current = progressBucket
      setStatus({
        label: nextLabel,
        type: frame.playback.type,
        routeLabel: frame.playback.label,
        progress: progressBucket / 100,
      })
    }

    const routePose = buildRouteCameraPose(
      globe,
      frame.playback.route,
      frame.motion,
      framing,
    )
    let pose = entryPoseRef.current && frame.entryProgress < 1
      ? interpolatePose(entryPoseRef.current, routePose, frame.entryProgress)
      : routePose

    if (frame.stage === 'returning') {
      const destination = buildDestinationPose(
        globe,
        frame.motion.position.lat,
        frame.motion.position.lng,
      )
      const progress = (
        frame.arrivalElapsedMs - VEHICLE_ARRIVAL_HOLD_MS
      ) / VEHICLE_ARRIVAL_RETURN_MS
      pose = interpolatePose(routePose, destination, progress)
    }

    if (!pose.position.every(Number.isFinite)) {
      restore(false)
      return
    }
    applyPose(globe, pose)

    if (frame.stage === 'complete') {
      applyPose(globe, buildDestinationPose(
        globe,
        frame.motion.position.lat,
        frame.motion.position.lng,
      ))
      completedRef.current = true
      restore(true)
    }
  }, [framing, globeRef, restore])

  useEffect(() => {
    document.documentElement.dataset.routeCamera = String(locked)
    return () => {
      delete document.documentElement.dataset.routeCamera
    }
  }, [locked])

  useEffect(() => {
    if (!enabled) {
      if (activeRef.current) restore(false)
      return
    }
    const unsubscribe = runtime.subscribe(onFrame, CAMERA_PRIORITY)
    return () => {
      unsubscribe()
      if (activeRef.current) restore(false)
    }
  }, [enabled, onFrame, restore, runtime])

  return { locked, status }
}
