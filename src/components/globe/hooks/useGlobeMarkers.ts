import { useMemo, type RefObject } from 'react'
import type { LitCity } from '@/lib/derive'
import type { City } from '@/types'
import {
  toCityMarkerDatum,
  type GlobeMarker,
} from '@/components/globe/cityMarkers'

interface RegionPoint {
  lat: number
  lng: number
  ocean?: boolean
}

interface Options {
  litCities: LitCity[]
  homeCity?: City
  zoomedIn: boolean
  selectedCityId: string | null
  activeCityIds: ReadonlySet<string> | null
  revealedCityIds: ReadonlySet<string> | null
  arrivalActive: boolean
  region: RegionPoint | null
  onSelectCityRef: RefObject<(cityId: string | null) => void>
  cityHoveringRef: RefObject<boolean>
  lastInteractRef: RefObject<number>
}

/** 城市点 + 反查定位点共用一个 html 层；名称显隐/选中态变化时才重建 */
export function useGlobeMarkers({
  litCities,
  homeCity,
  zoomedIn,
  selectedCityId,
  activeCityIds,
  revealedCityIds,
  arrivalActive,
  region,
  onSelectCityRef,
  cityHoveringRef,
  lastInteractRef,
}: Options) {
  const markers = useMemo<GlobeMarker[]>(() => {
    const visibleCities = revealedCityIds
      ? litCities.filter((lit) => revealedCityIds.has(lit.city.id))
      : litCities
    const list: GlobeMarker[] = visibleCities.map((lit) => ({
      kind: 'city',
      ...toCityMarkerDatum(lit, {
        labelVisible: zoomedIn,
        selected: lit.city.id === selectedCityId,
        dimmed: activeCityIds !== null && !activeCityIds.has(lit.city.id),
        arrival: arrivalActive,
      }),
    }))
    if (homeCity) {
      list.push({
        kind: 'home',
        id: homeCity.id,
        name: homeCity.name,
        lat: homeCity.lat,
        lng: homeCity.lng,
        labelVisible: zoomedIn,
      })
    }
    if (region) {
      list.push({ kind: 'region', lat: region.lat, lng: region.lng, ocean: region.ocean })
    }
    return list
  }, [
    activeCityIds,
    arrivalActive,
    homeCity,
    litCities,
    region,
    revealedCityIds,
    selectedCityId,
    zoomedIn,
  ])

  const handleSelectCity = (id: string) => {
    lastInteractRef.current = performance.now()
    onSelectCityRef.current(id)
  }
  const handleHoverCity = (id: string | null) => {
    // 仅驱动大气辉光，不 setState（避免 hover 时重建标记）
    cityHoveringRef.current = id !== null
  }

  return { markers, handleSelectCity, handleHoverCity }
}
