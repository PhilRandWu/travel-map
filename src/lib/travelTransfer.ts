import type { TravelData } from '@/types'
import {
  isTravelData,
  validateTravelData,
  type ValidationIssue,
} from '@/lib/validate'

export interface ParsedTravelData {
  data: TravelData | null
  issues: ValidationIssue[]
}

export function serializeTravelData(data: TravelData): string {
  return `${JSON.stringify(data, null, 2)}\n`
}

export function readTravelDataFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new Error('当前浏览器无法读取导入文件。'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

export function parseTravelDataText(text: string): ParsedTravelData {
  let input: unknown
  try {
    input = JSON.parse(text)
  } catch (error) {
    return {
      data: null,
      issues: [{
        level: 'error',
        subject: 'import',
        message: `JSON 无法解析：${(error as Error).message}`,
      }],
    }
  }

  if (!isTravelData(input)) {
    return {
      data: null,
      issues: [{
        level: 'error',
        subject: 'import',
        message: '顶层结构非法：需要 { meta, cities, journeys, trips, visits }',
      }],
    }
  }

  const issues = validateTravelData(input)
    .filter((issue) => issue.level === 'error')
  return { data: issues.length === 0 ? input : null, issues }
}

export function travelDataFileName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `travel-data-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

export function downloadTravelData(
  data: TravelData,
  fileName = travelDataFileName(),
): string {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return fileName

  const blob = new Blob([serializeTravelData(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return fileName
}
