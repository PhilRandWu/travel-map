import { useEffect, useState } from 'react'

/**
 * 延迟卸载开关型浮层，让 CSS 能播放退场动画。
 * open=false 后先标记 closing，exitMs 到时再真正卸载。
 */
export function usePresence(open: boolean, exitMs = 180) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return

    setClosing(true)
    const timer = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, exitMs)
    return () => window.clearTimeout(timer)
  }, [exitMs, mounted, open])

  return { mounted, closing }
}
