import type { LitCity } from '@/lib/derive'

/** htmlElementsData 的统一标记类型（城市点 + 反查定位点共用一个 html 层） */
export type GlobeMarker =
  | ({ kind: 'city' } & CityMarkerDatum)
  | ({ kind: 'region' } & RegionMarkerDatum)

export interface CityMarkerDatum {
  id: string
  name: string
  lat: number
  lng: number
  visitCount: number
  labelVisible: boolean
  selected: boolean
}

export interface RegionMarkerDatum {
  lat: number
  lng: number
  ocean?: boolean
}

interface CityHandlers {
  onSelect: (id: string) => void
  /** hover 仅用于唤醒大气辉光，不触发重渲染 */
  onHover: (id: string | null) => void
}

/**
 * 城市发光点 DOM：脉冲光环 + 亮点 + 名称浮标。
 * 坐标点精确落在 DOM 原点，名称悬浮在上方；
 * 名称默认随缩放显隐，hover/选中时常显；到访次数越多亮点越大。
 */
export function buildCityMarker(d: CityMarkerDatum, handlers: CityHandlers): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText =
    'position:relative;width:0;height:0;transform:translate(-50%,-50%);font-family:inherit;'

  const size = (d.selected ? 13 : 9) + Math.min(d.visitCount - 1, 3) * 1.6
  const core = d.selected ? '#67e8f9' : '#fcd34d'
  const glow = d.selected ? 'rgba(103,232,249,.85)' : 'rgba(252,211,77,.7)'
  const showLabel = d.labelVisible || d.selected

  el.innerHTML = `
    <div class="rg-city-label" style="
      position:absolute;left:50%;bottom:${size / 2 + 7}px;
      padding:3px 9px;border-radius:9px;white-space:nowrap;
      font-size:12px;font-weight:500;letter-spacing:.04em;color:#fff;
      background:rgba(8,11,22,.68);border:1px solid rgba(255,255,255,.13);
      backdrop-filter:blur(8px);
      pointer-events:none;
      opacity:${showLabel ? 1 : 0};
      transform:translate(-50%,${showLabel ? 0 : 3}px);
      transition:opacity .18s ease,transform .18s ease;">
      ${d.name}${d.visitCount > 1 ? ` <span style="color:rgba(255,255,255,.5);font-size:10px;">×${d.visitCount}</span>` : ''}
    </div>
    <div class="rg-city-hit" style="
      position:absolute;left:${-size}px;top:${-size}px;
      width:${size * 2}px;height:${size * 2}px;
      display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <span style="position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;
        margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;
        border:1.5px solid ${core};animation:rg-ping 1.8s ease-out infinite;"></span>
      <span style="position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;
        margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;
        border:1.5px solid ${core};animation:rg-ping 1.8s ease-out .9s infinite;"></span>
      ${d.selected ? `
      <span style="position:absolute;left:50%;top:50%;width:${size + 10}px;height:${size + 10}px;
        margin:${-(size + 10) / 2}px 0 0 ${-(size + 10) / 2}px;border-radius:50%;
        border:1px solid rgba(103,232,249,.45);
        box-shadow:0 0 18px 3px rgba(103,232,249,.25);"></span>` : ''}
      <span style="position:relative;width:${size * 0.56}px;height:${size * 0.56}px;border-radius:50%;
        background:${core};box-shadow:0 0 8px 2px ${glow};"></span>
    </div>
  `

  const label = el.querySelector<HTMLElement>('.rg-city-label')!
  const hit = el.querySelector<HTMLElement>('.rg-city-hit')!

  // hover：名称常显 + 大气辉光被唤醒（直接改 DOM，避免 setState 重建标记导致抖动）
  hit.addEventListener('mouseenter', () => {
    label.style.opacity = '1'
    label.style.transform = 'translate(-50%,0)'
    handlers.onHover(d.id)
  })
  hit.addEventListener('mouseleave', () => {
    if (!showLabel) {
      label.style.opacity = '0'
      label.style.transform = 'translate(-50%,3px)'
    }
    handlers.onHover(null)
  })
  hit.addEventListener('click', (e) => {
    e.stopPropagation()
    handlers.onSelect(d.id)
  })
  return el
}

/** 反查定位点 DOM（无文字，避免遮挡区域，与 buildCityMarker 区分颜色） */
export function buildRegionDot(d: RegionMarkerDatum): HTMLElement {
  const el = document.createElement('div')
  const color = d.ocean ? 'rgba(56,189,248,.95)' : 'rgba(252,211,77,.95)'
  el.style.cssText = 'transform:translate(-50%,-50%);width:12px;height:12px;pointer-events:none;'
  el.innerHTML = `
    <span style="position:absolute;inset:0;border-radius:50%;border:1.5px solid ${color};animation:rg-ping 1.1s ease-out infinite;"></span>
    <span style="position:absolute;inset:3px;border-radius:50%;background:${color};box-shadow:0 0 8px 2px ${color};"></span>
  `
  return el
}

export function toCityMarkerDatum(
  lit: LitCity,
  opts: { labelVisible: boolean; selected: boolean },
): CityMarkerDatum {
  return {
    id: lit.city.id,
    name: lit.city.name,
    lat: lit.city.lat,
    lng: lit.city.lng,
    visitCount: lit.visitCount,
    labelVisible: opts.labelVisible,
    selected: opts.selected,
  }
}
