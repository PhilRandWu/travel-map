import { useEffect, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'

/** 初始相机：斜俯视东亚 */
const INITIAL_POV = { lat: 28, lng: 108, altitude: 2.3 }
/** 闲置多久后恢复自转（ms） */
const RESUME_AFTER_IDLE = 10_000
/** 自转角速度（度 / ms） */
const ROTATE_SPEED = 0.006

interface ViewSize {
  width: number
  height: number
}

export default function TravelGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<ViewSize>({ width: 0, height: 0 })

  // 交互状态用 ref，自转循环内读取，不触发重渲染
  const draggingRef = useRef(false)
  const lastInteractRef = useRef(-Infinity)

  // 画布随容器尺寸变化
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 绑定 OrbitControls 的拖拽起止
  useEffect(() => {
    const controls = globeRef.current?.controls?.()
    if (!controls) return
    const onStart = () => {
      draggingRef.current = true
      lastInteractRef.current = performance.now()
    }
    const onEnd = () => {
      draggingRef.current = false
      lastInteractRef.current = performance.now()
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [])

  // 自动自转：拖拽中暂停，闲置 10s 后恢复
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      const globe = globeRef.current
      const idle = now - lastInteractRef.current > RESUME_AFTER_IDLE
      if (globe && idle && !draggingRef.current) {
        const pov = globe.pointOfView()
        globe.pointOfView({ ...pov, lng: pov.lng + dt * ROTATE_SPEED }, 0)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/textures/earth-night.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          showAtmosphere
          atmosphereColor="#5b7cff"
          atmosphereAltitude={0.22}
          onGlobeReady={() => globeRef.current?.pointOfView(INITIAL_POV, 0)}
        />
      )}
    </div>
  )
}
