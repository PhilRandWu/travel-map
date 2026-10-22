import { describe, expect, it, vi } from 'vitest'
import { buildCityMarker } from '@/components/globe/cityMarkers'

describe('buildCityMarker', () => {
  it('exposes an interactive city button that re-enables pointer events', () => {
    const onSelect = vi.fn()
    const element = buildCityMarker({
      id: 'hangzhou',
      name: '杭州',
      lat: 30.27,
      lng: 120.15,
      visitCount: 1,
      labelVisible: false,
      selected: false,
      dimmed: false,
      arrival: false,
    }, {
      onSelect,
      onHover: vi.fn(),
    })

    const button = element.querySelector<HTMLButtonElement>('.rg-city-hit')
    expect(button?.tagName).toBe('BUTTON')
    expect(button?.getAttribute('aria-label')).toBe('打开杭州地点')
    expect(button?.style.pointerEvents).toBe('auto')

    button?.click()
    expect(onSelect).toHaveBeenCalledWith('hangzhou')
  })
})
