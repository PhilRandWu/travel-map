import { useEffect, type RefObject } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'

export function useJourneyCardMotion(ref: RefObject<HTMLElement | null>) {
  const { effectiveLevel, touchDevice } = useMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || touchDevice || effectiveLevel === 'calm') return

    let frame = 0
    const intensity = effectiveLevel === 'immersive' ? 1 : 0.65
    const setTransform = (
      x: number,
      y: number,
      rotateX: number,
      rotateY: number,
    ) => {
      element.style.setProperty('--rg-card-x', `${x}px`)
      element.style.setProperty('--rg-card-y', `${y}px`)
      element.style.setProperty('--rg-card-rotate-x', `${rotateX}deg`)
      element.style.setProperty('--rg-card-rotate-y', `${rotateY}deg`)
    }
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setTransform(
          x * 3 * intensity,
          y * 2 * intensity,
          -y * 2 * intensity,
          x * 2 * intensity,
        )
      })
    }
    const reset = () => setTransform(0, 0, 0, 0)

    element.addEventListener('pointermove', onMove, { passive: true })
    element.addEventListener('pointerleave', reset)
    reset()
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', reset)
    }
  }, [effectiveLevel, ref, touchDevice])
}
