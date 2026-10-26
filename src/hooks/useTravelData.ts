import { useCallback, useEffect, useState } from 'react'
import type { TravelData } from '@/types'
import tripsJson from '@/data/trips.json'
import { hydrateStoredPhotos, pruneStoredPhotos } from '@/lib/localPhotoStore'
import {
  clearStoredTravelData,
  loadStoredTravelData,
  saveStoredTravelData,
} from '@/lib/travelStorage'
import {
  checkPhotoFiles,
  isTravelData,
  reportIssues,
  validateTravelData,
  type ValidationIssue,
} from '@/lib/validate'

function bundledTravelData(): TravelData | null {
  return isTravelData(tripsJson)
    ? JSON.parse(JSON.stringify(tripsJson)) as TravelData
    : null
}

export function useTravelData() {
  const [initial] = useState(() => {
    const stored = loadStoredTravelData()
    return {
      data: stored.data ?? bundledTravelData(),
      storageError: stored.error,
      savedAt: stored.savedAt,
    }
  })
  const [data, setData] = useState<TravelData | null>(initial.data)
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [storageError, setStorageError] = useState<string | null>(initial.storageError)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initial.savedAt)
  const [photosReady, setPhotosReady] = useState(false)
  const updateData = useCallback((next: TravelData) => {
    setData(next)
    const saved = saveStoredTravelData(next)
    setStorageError(saved.error)
    if (saved.savedAt) setLastSavedAt(saved.savedAt)
    void pruneStoredPhotos(next)
  }, [])
  const restoreBundledData = useCallback(() => {
    const bundled = bundledTravelData()
    if (!bundled) return
    setData(bundled)
    setIssues(validateTravelData(bundled))
    const saved = saveStoredTravelData(bundled)
    setStorageError(saved.error)
    setLastSavedAt(saved.savedAt)
  }, [])
  const clearLocalArchive = useCallback(() => {
    const cleared = clearStoredTravelData()
    const bundled = bundledTravelData()
    if (bundled) {
      setData(bundled)
      setIssues(validateTravelData(bundled))
    }
    setStorageError(cleared.error)
    setLastSavedAt(null)
  }, [])

  useEffect(() => {
    let active = true
    void hydrateStoredPhotos().finally(() => {
      if (active) setPhotosReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!photosReady) return

    if (!data) {
      const fatal: ValidationIssue[] = [{
        level: 'error',
        subject: 'trips.json',
        message: '顶层结构非法，应用不渲染任何旅行数据',
      }]
      setIssues(fatal)
      reportIssues(fatal)
      return
    }

    let cancelled = false
    const syncIssues = validateTravelData(data)
    setIssues(syncIssues)
    reportIssues(syncIssues)

    void checkPhotoFiles(data).then((photoIssues) => {
      if (cancelled || photoIssues.length === 0) return
      setIssues((current) => [...current, ...photoIssues])
      reportIssues(photoIssues)
    })

    return () => {
      cancelled = true
    }
  }, [data, photosReady])

  return {
    data,
    issues,
    hasErrors: issues.some((issue) => issue.level === 'error'),
    storageError,
    lastSavedAt,
    updateData,
    restoreBundledData,
    clearLocalArchive,
  }
}
