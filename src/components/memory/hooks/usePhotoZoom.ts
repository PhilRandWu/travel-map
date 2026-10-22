import { useState, type MouseEvent } from 'react'
import { clampZoom } from '@/lib/gesture'

export function usePhotoZoom() {
  const [scale, setScaleState] = useState(1)
  const [origin, setOrigin] = useState('50% 50%')

  const onDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (scale > 1) {
      setScaleState(1)
      setOrigin('50% 50%')
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setOrigin(
      `${((event.clientX - rect.left) / rect.width) * 100}% ${
        ((event.clientY - rect.top) / rect.height) * 100
      }%`,
    )
    setScaleState(2)
  }

  return {
    scale,
    origin,
    zoomed: scale > 1,
    reset: () => {
      setScaleState(1)
      setOrigin('50% 50%')
    },
    setScale: (value: number) => setScaleState(clampZoom(value)),
    onDoubleClick,
  }
}
