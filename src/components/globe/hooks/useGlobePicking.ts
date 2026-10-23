import { useRef, useState, type RefObject } from 'react'
import {
  formatLatLng,
  reverseGeocode,
  type GeoHit,
} from '@/lib/geoLookup'
import type { PickedRegion } from '@/components/globe/pickedRegion'

interface Options {
  onPickRef: RefObject<(region: PickedRegion | null) => void>
  lastInteractRef: RefObject<number>
  flyTo: (lat: number, lng: number, altitude: number) => void
}

export function useGlobePicking({
  onPickRef,
  lastInteractRef,
  flyTo,
}: Options) {
  const clickSeqRef = useRef(0)
  const [locating, setLocating] = useState(false)

  const handleGlobeClick = async (coords: { lat: number; lng: number }) => {
    const { lat, lng } = coords
    lastInteractRef.current = performance.now()
    const seq = ++clickSeqRef.current
    setLocating(true)

    let hit: GeoHit | null = null
    try {
      hit = await reverseGeocode(lat, lng)
    } catch (err) {
      console.error('[geo] 地名反查失败', err)
    }
    if (seq !== clickSeqRef.current) return
    setLocating(false)

    if (!hit) {
      onPickRef.current({
        name: '海洋',
        detail: formatLatLng(lat, lng),
        lat,
        lng,
        ocean: true,
      })
      return
    }

    onPickRef.current({
      name: hit.name,
      detail:
        hit.kind === 'city'
          ? `${hit.province ?? ''} · 中国`
          : hit.kind === 'country'
            ? (hit.country !== hit.name ? hit.country : undefined)
            : '中国',
      lat,
      lng,
      boundary: hit.boundary,
    })
    const targetAlt = hit.kind === 'city'
      ? 1.1
      : hit.kind === 'municipality'
        ? 1.5
        : 2.1
    flyTo(lat, lng, targetAlt)
  }

  return { locating, handleGlobeClick }
}
