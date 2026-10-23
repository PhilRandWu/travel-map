import type {
  MemoryChapter,
  MemoryCollection,
  MemoryPhoto,
} from '@/lib/memory'
import type { MotionLevel } from '@/lib/motion'

export interface ConstellationSize {
  width: number
  height: number
}

export interface ConstellationNode {
  photo: MemoryPhoto
  chapterIndex: number
  photoIndex: number
  globalIndex: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scale: number
}

export interface ConstellationChapterMarker {
  chapter: MemoryChapter
  chapterIndex: number
  x: number
  y: number
}

export interface ConstellationMap {
  width: number
  height: number
  nodes: ConstellationNode[]
  chapters: ConstellationChapterMarker[]
  path: string
}

export interface ConstellationViewport {
  left: number
  top: number
  width: number
  height: number
  overscan: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function chapterColumns(count: number): number {
  if (count <= 1) return 1
  if (count === 3) return 3
  if (count <= 4) return 2
  return 3
}

function constellationPath(chapters: ConstellationChapterMarker[]): string {
  const [first, ...rest] = chapters
  if (!first) return ''
  return rest.reduce((path, chapter, index) => {
    const previous = chapters[index]
    const middle = (previous.x + chapter.x) / 2
    return `${path} C ${middle} ${previous.y}, ${middle} ${chapter.y}, ${chapter.x} ${chapter.y}`
  }, `M ${first.x} ${first.y}`)
}

export function buildConstellationMap(
  collection: MemoryCollection,
  size: ConstellationSize,
): ConstellationMap {
  const chapters = collection.chapters.filter((chapter) => chapter.photos.length > 0)
  if (chapters.length === 0) {
    return {
      width: size.width,
      height: size.height,
      nodes: [],
      chapters: [],
      path: '',
    }
  }

  const columns = chapterColumns(chapters.length)
  const rows = Math.ceil(chapters.length / columns)
  const padX = Math.max(110, size.width * 0.09)
  const padY = Math.max(100, size.height * 0.14)
  const cellWidth = (size.width - padX * 2) / columns
  const cellHeight = (size.height - padY * 2) / rows
  const globalIndexes = new Map(
    collection.photos.map((photo, index) => [photo.key, index]),
  )

  const markers = chapters.map((chapter, chapterIndex): ConstellationChapterMarker => {
    const row = Math.floor(chapterIndex / columns)
    const placeInRow = chapterIndex % columns
    const column = row % 2 === 0 ? placeInRow : columns - 1 - placeInRow
    const wave = chapters.length <= columns && chapters.length > 1
      ? (chapterIndex % 2 === 0 ? -0.055 : 0.055) * size.height
      : 0
    return {
      chapter,
      chapterIndex,
      x: padX + cellWidth * (column + 0.5),
      y: padY + cellHeight * (row + 0.5) + wave,
    }
  })

  const nodes = markers.flatMap((marker) => {
    const heroWidth = clamp(cellWidth * 0.47, 142, 262)
    const heroHeight = heroWidth * 0.68
    return marker.chapter.photos.map((photo, photoIndex): ConstellationNode => {
      const hero = photoIndex === 0
      const orbit = photoIndex > 5
      const angle = photoIndex * 2.399 + marker.chapterIndex * 0.73
      const radius = orbit
        ? Math.min(cellWidth * 0.41, 88 + Math.floor((photoIndex - 6) / 5) * 34)
        : 0
      const offsetX = hero
        ? 0
        : orbit
          ? Math.cos(angle) * radius
          : [0.62, -0.58, 0.55, -0.63, 0.71][photoIndex - 1] * heroWidth
      const offsetY = hero
        ? 0
        : orbit
          ? Math.sin(angle) * radius * 0.62
          : [-0.52, 0.42, 0.5, -0.42, 0.7][photoIndex - 1] * heroHeight
      const widthRatio = hero
        ? 1
        : orbit
          ? 0.44
          : [0.58, 0.48, 0.56, 0.5, 0.44][photoIndex - 1]
      const ratio = [0.68, 0.75, 0.62, 0.72, 0.66, 0.78][photoIndex % 6]
      const width = heroWidth * widthRatio * (photo.featured ? 1.04 : 1)
      const height = hero ? heroHeight : width * ratio
      const rawX = marker.x + offsetX
      const rawY = marker.y + offsetY
      return {
        photo,
        chapterIndex: marker.chapterIndex,
        photoIndex,
        globalIndex: globalIndexes.get(photo.key) ?? 0,
        x: clamp(rawX, width / 2 + 14, size.width - width / 2 - 14),
        y: clamp(rawY, height / 2 + 14, size.height - height / 2 - 14),
        width,
        height,
        rotation: hero
          ? (marker.chapterIndex % 2 === 0 ? -1.15 : 1.1)
          : (((photoIndex * 7 + marker.chapterIndex * 3) % 9) - 4) * 0.72,
        scale: hero ? 1 : 0.98,
      }
    })
  })

  return {
    width: size.width,
    height: size.height,
    nodes,
    chapters: markers,
    path: constellationPath(markers),
  }
}

export function buildConstellationLayout(
  collection: MemoryCollection,
  size: ConstellationSize,
): ConstellationNode[] {
  return buildConstellationMap(collection, size).nodes
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
