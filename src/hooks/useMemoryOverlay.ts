import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { MemoryMode, MemorySource, MemoryView } from '@/types'
import {
  CLOSED_MEMORY_OVERLAY,
  memoryOverlayReducer,
} from '@/lib/memoryState'

interface OpenOptions {
  mode: MemoryMode
  view: MemoryView
  photoIndex: number
}

export function useMemoryOverlay(scopeKey: string) {
  const [overlay, dispatch] = useReducer(memoryOverlayReducer, CLOSED_MEMORY_OVERLAY)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  const open = useCallback((source: MemorySource, options: OpenOptions) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    dispatch({ type: 'open', source, ...options })
  }, [])

  const close = useCallback(() => {
    dispatch({ type: 'close' })
    requestAnimationFrame(() => returnFocusRef.current?.focus())
  }, [])

  useEffect(() => {
    if (overlay.status === 'closed') return
    close()
    // scope 改变时关闭旧照片，下一次打开会记录新的焦点入口。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey])

  return {
    overlay,
    open,
    close,
    setMode: (mode: MemoryMode, photoIndex: number) =>
      dispatch({ type: 'set-mode', mode, photoIndex }),
    setView: (view: MemoryView) => dispatch({ type: 'set-view', view }),
    setPhotoIndex: (photoIndex: number, photoCount: number) =>
      dispatch({ type: 'set-photo', photoIndex, photoCount }),
  }
}
