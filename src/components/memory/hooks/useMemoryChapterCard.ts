import { useEffect, useRef, useState } from 'react'
import type { MemoryCollection, MemoryPhoto } from '@/lib/memory'

export function useMemoryChapterCard(
  collection: MemoryCollection,
  photo: MemoryPhoto | undefined,
) {
  const [chapterCard, setChapterCard] = useState<{
    date: string
    cityName: string
  } | null>(null)
  const previousPhotoRef = useRef<MemoryPhoto | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!photo) return
    const previous = previousPhotoRef.current
    previousPhotoRef.current = photo
    if (previous?.chapterKey === photo.chapterKey) return

    const chapter = collection.chapters.find(
      (item) => item.key === photo.chapterKey,
    )
    const date = photo.takenAt?.slice(0, 10) ?? chapter?.arriveDate
    if (!date) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    setChapterCard({ date, cityName: photo.cityName })
    timerRef.current = window.setTimeout(() => setChapterCard(null), 900)
  }, [collection.chapters, photo])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  return chapterCard
}
