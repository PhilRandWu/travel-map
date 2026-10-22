import type { MemoryMode, MemorySource, MemoryView } from '@/types'
import { clampMemoryIndex } from '@/lib/memory'

export interface MemoryOverlayClosed {
  status: 'closed'
}

export interface MemoryOverlayOpen {
  status: 'open'
  source: MemorySource
  mode: MemoryMode
  view: MemoryView
  photoIndex: number
}

export type MemoryOverlay = MemoryOverlayClosed | MemoryOverlayOpen

export type MemoryOverlayAction =
  | {
      type: 'open'
      source: MemorySource
      mode: MemoryMode
      view: MemoryView
      photoIndex: number
    }
  | { type: 'close' }
  | { type: 'set-mode'; mode: MemoryMode; photoIndex: number }
  | { type: 'set-view'; view: MemoryView }
  | { type: 'set-photo'; photoIndex: number; photoCount: number }

export const CLOSED_MEMORY_OVERLAY: MemoryOverlay = { status: 'closed' }

export function memoryOverlayReducer(
  state: MemoryOverlay,
  action: MemoryOverlayAction,
): MemoryOverlay {
  switch (action.type) {
    case 'open':
      return {
        status: 'open',
        source: action.source,
        mode: action.mode,
        view: action.view,
        photoIndex: Math.max(0, Math.trunc(action.photoIndex)),
      }
    case 'close':
      return CLOSED_MEMORY_OVERLAY
    case 'set-mode':
      return state.status === 'open'
        ? {
            ...state,
            mode: action.mode,
            photoIndex: Math.max(0, Math.trunc(action.photoIndex)),
          }
        : state
    case 'set-view':
      return state.status === 'open' ? { ...state, view: action.view } : state
    case 'set-photo':
      return state.status === 'open'
        ? {
            ...state,
            photoIndex: clampMemoryIndex(action.photoIndex, action.photoCount),
          }
        : state
  }
}
