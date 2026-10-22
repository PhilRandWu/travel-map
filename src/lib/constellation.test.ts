import { describe, expect, it } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import { buildMemoryCollection } from '@/lib/memory'
import {
  buildConstellationLayout,
  filterConstellationNodes,
  getConstellationParallax,
  getFlightTarget,
} from '@/lib/constellation'
import type { MemoryCollection } from '@/lib/memory'

const data = dataJson as TravelData

describe('constellation layout', () => {
  it('is deterministic and stays inside the canvas', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    const first = buildConstellationLayout(collection, { width: 1200, height: 760 })
    const second = buildConstellationLayout(collection, { width: 1200, height: 760 })
    expect(first).toEqual(second)

    for (const node of first) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(1200)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(760)
    }
  })

  it('groups every photo under a real chapter', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j002' })
    const layout = buildConstellationLayout(collection, { width: 900, height: 600 })
    expect(layout.map((node) => node.photo.chapterKey)).toEqual(
      collection.photos.map((photo) => photo.chapterKey),
    )
  })

  it('mounts only nodes inside the viewport plus overscan', () => {
    const collection = buildMemoryCollection(data, { kind: 'journey', journeyId: 'j001' })
    const layout = buildConstellationLayout(collection, { width: 1200, height: 760 })
    const first = layout[0]
    const visible = filterConstellationNodes(layout, {
      left: first.x - 10,
      top: first.y - 10,
      width: 20,
      height: 20,
      overscan: 100,
    })
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.every((node) =>
      node.x >= first.x - 110
      && node.x <= first.x + 110
      && node.y >= first.y - 110
      && node.y <= first.y + 110,
    )).toBe(true)
  })

  it('keeps a 320-photo constellation culled to the visible viewport', () => {
    const chapters = Array.from({ length: 10 }, (_, chapterIndex) => ({
      key: `chapter-${chapterIndex}`,
      visitId: `visit-${chapterIndex}`,
      journeyId: 'stress',
      cityId: 'hangzhou',
      cityName: '杭州',
      arriveDate: '2025-05-01',
      leaveDate: '2025-05-01',
      photos: Array.from({ length: 32 }, (_, photoIndex) => ({
        key: `chapter-${chapterIndex}:photo-${photoIndex}`,
        visitId: `visit-${chapterIndex}`,
        journeyId: 'stress',
        chapterKey: `chapter-${chapterIndex}`,
        cityId: 'hangzhou',
        cityName: '杭州',
        file: `photo-${photoIndex}.svg`,
        featured: false,
        timeUnknown: true,
        sourceIndex: photoIndex,
      })),
    }))
    const collection = {
      source: { kind: 'journey', journeyId: 'stress' },
      photos: chapters.flatMap((chapter) => chapter.photos),
      chapters,
      hasFeatured: false,
    } satisfies MemoryCollection

    const layout = buildConstellationLayout(collection, { width: 1400, height: 900 })
    const visible = filterConstellationNodes(layout, {
      left: 0,
      top: 0,
      width: 700,
      height: 450,
      overscan: 160,
    })

    expect(layout).toHaveLength(320)
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.length).toBeLessThan(layout.length)
  })
})

describe('constellation motion', () => {
  it('keeps parallax within 2-6px and immersive only', () => {
    expect(getConstellationParallax(0.5, 0.5, 'immersive')).toEqual({ x: 0, y: 0 })
    const edge = getConstellationParallax(0, 1, 'immersive')
    expect(Math.abs(edge.x)).toBeLessThanOrEqual(6)
    expect(Math.abs(edge.y)).toBeLessThanOrEqual(6)
    expect(getConstellationParallax(0, 1, 'cinematic')).toEqual({ x: 0, y: 0 })
  })

  it('derives a centered flight target from a source rectangle', () => {
    const target = getFlightTarget(
      { left: 100, top: 200, width: 120, height: 80 },
      { width: 1200, height: 800 },
    )
    expect(target.x).toBe(440)
    expect(target.y).toBe(160)
  })
})
