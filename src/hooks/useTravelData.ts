import { useEffect, useState } from 'react'
import type { TravelData } from '@/types'
import tripsJson from '@/data/trips.json'
import {
  checkPhotoFiles,
  isTravelData,
  reportIssues,
  validateTravelData,
  type ValidationIssue,
} from '@/lib/validate'
export function useTravelData() {
  const [data] = useState<TravelData | null>(() =>
    isTravelData(tripsJson) ? tripsJson : null)
  const [issues, setIssues] = useState<ValidationIssue[]>([])

  useEffect(() => {
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
  }, [data])

  return {
    data,
    issues,
    hasErrors: issues.some((issue) => issue.level === 'error'),
  }
}
