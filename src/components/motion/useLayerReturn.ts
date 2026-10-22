import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotion } from '@/components/motion/MotionProvider'
import { MOTION_MS } from '@/lib/motion'

export function useLayerReturn(onClose: () => void) {
  const { reducedMotion } = useMotion()
  const [returning, setReturning] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const requestClose = useCallback(() => {
    if (returning) return
    if (reducedMotion) {
      onClose()
      return
    }
    setReturning(true)
    timerRef.current = window.setTimeout(onClose, MOTION_MS.return)
  }, [onClose, reducedMotion, returning])

  return { returning, requestClose }
}
