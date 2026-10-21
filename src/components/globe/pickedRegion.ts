/** 当前选中区域（点击地球反查结果） */
export interface PickedRegion {
  name: string
  /** 副标题：中国地级市显示"省 · 中国"，外国显示国家名，海洋显示坐标 */
  detail?: string
  /** 点击位置（标签锚点） */
  lat: number
  lng: number
  /** 命中的边界（海洋为 undefined） */
  boundary?: GeoJSON.Feature
  ocean?: boolean
}
