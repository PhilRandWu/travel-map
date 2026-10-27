import { useEffect, useState } from 'react'

/** Let the app shell paint before mounting the WebGL globe and its assets. */
export function useDeferredMount(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return mounted
}
