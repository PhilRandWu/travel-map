import { useRef, type PointerEventHandler } from 'react'
import { getSwipeDirection } from '@/lib/gesture'

export function useSwipeNavigation(
  onPrevious: () => void,
  onNext: () => void,
) {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown: PointerEventHandler<HTMLElement> = (event) => {
    startRef.current = { x: event.clientX, y: event.clientY }
  }

  const onPointerUp: PointerEventHandler<HTMLElement> = (event) => {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const direction = getSwipeDirection(
      start.x,
      start.y,
      event.clientX,
      event.clientY,
    )
    if (direction === 'next') onNext()
    if (direction === 'previous') onPrevious()
  }

  return { onPointerDown, onPointerUp }
}
