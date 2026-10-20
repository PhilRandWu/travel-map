import { useEffect, type RefObject } from 'react'

/** 位移超过该像素值视为拖拽而非点击 */
const DRAG_THRESHOLD = 6

/**
 * 拖拽 / 点击判别：在捕获阶段记录按下点，位移超阈值则吞掉随后的 click。
 * three.js 内部用 pointerup 的 raycast 触发点击，拖拽结束时也会误触发，
 * 必须提前拦截，否则"只是转一下地球"也会被飞行打断。
 */
export function useDragClickGuard(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let down: { x: number; y: number } | null = null
    let moved = false

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY }
      moved = false
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      if (
        Math.abs(e.clientX - down.x) > DRAG_THRESHOLD ||
        Math.abs(e.clientY - down.y) > DRAG_THRESHOLD
      ) {
        moved = true
      }
    }
    const onClick = (e: MouseEvent) => {
      if (!moved) return
      e.stopPropagation()
      moved = false
      down = null
    }
    const onUp = () => {
      // 保留 moved 标记，让随后的 click 仍能被拦截
      down = null
    }

    el.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('pointermove', onMove, { capture: true })
    window.addEventListener('pointerup', onUp, { capture: true })
    el.addEventListener('click', onClick, { capture: true })
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true })
      window.removeEventListener('pointermove', onMove, { capture: true })
      window.removeEventListener('pointerup', onUp, { capture: true })
      el.removeEventListener('click', onClick, { capture: true })
    }
  }, [ref])
}
