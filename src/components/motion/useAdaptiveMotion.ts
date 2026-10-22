import { useCallback, useEffect, useRef, useState } from 'react'
import { downgradeMotionLevel, type MotionLevel } from '@/lib/motion'

export function applyPerformanceWindow(
  cap: MotionLevel,
  fps: number,
): MotionLevel {
  return fps < 45 ? downgradeMotionLevel(cap) : cap
}

export function useAdaptiveMotion(userLevel: MotionLevel) {
  const [cap, setCap] = useState<MotionLevel>('immersive')
  const capRef = useRef(cap)
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
    if (typeof requestAnimationFrame !== 'function') return

    let frame = 0
    let windowStartedAt = performance.now()
    let frameCount = 0
    const tick = (now: number) => {
      if (document.hidden) {
        windowStartedAt = now
        frameCount = 0
      } else {
        frameCount += 1
        const duration = now - windowStartedAt
        if (duration >= 2000) {
          recordWindow(frameCount, duration)
          windowStartedAt = now
          frameCount = 0
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [recordWindow, userLevel])

  return { cap, recordWindow }
}
