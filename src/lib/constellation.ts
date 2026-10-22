import type { MemoryCollection, MemoryPhoto } from '@/lib/memory'
import type { MotionLevel } from '@/lib/motion'

export interface ConstellationSize {
  width: number
  height: number
}

export interface ConstellationNode {
  photo: MemoryPhoto
  chapterIndex: number
  photoIndex: number
  x: number
  y: number
  rotation: number
  scale: number
}

export interface ConstellationViewport {
  left: number
  top: number
  width: number
  height: number
  overscan: number
}

export function buildConstellationLayout(
  collection: MemoryCollection,
  size: ConstellationSize,
): ConstellationNode[] {
  const chapters = collection.chapters.filter((chapter) => chapter.photos.length > 0)
  const centerX = size.width / 2
  const centerY = size.height / 2
  const radiusX = Math.max(120, size.width * 0.32)
  const radiusY = Math.max(80, size.height * 0.28)

  return chapters.flatMap((chapter, chapterIndex) => {
    const angle = -Math.PI / 2
      + (chapterIndex / Math.max(1, chapters.length)) * Math.PI * 2
    const chapterX = centerX + Math.cos(angle) * radiusX
    const chapterY = centerY + Math.sin(angle) * radiusY

    return chapter.photos.map((photo, photoIndex) => {
      const ring = 34 + Math.floor(photoIndex / 8) * 54
      const itemAngle = (photoIndex / Math.max(1, chapter.photos.length)) * Math.PI * 2
      return {
        photo,
        chapterIndex,
        photoIndex,
        x: Math.min(size.width - 80, Math.max(80, chapterX + Math.cos(itemAngle) * ring)),
        y: Math.min(size.height - 60, Math.max(60, chapterY + Math.sin(itemAngle) * ring * 0.7)),
        rotation: ((photoIndex * 7 + chapterIndex * 3) % 9) - 4,
        scale: 0.9 + Math.min(0.16, photoIndex * 0.015),
      }
    })
  })
}

export function filterConstellationNodes(
  nodes: ConstellationNode[],
  viewport: ConstellationViewport,
): ConstellationNode[] {
  return nodes.filter((node) =>
    node.x >= viewport.left - viewport.overscan
    && node.x <= viewport.left + viewport.width + viewport.overscan
    && node.y >= viewport.top - viewport.overscan
    && node.y <= viewport.top + viewport.height + viewport.overscan)
}

export function getConstellationParallax(
  x: number,
  y: number,
  level: MotionLevel,
): { x: number; y: number } {
  if (level !== 'immersive') return { x: 0, y: 0 }
  return {
    x: (x - 0.5) * 12,
    y: (y - 0.5) * 12,
  }
}

export function getFlightTarget(
  source: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  viewport: { width: number; height: number },
): { x: number; y: number; scale: number } {
  return {
    x: viewport.width / 2 - (source.left + source.width / 2),
    y: viewport.height / 2 - (source.top + source.height / 2),
    scale: Math.min(5, Math.max(2, 280 / Math.max(1, source.width))),
  }
}
