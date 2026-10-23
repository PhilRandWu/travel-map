import { useCallback, useEffect, useRef, useState } from 'react'
import { downgradeMotionLevel, type MotionLevel } from '@/lib/motion'
import { useSceneClock } from '@/components/scene/SceneClockProvider'

export function applyPerformanceWindow(
  cap: MotionLevel,
  fps: number,
): MotionLevel {
  return fps < 45 ? downgradeMotionLevel(cap) : cap
}

export function useAdaptiveMotion(userLevel: MotionLevel) {
  const [cap, setCap] = useState<MotionLevel>('immersive')
  const capRef = useRef(cap)
  const clock = useSceneClock()
  capRef.current = cap

  const recordWindow = useCallback((frames: number, durationMs: number) => {
    const fps = frames / Math.max(1, durationMs) * 1000
    const next = applyPerformanceWindow(capRef.current, fps)
    if (next !== capRef.current) {
      capRef.current = next
      setCap(next)
    }
    return next
  }, [])

  useEffect(() => {
    if (userLevel === 'calm') {
      capRef.current = 'immersive'
      setCap('immersive')
      return
    }
    let windowStartedAt = performance.now()
    let frameCount = 0
    return clock.subscribe((now) => {
      frameCount += 1
      const duration = now - windowStartedAt
      if (duration >= 2000) {
        recordWindow(frameCount, duration)
        windowStartedAt = now
        frameCount = 0
      }
    }, -500)
  }, [clock, recordWindow, userLevel])

  return { cap, recordWindow }
}
