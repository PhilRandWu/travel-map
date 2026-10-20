import type { City, TravelData, Trip, Visit } from '@/types'
import { resolveCities } from '@/lib/cities'

/**
 * 数据校验（PRD 第 4 节「校验要求」）：
 * - id 不重复（cities / trips / visits 各自且全局）
 * - from / to / waypoints / visit.city / meta.homeCity 引用存在
 * - 日期合法、arriveDate ≤ leaveDate
 * - 照片文件存在（dev 下异步 fetch HEAD，见 checkPhotoFiles）
 * 错误以醒目格式打印到 console，列出具体 id 与原因，不静默。
 */

export interface ValidationIssue {
  level: 'error' | 'warning'
  /** 出错对象 id，如 trip:t002 */
  subject: string
  message: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** 严格校验 YYYY-MM-DD 且为真实日历日（排除 2025-02-30） */
export function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** 比较两个 YYYY-MM-DD：a < b → -1 */
export function compareDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 顶层结构防御性检查（JSON 可能被手工改坏） */
export function isTravelData(v: unknown): v is TravelData {
  if (!isObject(v) || !isObject(v.meta)) return false
  return Array.isArray(v.cities) && Array.isArray(v.trips) && Array.isArray(v.visits)
}

function checkDuplicateIds(
  items: Array<{ id?: unknown }>,
  kind: string,
  seen: Set<string>,
  issues: ValidationIssue[],
) {
  for (const item of items) {
    const id = String(item.id ?? '(无 id)')
    const subject = `${kind}:${id}`
    if (typeof item.id !== 'string' || item.id === '') {
      issues.push({ level: 'error', subject, message: '缺少合法 id' })
      continue
    }
    if (seen.has(id)) {
      issues.push({ level: 'error', subject, message: `id「${id}」重复（id 必须全局唯一）` })
    }
    seen.add(id)
  }
}

/**
 * 同步校验：结构、id 唯一性、引用完整性、日期、坐标范围。
 * 城市解析同时认可 trips.json 自带 cities 与内置坐标表（lib/cities.ts）。
 */
export function validateTravelData(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isTravelData(input)) {
    issues.push({
      level: 'error',
      subject: 'trips.json',
      message: '顶层结构非法：需要 { meta, cities, trips, visits }',
    })
    return issues
  }

  const data = input as TravelData
  const seen = new Set<string>()
  checkDuplicateIds(data.cities, 'city', seen, issues)
  checkDuplicateIds(data.trips, 'trip', seen, issues)
  checkDuplicateIds(data.visits, 'visit', seen, issues)

  const cityMap = resolveCities(data)
  const requireCity = (ref: unknown, subject: string, field: string) => {
    if (typeof ref !== 'string' || ref === '') {
      issues.push({ level: 'error', subject, message: `${field} 缺少城市 id` })
      return
    }
    if (!cityMap.has(ref)) {
      issues.push({ level: 'error', subject, message: `${field} 引用了不存在的城市「${ref}」` })
    }
  }

  // meta.homeCity
  requireCity(data.meta?.homeCity, 'meta', 'homeCity')

  // cities 坐标范围（仅校验 JSON 自带城市）
  for (const c of data.cities as unknown as City[]) {
    const subject = `city:${c.id}`
    if (typeof c.name !== 'string' || c.name === '') {
      issues.push({ level: 'error', subject, message: '缺少 name' })
    }
    if (typeof c.lat !== 'number' || c.lat < -90 || c.lat > 90) {
      issues.push({ level: 'error', subject, message: `lat 越界或非法：${String(c.lat)}` })
    }
    if (typeof c.lng !== 'number' || c.lng < -180 || c.lng > 180) {
      issues.push({ level: 'error', subject, message: `lng 越界或非法：${String(c.lng)}` })
    }
  }

