import { useEffect, type RefObject } from 'react'
import { Color, type Mesh, type ShaderMaterial } from 'three'
import type { GlobeMethods } from 'react-globe.gl'

/** 大气外圈呼吸与 hover 唤醒的基础参数 */
const BASE_COLOR = '#7fa6f5'
const HOVER_COLOR = new Color('#b8d2ff')
const GLOW_BASE = 0.17
const GLOW_AMP_IDLE = 0.035
const GLOW_AMP_HOVER = 0.07
const GLOW_HOVER_LIFT = 0.11
const BREATH_PERIOD = 5200
const WAKE_LERP = 0.035
/** 大气 mesh 首帧创建，最多等待的帧数 */
const MAX_RETRIES = 120

interface Options {
  draggingRef: RefObject<boolean>
  cityHoveringRef: RefObject<boolean>
}

/**
 * 大气外圈的"呼吸 + 唤醒"：
 * 静默时辉光极缓起伏；hover 时基准、幅度、色温随 wake 连续漂移，
 * 直接驱动 atmosphere shader uniform，避免改 prop 重建 mesh。
 * 同时负责地球表面 hover 的指针样式（命中球面才显示 pointer）。
 */
export function useAtmosphereGlow(
  globeRef: RefObject<GlobeMethods | undefined>,
  wrapperRef: RefObject<HTMLElement | null>,
  deps: unknown[],
  { draggingRef, cityHoveringRef }: Options,
) {
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    let raf = 0
    let material: ShaderMaterial | null = null
    let baseColor: Color | null = null
    let retries = 0
    let disposed = false
    let wake = 0 // 0 = 静默，1 = 悬停，永远在两者之间缓慢游动
    let hovering = false

    const findAtmosphere = () => {
      const globe = globeRef.current
      if (!globe) return false
      // react-globe.gl 用 __globeObjType 标记内部对象（不是 three 的 name）
      const hit = globe
        .scene()
        .children
        .find((o) => (o as unknown as { __globeObjType?: string }).__globeObjType === 'atmosphere')
      if (!hit) return false
      material = (hit as Mesh).material as ShaderMaterial
      baseColor = (material.uniforms.color.value as Color).clone()
      return true
    }

    const tick = (now: number) => {
      if (disposed) return
      if (!material && !findAtmosphere() && retries++ < MAX_RETRIES) {
        raf = requestAnimationFrame(tick)
        return
      }
      if (material && baseColor && !document.hidden) {
        const target = hovering || cityHoveringRef.current ? 1 : 0
        if (Math.abs(wake - target) > 0.0005) wake += (target - wake) * WAKE_LERP

        const amp = GLOW_AMP_IDLE + (GLOW_AMP_HOVER - GLOW_AMP_IDLE) * wake
        const breath = Math.sin((now / BREATH_PERIOD) * Math.PI * 2) * amp
        const u = material.uniforms
        u.coefficient.value = GLOW_BASE + GLOW_HOVER_LIFT * wake + breath
        // wake=1 时也只混入一部分，保持蓝色主调
        u.color.value.copy(baseColor).lerp(HOVER_COLOR, wake * 0.45)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // toGlobeCoords 命中球面才算 hover；拖拽旋转中不改变状态
    const onMove = (e: PointerEvent) => {
      const globe = globeRef.current
      if (!globe || draggingRef.current) return
      const rect = el.getBoundingClientRect()
      const hit = !!globe.toGlobeCoords(e.clientX - rect.left, e.clientY - rect.top)
      if (hit !== hovering) {
        hovering = hit
        el.style.cursor = hit ? 'pointer' : ''
      }
    }
    const onLeave = () => {
      hovering = false
      el.style.cursor = ''
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export const ATMOSPHERE_COLOR = BASE_COLOR
export const ATMOSPHERE_ALTITUDE = 0.2
