import { useEffect, useState } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'
import { MOTION_MS } from '@/lib/motion'

export interface JourneyEntranceState {
  active: boolean
  progress: number
  routesVisible: boolean
}

export function useJourneyEntrance(
  journeyId: string | null,
): JourneyEntranceState {
  const { effectiveLevel, reducedMotion } = useMotion()
  const [progress, setProgress] = useState(1)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!journeyId || reducedMotion || effectiveLevel === 'calm') {
      setProgress(1)
      setActive(false)
      return
    }

    let frame = 0
    const start = performance.now()
    setProgress(0)
    setActive(true)
    const tick = (now: number) => {
      const next = Math.min(1, (now - start) / MOTION_MS.routeGrow)
      setProgress(next)
      if (next < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setActive(false)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [effectiveLevel, journeyId, reducedMotion])

  return {
    active,
    progress,
    routesVisible: !active,
  }
}
