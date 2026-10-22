import { useEffect, useState, type RefObject } from 'react'
import type { GlobeMethods } from 'react-globe.gl'

interface Options {
  /** 相机高度低于该值时显示城市名称 */
  labelAltitude: number
  initialAltitude: number
  draggingRef: RefObject<boolean>
  lastInteractRef: RefObject<number>
}

/**
 * 绑定 OrbitControls：拖拽起止刷新交互时间，
 * 相机高度跨过阈值时才 setState，避免每帧重渲染。
 */
export function useGlobeControls(
  globeRef: RefObject<GlobeMethods | undefined>,
  deps: unknown[],
  { labelAltitude, initialAltitude, draggingRef, lastInteractRef }: Options,
) {
  const [zoomedIn, setZoomedIn] = useState(initialAltitude < labelAltitude)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const controls = globeRef.current?.controls?.()
    if (!controls) return
    const onStart = () => {
      draggingRef.current = true
      setDragging(true)
      lastInteractRef.current = performance.now()
    }
    const onEnd = () => {
      draggingRef.current = false
      setDragging(false)
      lastInteractRef.current = performance.now()
    }
    const onChange = () => {
      const alt = globeRef.current?.pointOfView().altitude ?? initialAltitude
      setZoomedIn((prev) => {
        const next = alt < labelAltitude
        return prev === next ? prev : next
      })
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    controls.addEventListener('change', onChange)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      controls.removeEventListener('change', onChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { zoomedIn, dragging }
}
