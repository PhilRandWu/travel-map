import type { JourneyTheme, TravelData } from '@/types'
import type { ValidationIssue } from '@/lib/validate'

const JOURNEY_THEMES: JourneyTheme[] = ['amber', 'cyan', 'sage', 'rose']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function inRange(date: string, start: string, end: string): boolean {
  return validDate(date) && date >= start && date <= end
}

export function validateJourneyData(
  data: TravelData,
  seenIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const journeyMap = new Map<string, TravelData['journeys'][number]>()
  const visitMap = new Map(data.visits.map((visit) => [visit.id, visit]))

  if (data.meta.version !== 2) {
    issues.push({
      level: 'error',
      subject: 'meta',
      message: `version 必须为 2，当前为 ${String(data.meta.version)}`,
    })
  }

  for (const journey of data.journeys) {
    const subject = `journey:${journey.id}`

    if (typeof journey.id !== 'string' || journey.id === '') {
      issues.push({ level: 'error', subject, message: '缺少合法 id' })
    } else if (seenIds.has(journey.id)) {
      issues.push({ level: 'error', subject, message: `id「${journey.id}」重复` })
    } else {
      seenIds.add(journey.id)
      journeyMap.set(journey.id, journey)
    }

    if (typeof journey.title !== 'string' || journey.title.trim() === '') {
      issues.push({ level: 'error', subject, message: '缺少 title' })
    }
    if (!validDate(journey.startDate) || !validDate(journey.endDate)) {
      issues.push({ level: 'error', subject, message: '起止日期必须使用合法的 YYYY-MM-DD' })
    } else if (journey.startDate > journey.endDate) {
      issues.push({ level: 'error', subject, message: 'startDate 不能晚于 endDate' })
    }
    if (!JOURNEY_THEMES.includes(journey.theme)) {
      issues.push({ level: 'error', subject, message: `theme 非法：${String(journey.theme)}` })
    }
    if (!Array.isArray(journey.coverPhotos) || journey.coverPhotos.length > 5) {
      issues.push({ level: 'error', subject, message: 'coverPhotos 必须是 0–5 张的数组' })
      continue
    }

    journey.coverPhotos.forEach((cover, index) => {
      const visit = visitMap.get(cover.visitId)

      if (!visit) {
        issues.push({
          level: 'error',
          subject,
          message: `coverPhotos[${index}] 引用了不存在的到访「${cover.visitId}」`,
        })
        return
      }
      if (visit.journeyId !== journey.id) {
        issues.push({
          level: 'error',
          subject,
          message: `coverPhotos[${index}] 不能引用其他旅程的到访「${cover.visitId}」`,
        })
        return
      }
      if (!visit.photos.some((photo) => photo.file === cover.file)) {
        issues.push({
          level: 'error',
          subject,
          message: `coverPhotos[${index}] 引用了不存在的照片「${cover.file}」`,
        })
      }
    })
  }

  for (const trip of data.trips) {
    const subject = `trip:${trip.id}`
    const journey = journeyMap.get(trip.journeyId)

    if (!journey) {
      issues.push({
        level: 'error',
        subject,
        message: `journeyId「${trip.journeyId}」不存在`,
      })
    } else if (validDate(trip.date)
      && !inRange(trip.date, journey.startDate, journey.endDate)) {
      issues.push({
        level: 'error',
        subject,
        message: `date「${trip.date}」不在旅程 ${journey.id} 的日期范围内`,
      })
    }
  }

  for (const visit of data.visits) {
    const subject = `visit:${visit.id}`
    const journey = journeyMap.get(visit.journeyId)

    if (!journey) {
      issues.push({
        level: 'error',
        subject,
        message: `journeyId「${visit.journeyId}」不存在`,
      })
    } else if (validDate(visit.arriveDate) && validDate(visit.leaveDate)) {
      if (!inRange(visit.arriveDate, journey.startDate, journey.endDate)
        || !inRange(visit.leaveDate, journey.startDate, journey.endDate)) {
        issues.push({
          level: 'error',
          subject,
          message: `到访日期不在旅程 ${journey.id} 的日期范围内`,
        })
      }
    }
    if (visit.city === data.meta.homeCity) {
      issues.push({
        level: 'error',
        subject,
        message: '常居城市不能创建旅行到访；请由 meta.homeCity 独立点亮',
      })
    }

    visit.photos.forEach((photo, index) => {
      if (photo.takenAt !== undefined && !ISO_DATE_TIME.test(photo.takenAt)) {
        issues.push({
          level: 'error',
          subject,
          message: `photos[${index}].takenAt 必须是带时区的 ISO 8601`,
        })
      }
      if (photo.featured !== undefined && typeof photo.featured !== 'boolean') {
        issues.push({
          level: 'error',
          subject,
          message: `photos[${index}].featured 必须是布尔值`,
        })
      }
      if (photo.focalPoint) {
        const { x, y } = photo.focalPoint
        if (typeof x !== 'number' || typeof y !== 'number'
          || x < 0 || x > 1 || y < 0 || y > 1) {
          issues.push({
            level: 'error',
            subject,
            message: `photos[${index}].focalPoint 必须位于 0–1`,
          })
        }
      }
    })
  }

  return issues
}
