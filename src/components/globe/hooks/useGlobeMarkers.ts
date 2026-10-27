import { useMemo, type RefObject } from 'react'
import type { LitCity } from '@/lib/derive'
import type { TransportRoute } from '@/lib/tracks'
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
  activeRoute: TransportRoute | null
  revealedCityIds: ReadonlySet<string> | null
  arrivalActive: boolean
  region: RegionPoint | null
  onSelectCityRef: RefObject<(cityId: string | null) => void>
  cityHoveringRef: RefObject<boolean>
  lastInteractRef: RefObject<number>
  locked: boolean
}

/** 城市点 + 反查定位点共用一个 html 层；名称显隐/选中态变化时才重建 */
export function useGlobeMarkers({
  litCities,
  homeCity,
  zoomedIn,
  selectedCityId,
  activeCityIds,
  activeRoute,
  revealedCityIds,
  arrivalActive,
  region,
  onSelectCityRef,
  cityHoveringRef,
  lastInteractRef,
  locked,
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
    for (const city of activeRoute?.stops.slice(1, -1) ?? []) {
      list.push({
        kind: 'waypoint',
        id: city.id,
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        type: activeRoute!.type,
      })
    }
    if (region) {
      list.push({ kind: 'region', lat: region.lat, lng: region.lng, ocean: region.ocean })
    }
    return list
  }, [
    activeCityIds,
    activeRoute,
    arrivalActive,
    homeCity,
    litCities,
    locked,
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
