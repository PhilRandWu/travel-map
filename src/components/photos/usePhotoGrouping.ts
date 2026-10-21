import { useCallback, useMemo, useRef, useState } from 'react'
import {
  matchPhotoDate,
  type PhotoMatch,
} from '@/lib/exifGrouping'
import {
  readPhotoCapturedAt,
  type ImportedPhotoFile,
} from '@/lib/photoFiles'
import type { TravelData } from '@/types'

export interface PendingPhoto {
  id: string
  file: File
  sourcePath: string
  capturedAt: string | null
  capturedDate: string | null
  match: PhotoMatch
  targetVisitId: string
  included: boolean
}

const MAX_PHOTOS = 500
const UI_BATCH_SIZE = 8

function photoKey(item: ImportedPhotoFile): string {
  return `${item.sourcePath}:${item.file.size}:${item.file.lastModified}`
}

function rowKey(row: PendingPhoto): string {
  return `${row.sourcePath}:${row.file.size}:${row.file.lastModified}`
}

function createId(index: number): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${index}`
}

export function usePhotoGrouping(data: TravelData) {
  const [rows, setRows] = useState<PendingPhoto[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const addPhotos = useCallback(async (items: ImportedPhotoFile[]) => {
    if (scanning) return
    const existing = new Set(rowsRef.current.map(rowKey))
    const unique = items.filter((item) => !existing.has(photoKey(item)))
    const available = Math.max(0, MAX_PHOTOS - rowsRef.current.length)
    const queue = unique.slice(0, available)
    const skipped = items.length - queue.length

    if (queue.length === 0) {
      setNotice(items.length === 0 ? '没有找到支持的图片文件' : '这些照片已经添加过')
      return
    }

    setScanning(true)
    setProgress(0)
    setNotice(null)
    let batch: PendingPhoto[] = []

    for (let index = 0; index < queue.length; index++) {
      const item = queue[index]
      const capturedAt = await readPhotoCapturedAt(item.file)
      const capturedDate = capturedAt?.slice(0, 10) ?? null
      const match = matchPhotoDate(data, capturedDate)
      batch.push({
        id: createId(index),
        file: item.file,
        sourcePath: item.sourcePath,
        capturedAt,
        capturedDate,
        match,
        targetVisitId: match.visitId ?? '',
        included: match.confidence !== 'none',
      })

      if (batch.length >= UI_BATCH_SIZE || index === queue.length - 1) {
        const complete = batch
        batch = []
        setRows((current) => [...current, ...complete])
      }
      setProgress((index + 1) / queue.length)
    }

    setScanning(false)
    setProgress(1)
    setNotice(
      skipped > 0
        ? `已扫描 ${queue.length} 张，跳过 ${skipped} 张重复或超出上限的照片`
        : `已扫描 ${queue.length} 张照片`,
    )
  }, [data, scanning])

  const updateTarget = useCallback((id: string, visitId: string) => {
    setRows((current) => current.map((row) =>
      row.id === id
        ? { ...row, targetVisitId: visitId, included: visitId !== '' }
        : row))
  }, [])

  const toggleIncluded = useCallback((id: string) => {
    setRows((current) => current.map((row) =>
      row.id === id && row.targetVisitId
        ? { ...row, included: !row.included }
        : row))
  }, [])

  const remove = useCallback((id: string) => {
    setRows((current) => current.filter((row) => row.id !== id))
  }, [])

  const clear = useCallback(() => {
    setRows([])
    setProgress(0)
    setNotice(null)
  }, [])

  const includedRows = useMemo(
    () => rows.filter((row) => row.included && row.targetVisitId),
    [rows],
  )

  return {
    rows,
    includedRows,
    scanning,
    progress,
    notice,
    addPhotos,
    updateTarget,
    toggleIncluded,
    remove,
    clear,
    setNotice,
  }
}
