import { useEffect, useState } from 'react'

export function useFocusIdle(active: boolean, delay = 2400) {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!active) {
      setIdle(false)
      return
    }

    let timer: number | null = null
    const arm = () => {
      setIdle(false)
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), delay)
    }
    arm()
    window.addEventListener('pointermove', arm, { passive: true })
    window.addEventListener('pointerdown', arm, { passive: true })
    window.addEventListener('keydown', arm)
    return () => {
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('pointermove', arm)
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [active, delay])

  return idle
}
