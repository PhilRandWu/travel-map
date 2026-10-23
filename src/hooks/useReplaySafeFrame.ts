import { useEffect, useRef, useState } from 'react'
import type { RouteCameraFraming } from '@/lib/routeCamera'

const DEFAULT_FRAME: RouteCameraFraming = {
  topRatio: 0.06,
  bottomRatio: 0.8,
}

export function useReplaySafeFrame() {
  const headerRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const [frame, setFrame] = useState(DEFAULT_FRAME)

  useEffect(() => {
    const header = headerRef.current
    const footer = footerRef.current
    if (!header || !footer) return

    const update = () => {
      const height = window.innerHeight
      if (height <= 0) return
      const next = {
        topRatio: Math.max(
          0,
          Math.min(0.3, header.getBoundingClientRect().bottom / height),
        ),
        bottomRatio: Math.max(
          0.55,
          Math.min(0.92, footer.getBoundingClientRect().top / height),
        ),
      }
      setFrame((current) => (
        Math.abs(current.topRatio - next.topRatio) < 0.002
        && Math.abs(current.bottomRatio - next.bottomRatio) < 0.002
          ? current
          : next
      ))
    }

    update()
    window.addEventListener('resize', update)
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(update)
      : null
    observer?.observe(header)
    observer?.observe(footer)
    return () => {
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [])

  return { frame, headerRef, footerRef }
}
