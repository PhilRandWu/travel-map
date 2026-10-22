import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MemoryPhoto } from '@/lib/memory'
import type { MemoryView } from '@/types'
import { useMotion } from '@/components/motion/MotionProvider'
import { getFlightTarget } from '@/lib/constellation'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Options {
  photos: MemoryPhoto[]
  onPhotoIndex: (index: number) => void
  onView: (view: MemoryView) => void
}

interface FlightState {
  src: string
  from: CSSProperties
  to: CSSProperties
}

const FLIGHT_MS = 680

export function useMemoryFlight({
  photos,
  onPhotoIndex,
  onView,
}: Options) {
  const { effectiveLevel, reducedMotion } = useMotion()
  const [flight, setFlight] = useState<FlightState | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const openFromConstellation = (index: number, rect: DOMRect) => {
    const photo = photos[index]
    if (!photo) return
    const motionEnabled = !reducedMotion && effectiveLevel !== 'calm'
    if (!motionEnabled) {
      onPhotoIndex(index)
      onView('stage')
      return
    }

    const target = getFlightTarget(rect, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    setFlight({
      src: photoVariantUrl(photo.visitId, photo.file, 'md'),
      from: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        transform: 'translate3d(0,0,0) scale(1)',
      },
      to: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        transform: `translate3d(${target.x}px,${target.y}px,0) scale(${target.scale})`,
      },
    })
    timerRef.current = window.setTimeout(() => {
      onPhotoIndex(index)
      onView('stage')
      setFlight(null)
    }, FLIGHT_MS)
  }

  return { flight, openFromConstellation }
}
