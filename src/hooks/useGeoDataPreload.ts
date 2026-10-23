import { useEffect } from 'react'
import { preloadGeoData } from '@/lib/geoLookup'

export function useGeoDataPreload() {
  useEffect(() => {
    const idle = (window as unknown as {
      requestIdleCallback?: (callback: () => void) => number
    }).requestIdleCallback

    if (idle) {
      idle(() => preloadGeoData())
      return
    }

    const timer = setTimeout(preloadGeoData, 2500)
    return () => clearTimeout(timer)
  }, [])
}
