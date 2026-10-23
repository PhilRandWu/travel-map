import { useEffect, useRef, useState } from 'react'
import type { MemoryCollection, MemoryPhoto } from '@/lib/memory'

interface ChapterCardState {
  chapterKey: string
  date: string
  cityName: string
}

const CHAPTER_CARD_MS = 900

export function useMemoryChapterCard(
  collection: MemoryCollection,
  photo: MemoryPhoto | undefined,
) {
  const [chapterCard, setChapterCard] = useState<ChapterCardState | null>(null)
  const activeCardRef = useRef<ChapterCardState | null>(null)
  const previousChapterKeyRef = useRef<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!photo) {
      activeCardRef.current = null
      previousChapterKeyRef.current = null
      setChapterCard(null)
      return
    }

    const previousKey = previousChapterKeyRef.current
    previousChapterKeyRef.current = photo.chapterKey
    if (previousKey !== photo.chapterKey) {
      const chapter = collection.chapters.find(
        (item) => item.key === photo.chapterKey,
      )
      const date = photo.takenAt?.slice(0, 10) ?? chapter?.arriveDate
      if (!date) {
        activeCardRef.current = null
        setChapterCard(null)
        return
      }

      const nextCard = {
        chapterKey: photo.chapterKey,
        date,
        cityName: photo.cityName,
      }
      activeCardRef.current = nextCard
      setChapterCard(nextCard)
    }

    // StrictMode replays effects; re-arm the dismiss timer from the active card.
    if (
      activeCardRef.current?.chapterKey !== photo.chapterKey
      || timerRef.current !== null
    ) {
      return
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      activeCardRef.current = null
      setChapterCard(null)
    }, CHAPTER_CARD_MS)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [collection.chapters, photo])

  return chapterCard
}
