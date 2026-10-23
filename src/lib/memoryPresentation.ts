import type { MemoryChapter } from '@/lib/memory'

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

export interface MemoryDateParts {
  year: string
  month: number
  day: string
  monthShort: string
  time?: string
}

export function memoryDateParts(value?: string): MemoryDateParts | null {
  const match = value?.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
  )
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  return {
    year,
    month: Number(month),
    day,
    monthShort: MONTHS[Number(month) - 1] ?? month,
    time: hour && minute ? `${hour}:${minute}` : undefined,
  }
}

export function memoryRoute(chapters: MemoryChapter[]): string {
  const cities = [...new Set(chapters.map((chapter) => chapter.cityName))]
  if (cities.length <= 3) return cities.join(' / ')
  return `${cities.slice(0, 3).join(' / ')} / +${cities.length - 3}`
}

export function memoryDateRange(chapters: MemoryChapter[]): string {
  const first = chapters[0]
  const last = chapters.at(-1)
  if (!first || !last) return '未标注日期'
  const from = first.arriveDate.replaceAll('-', '.')
  const to = last.leaveDate.replaceAll('-', '.')
  return first.arriveDate === last.leaveDate ? from : `${from} — ${to}`
}
