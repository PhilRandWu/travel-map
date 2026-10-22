import { useEffect } from 'react'
import type { MemoryPhoto } from '@/lib/memory'
import type { MemoryView } from '@/types'

export function useMemoryConstellationReturn(
  view: MemoryView,
  photoIndex: number,
  photos: MemoryPhoto[],
) {
  useEffect(() => {
    if (view !== 'constellation') return
    const frame = requestAnimationFrame(() => {
      const photo = photos[photoIndex]
      const host = document.querySelector<HTMLElement>('[data-constellation-host]')
      const node = photo
        ? document.querySelector<HTMLElement>(
            `[data-photo-key="${CSS.escape(photo.key)}"]`,
          )
        : null
      if (!host || !node) return
      const hostRect = host.getBoundingClientRect()
      const nodeRect = node.getBoundingClientRect()
      const visible = nodeRect.bottom >= hostRect.top
        && nodeRect.top <= hostRect.bottom
        && nodeRect.right >= hostRect.left
        && nodeRect.left <= hostRect.right
      if (!visible) node.scrollIntoView({ block: 'center', inline: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [photoIndex, photos, view])
}
