import { useCallback, useMemo, useRef } from 'react'
import type { TravelData } from '@/types'
import {
  buildMemoryDiscovery,
  memoryTargetKey,
  pickRandomMemory,
} from '@/lib/travelDiscovery'

export function useMemoryDiscovery(
  data: TravelData,
  currentCityId: string | null,
) {
  const referenceDate = useRef(new Date())
  const recentKeys = useRef<string[]>([])
  const discoveries = useMemo(
    () => buildMemoryDiscovery(data, {
      referenceDate: referenceDate.current,
      currentCityId,
    }),
    [currentCityId, data],
  )

  const pickNext = useCallback(() => {
    const target = pickRandomMemory(data, Math.random, recentKeys.current)
    if (!target) return null
    const key = memoryTargetKey(target)
    recentKeys.current = [
      key,
      ...recentKeys.current.filter((item) => item !== key),
    ].slice(0, 3)
    return target
  }, [data])

  return { discoveries, pickNext }
}
