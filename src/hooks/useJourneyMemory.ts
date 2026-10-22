import { useCallback, useMemo } from 'react'
import type { MemoryMode, MemorySource, MemoryView, TravelData } from '@/types'
import {
  buildMemoryCollection,
  filterMemoryPhotos,
  initialMemoryMode,
} from '@/lib/memory'
import { useMemoryOverlay } from '@/hooks/useMemoryOverlay'

export function useJourneyMemory(data: TravelData, scopeKey: string) {
  const memory = useMemoryOverlay(scopeKey)
  const collection = memory.overlay.status === 'open'
    ? buildMemoryCollection(data, memory.overlay.source)
    : null
  const photos = useMemo(
    () => collection && memory.overlay.status === 'open'
      ? filterMemoryPhotos(collection, memory.overlay.mode)
      : [],
    [collection, memory.overlay],
  )

  const openMemory = useCallback((source: MemorySource, photoIndex = 0) => {
    const next = buildMemoryCollection(data, source)
    memory.open(source, {
      mode: initialMemoryMode(next),
      view: 'stage',
      photoIndex,
    })
  }, [data, memory.open])

  const openJourneyMemory = useCallback((
    journeyId: string,
    view: MemoryView,
    mode?: MemoryMode,
  ) => {
    const source: MemorySource = { kind: 'journey', journeyId }
    const next = buildMemoryCollection(data, source)
    memory.open(source, {
      mode: mode ?? initialMemoryMode(next),
      view,
      photoIndex: 0,
    })
  }, [data, memory.open])

  return {
    overlay: memory.overlay,
    collection,
    photos,
    openMemory,
    openJourneyMemory,
    close: memory.close,
    setMode: memory.setMode,
    setView: memory.setView,
    setPhotoIndex: (index: number) => memory.setPhotoIndex(index, photos.length),
  }
}
