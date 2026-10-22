import { useMemo } from 'react'
import type { LitCity } from '@/lib/derive'
import { useJourneyEntrance } from '@/components/globe/hooks/useJourneyEntrance'

export function useJourneyReveal(
  litCities: LitCity[],
  journeyId: string | null,
  globeReady: boolean,
) {
  const entrance = useJourneyEntrance(globeReady ? journeyId : null)
  const revealCount = entrance.active
    ? Math.min(
        litCities.length,
        Math.max(
          0,
          Math.ceil(
            ((entrance.progress - 0.35) / 0.4) * litCities.length,
          ),
        ),
      )
    : litCities.length
  const revealedCityIds = useMemo(() => {
    if (!entrance.active) return null
    return new Set(litCities.slice(0, revealCount).map((lit) => lit.city.id))
  }, [entrance.active, litCities, revealCount])

  return { entrance, revealedCityIds }
}
