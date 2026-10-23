import { useEffect, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { useSceneClock } from '@/components/scene/SceneClockProvider'

/** 自转角速度（度 / ms） */
const ROTATE_SPEED = 0.006

interface Options {
  /** 闲置多久后恢复自转（ms） */
  resumeAfterIdle: number
  draggingRef: RefObject<boolean>
  selectedCityIdRef: RefObject<string | null>
  lastInteractRef: RefObject<number>
  cameraLockedRef: RefObject<boolean>
}

/** 自动自转：拖拽中/选中城市时暂停，闲置一段时间后恢复 */
export function useAutoRotate(
  globeRef: RefObject<GlobeMethods | undefined>,
  {
    resumeAfterIdle,
    draggingRef,
    selectedCityIdRef,
    lastInteractRef,
    cameraLockedRef,
  }: Options,
) {
  const clock = useSceneClock()

  useEffect(() => {
    let last = performance.now()
    const tick = (now: number) => {
      // 页面隐藏/标签页节流后，避免恢复时一次补上过大的角度
      const dt = Math.min(now - last, 64)
      last = now
      const globe = globeRef.current
      const idle = now - lastInteractRef.current > resumeAfterIdle
      if (
        !document.hidden
        && globe
        && idle
        && !draggingRef.current
        && !selectedCityIdRef.current
        && !cameraLockedRef.current
      ) {
        const pov = globe.pointOfView()
        globe.pointOfView({ ...pov, lng: pov.lng + dt * ROTATE_SPEED }, 0)
      }
    }
    return clock.subscribe(tick, -200)
  }, [
    cameraLockedRef,
    clock,
    draggingRef,
    globeRef,
    lastInteractRef,
    resumeAfterIdle,
    selectedCityIdRef,
  ])
}
