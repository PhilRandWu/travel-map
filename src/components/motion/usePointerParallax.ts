import { useEffect, type RefObject } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'

export function usePointerParallax(ref: RefObject<HTMLElement | null>) {
  const { effectiveLevel, touchDevice } = useMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || effectiveLevel !== 'immersive' || touchDevice) return

    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5
        const y = event.clientY / window.innerHeight - 0.5
        element.style.setProperty('--rg-parallax-x', `${x * 8}px`)
        element.style.setProperty('--rg-parallax-y', `${y * 6}px`)
      })
    }
    const reset = () => {
      element.style.setProperty('--rg-parallax-x', '0px')
      element.style.setProperty('--rg-parallax-y', '0px')
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', reset)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', reset)
    }
  }, [effectiveLevel, ref, touchDevice])
}
