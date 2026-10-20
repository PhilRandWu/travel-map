import { useEffect, useState, type RefObject } from 'react'

export interface ViewSize {
  width: number
  height: number
}

/** 跟随容器尺寸变化，供 globe.gl 画布使用 */
export function useContainerSize(ref: RefObject<HTMLElement | null>): ViewSize {
  const [size, setSize] = useState<ViewSize>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}
