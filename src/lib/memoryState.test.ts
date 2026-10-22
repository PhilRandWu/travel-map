import { describe, expect, it } from 'vitest'
import {
  memoryOverlayReducer,
  type MemoryOverlay,
} from '@/lib/memoryState'

const closed: MemoryOverlay = { status: 'closed' }

describe('memory overlay reducer', () => {
  it('opens stage with mode and index', () => {
    const next = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'featured',
      view: 'stage',
      photoIndex: 1,
    })
    expect(next).toEqual({
      status: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'featured',
      view: 'stage',
      photoIndex: 1,
    })
  })

  it('switches view without losing photo index', () => {
    const open = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'journey', journeyId: 'j001' },
      mode: 'all',
      view: 'stage',
      photoIndex: 3,
    })
    const next = memoryOverlayReducer(open, { type: 'set-view', view: 'constellation' })
    expect(next.status === 'open' && next.photoIndex).toBe(3)
  })

  it('clamps photo changes without mutating the source', () => {
    const open = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'all',
      view: 'stage',
      photoIndex: 0,
    })
    const next = memoryOverlayReducer(open, {
      type: 'set-photo',
      photoIndex: 99,
      photoCount: 5,
    })
    expect(next.status === 'open' && next.photoIndex).toBe(4)
  })

  it('closes to a completely empty overlay', () => {
    const open = memoryOverlayReducer(closed, {
      type: 'open',
      source: { kind: 'visit', visitId: 'v001' },
      mode: 'all',
      view: 'stage',
      photoIndex: 0,
    })
    expect(memoryOverlayReducer(open, { type: 'close' })).toEqual(closed)
  })
})