  // trips
  for (const t of data.trips as unknown as Trip[]) {
    const subject = `trip:${t.id}`
    requireCity(t.from, subject, 'from')
    requireCity(t.to, subject, 'to')
    if (!Array.isArray(t.waypoints)) {
      issues.push({ level: 'error', subject, message: 'waypoints 必须是数组（无经停填 []）' })
    } else {
      t.waypoints.forEach((w, i) => requireCity(w, subject, `waypoints[${i}]`))
    }
    if (t.type !== 'flight' && t.type !== 'train') {
      issues.push({ level: 'error', subject, message: `type 非法：${String(t.type)}（仅 flight / train）` })
    }
    if (!isValidISODate(t.date)) {
      issues.push({ level: 'error', subject, message: `date 非法：${String(t.date)}（应为 YYYY-MM-DD）` })
    }
    if (t.type === 'flight' && Array.isArray(t.waypoints) && t.waypoints.length > 0) {
      issues.push({ level: 'warning', subject, message: 'flight 不应配置 waypoints（高空直飞大圆弧）' })
    }
  }

  // visits
  for (const v of data.visits as unknown as Visit[]) {
    const subject = `visit:${v.id}`
    requireCity(v.city, subject, 'city')
    if (!isValidISODate(v.arriveDate)) {
      issues.push({ level: 'error', subject, message: `arriveDate 非法：${String(v.arriveDate)}` })
    }
    if (!isValidISODate(v.leaveDate)) {
      issues.push({ level: 'error', subject, message: `leaveDate 非法：${String(v.leaveDate)}` })
    }
    if (isValidISODate(v.arriveDate) && isValidISODate(v.leaveDate)
      && compareDate(v.arriveDate, v.leaveDate) > 0) {
      issues.push({ level: 'error', subject, message: `arriveDate(${v.arriveDate}) 晚于 leaveDate(${v.leaveDate})` })
    }
    if (!Array.isArray(v.photos) || v.photos.length === 0) {
      issues.push({ level: 'warning', subject, message: '没有挂任何照片（至少 1 张占位图）' })
    } else {
      v.photos.forEach((p, i) => {
        if (typeof p.file !== 'string' || p.file === '') {
          issues.push({ level: 'error', subject, message: `photos[${i}] 缺少 file` })
        }
      })
    }
  }

  return issues
}

/** 照片文件存在性：dev 下对 /photos/<visit-id>/<file> 做 HEAD 请求 */
export async function checkPhotoFiles(data: TravelData): Promise<ValidationIssue[]> {
  if (!import.meta.env.DEV) return []
  const issues: ValidationIssue[] = []
  await Promise.all(
    data.visits.flatMap((v) =>
      v.photos.map(async (p) => {
        const url = `${import.meta.env.BASE_URL}photos/${v.id}/${p.file}`
        try {
          const res = await fetch(url, { method: 'HEAD' })
          // Vite dev 对缺失静态文件会 SPA fallback 返回 200 text/html，必须同时判别 Content-Type
          const type = res.headers.get('content-type') ?? ''
          if (!res.ok || type.includes('text/html')) {
            issues.push({
              level: 'error',
              subject: `visit:${v.id}`,
              message: `照片文件不存在：${url}（HTTP ${res.status}${type ? `, ${type}` : ''}）`,
            })
          }
        } catch (e) {
          issues.push({
            level: 'warning',
            subject: `visit:${v.id}`,
            message: `照片无法校验：${url}（${(e as Error).message}）`,
          })
        }
      }),
    ),
  )
  return issues
}

/** 醒目格式打印校验结果；有 error 时返回 false */
export function reportIssues(issues: ValidationIssue[]): boolean {
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')
  if (issues.length === 0) {
    console.log('%c✓ trips.json 校验通过', 'color:#4ade80;font-weight:bold')
    return true
  }
  const badge = errors.length > 0 ? '✕ trips.json 校验失败' : '⚠ trips.json 校验告警'
  console.groupCollapsed(
    `%c${badge}：${errors.length} 个错误，${warnings.length} 个警告`,
    errors.length > 0 ? 'color:#f87171;font-weight:bold' : 'color:#fbbf24;font-weight:bold',
  )
  for (const i of issues) {
    const icon = i.level === 'error' ? '✕' : '⚠'
    console.log(`%c${icon} [${i.subject}] ${i.message}`, i.level === 'error' ? 'color:#f87171' : 'color:#fbbf24')
  }
  console.groupEnd()
  return errors.length === 0
}
