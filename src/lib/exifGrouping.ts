import { resolveCities } from '@/lib/cities'
import type { TravelData, Visit } from '@/types'

export type PhotoMatchConfidence = 'exact' | 'near' | 'none'

export interface PhotoMatch {
  visitId: string | null
  cityName: string | null
  confidence: PhotoMatchConfidence
  distanceDays: number | null
  reason: string
}

export interface PhotoAssignment {
  id: string
  visitId: string
  fileName: string
  takenAt?: string
}

export interface ExportedPhotoFile {
  id: string
  visitId: string
  fileName: string
  targetPath: string
}

export interface PhotoExportResult {
  data: TravelData
  files: ExportedPhotoFile[]
}

const DAY_MS = 86_400_000

function utcDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function distanceFromVisit(date: string, visit: Visit): number {
  if (date < visit.arriveDate) {
    return Math.round((utcDay(visit.arriveDate) - utcDay(date)) / DAY_MS)
  }
  if (date > visit.leaveDate) {
    return Math.round((utcDay(date) - utcDay(visit.leaveDate)) / DAY_MS)
  }
  return 0
}

/** 将 EXIF 日期匹配到到访区间；附近一天仅作为待确认建议。 */
export function matchPhotoDate(
  data: TravelData,
  capturedDate: string | null,
): PhotoMatch {
  if (!capturedDate || !/^\d{4}-\d{2}-\d{2}/.test(capturedDate)) {
    return {
      visitId: null,
      cityName: null,
      confidence: 'none',
      distanceDays: null,
      reason: '缺少可用拍摄日期',
    }
  }
  const date = capturedDate.slice(0, 10)

  const cityMap = resolveCities(data)
  const exact = data.visits
    .filter((visit) =>
      visit.arriveDate <= date && date <= visit.leaveDate)
    .sort((a, b) => b.arriveDate.localeCompare(a.arriveDate))[0]

  if (exact) {
    return {
      visitId: exact.id,
      cityName: cityMap.get(exact.city)?.name ?? exact.city,
      confidence: 'exact',
      distanceDays: 0,
      reason: '拍摄日期位于到访区间',
    }
  }

  const nearest = data.visits
    .map((visit) => ({ visit, distanceDays: distanceFromVisit(date, visit) }))
    .sort((a, b) =>
      a.distanceDays - b.distanceDays
      || b.visit.arriveDate.localeCompare(a.visit.arriveDate))[0]

  if (nearest && nearest.distanceDays <= 1) {
    return {
      visitId: nearest.visit.id,
      cityName: cityMap.get(nearest.visit.city)?.name ?? nearest.visit.city,
      confidence: 'near',
      distanceDays: nearest.distanceDays,
      reason: '与到访日期相差 1 天，请确认',
    }
  }

  return {
    visitId: null,
    cityName: null,
    confidence: 'none',
    distanceDays: nearest?.distanceDays ?? null,
    reason: '没有日期匹配的到访',
  }
}

function baseName(fileName: string): string {
  return fileName.replaceAll('\\', '/').split('/').at(-1)?.trim() ?? ''
}

function withSuffix(fileName: string, suffix: number): string {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0) return `${fileName}-${suffix}`
  return `${fileName.slice(0, dot)}-${suffix}${fileName.slice(dot)}`
}

function uniqueFileName(fileName: string, used: Set<string>): string {
  if (!used.has(fileName)) {
    used.add(fileName)
    return fileName
  }
  let suffix = 2
  let candidate = withSuffix(fileName, suffix)
  while (used.has(candidate)) {
    suffix += 1
    candidate = withSuffix(fileName, suffix)
  }
  used.add(candidate)
  return candidate
}

/** 生成可直接替换 src/data/trips.json 的数据，并返回照片复制目标。 */
export function buildPhotoExport(
  data: TravelData,
  assignments: PhotoAssignment[],
): PhotoExportResult {
  const next = structuredClone(data)
  const usedByVisit = new Map<string, Set<string>>()
  for (const visit of next.visits) {
    usedByVisit.set(visit.id, new Set(visit.photos.map((photo) => photo.file)))
  }

  const files: ExportedPhotoFile[] = []
  for (const assignment of assignments) {
    const fileName = baseName(assignment.fileName)
    const visit = next.visits.find((item) => item.id === assignment.visitId)
    const used = usedByVisit.get(assignment.visitId)
    if (!fileName || !visit || !used) continue

    const finalName = uniqueFileName(fileName, used)
    visit.photos.push({
      file: finalName,
      caption: '',
      ...(assignment.takenAt ? { takenAt: assignment.takenAt } : {}),
    })
    files.push({
      id: assignment.id,
      visitId: visit.id,
      fileName: finalName,
      targetPath: `public/photos/${visit.id}/${finalName}`,
    })
  }

  return { data: next, files }
}
