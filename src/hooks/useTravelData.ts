import { useEffect, useMemo, useState } from 'react'
import type { TravelData } from '@/types'
import tripsJson from '@/data/trips.json'
import {
  checkPhotoFiles,
  isTravelData,
  reportIssues,
  validateTravelData,
  type ValidationIssue,
} from '@/lib/validate'
import {
  buildTimelineNodes,
  computeStats,
  selectLitCities,
} from '@/lib/derive'

/**
 * 加载 trips.json → 校验 → 暴露 data 与派生结果。
 * MVP 数据随包静态导入；校验错误只在控制台醒目打印，不阻断渲染
 * （缺引用的实体在推导层会被跳过）。
 */
export function useTravelData() {
  // JSON 为构建期静态导入，data 本身不变；仅异步照片校验结果需要 state
  const [data] = useState<TravelData | null>(() =>
    isTravelData(tripsJson) ? (tripsJson as TravelData) : null)
  const [issues, setIssues] = useState<ValidationIssue[]>([])

  useEffect(() => {
    if (!isTravelData(tripsJson)) {
      const fatal: ValidationIssue[] = [{
        level: 'error',
        subject: 'trips.json',
        message: '顶层结构非法，应用不渲染任何旅行数据',
      }]
      setIssues(fatal)
      reportIssues(fatal)
      return
    }
    const data = tripsJson as TravelData
    let cancelled = false
    const syncIssues = validateTravelData(data)
    reportIssues(syncIssues)
    setIssues(syncIssues)
    // 照片存在性为异步 HEAD 校验，到达后补充打印
    void checkPhotoFiles(data).then((photoIssues) => {
      if (cancelled || photoIssues.length === 0) return
      reportIssues(photoIssues)
      setIssues((prev) => [...prev, ...photoIssues])
    })
    return () => { cancelled = true }
  }, [])

  const derived = useMemo(() => {
    if (!data) return null
    return {
      litCities: selectLitCities(data),
      timeline: buildTimelineNodes(data),
      stats: computeStats(data),
    }
  }, [data])

  return {
    data,
    issues,
    hasErrors: issues.some((i) => i.level === 'error'),
    litCities: derived?.litCities ?? [],
    timeline: derived?.timeline ?? [],
    stats: derived?.stats ?? null,
  }
}
