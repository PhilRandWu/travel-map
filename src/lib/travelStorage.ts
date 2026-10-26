import type { TravelData } from '@/types'
import { isTravelData, validateTravelData } from '@/lib/validate'

export const TRAVEL_STORAGE_KEY = 'travel-map:data'
const STORAGE_VERSION = 1

interface StoredEnvelope {
  version: 1
  savedAt: string
  data: TravelData
}

export interface StoredTravelResult {
  data: TravelData | null
  savedAt: string | null
  error: string | null
}

export interface SaveTravelResult {
  ok: boolean
  error: string | null
  savedAt: string | null
}

export interface ClearTravelResult {
  ok: boolean
  error: string | null
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadStoredTravelData(
  storage: Storage | null = browserStorage(),
): StoredTravelResult {
  if (!storage) return { data: null, savedAt: null, error: null }

  let raw: string | null
  try {
    raw = storage.getItem(TRAVEL_STORAGE_KEY)
  } catch {
    return { data: null, savedAt: null, error: '无法读取浏览器本地存档。' }
  }
  if (!raw) return { data: null, savedAt: null, error: null }

  try {
    const envelope = JSON.parse(raw) as Partial<StoredEnvelope>
    if (envelope.version !== STORAGE_VERSION || !isTravelData(envelope.data)) {
      return {
        data: null,
        savedAt: null,
        error: '本地存档结构不合法，已回退到内置示例。',
      }
    }

    const errors = validateTravelData(envelope.data)
      .filter((issue) => issue.level === 'error')
    if (errors.length > 0) {
      return {
        data: null,
        savedAt: null,
        error: `本地存档校验失败（${errors.length} 个错误），已回退到内置示例。`,
      }
    }

    return {
      data: envelope.data,
      savedAt: typeof envelope.savedAt === 'string' ? envelope.savedAt : null,
      error: null,
    }
  } catch {
    return {
      data: null,
      savedAt: null,
      error: '本地存档 JSON 无法解析，已回退到内置示例。',
    }
  }
}

export function saveStoredTravelData(
  data: TravelData,
  storage: Storage | null = browserStorage(),
): SaveTravelResult {
  if (!storage) {
    return {
      ok: false,
      error: '当前浏览器不支持本地自动保存，请导出 JSON 备份。',
      savedAt: null,
    }
  }

  const savedAt = new Date().toISOString()
  const envelope: StoredEnvelope = {
    version: STORAGE_VERSION,
    savedAt,
    data,
  }

  try {
    storage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(envelope))
    return { ok: true, error: null, savedAt }
  } catch (error) {
    const quota = error instanceof DOMException
      && (error.name === 'QuotaExceededError' || error.code === 22)
    return {
      ok: false,
      error: quota
        ? '浏览器本地存储空间不足；照片已存 IndexedDB，建议导出 JSON 并清理旧存档。'
        : '浏览器本地自动保存失败，请导出 JSON 备份。',
      savedAt: null,
    }
  }
}

export function clearStoredTravelData(
  storage: Storage | null = browserStorage(),
): ClearTravelResult {
  if (!storage) {
    return { ok: false, error: '当前浏览器不支持本地存档。' }
  }
  try {
    storage.removeItem(TRAVEL_STORAGE_KEY)
    return { ok: true, error: null }
  } catch {
    return { ok: false, error: '无法清理浏览器本地存档。' }
  }
}

export function formatSavedAt(value: string | null): string {
  if (!value) return '尚未保存'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚未保存'
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
