import type { PickedRegion } from '@/components/globe/pickedRegion'
import type { LitCity } from '@/lib/derive'
import type { ReplayRuntime } from '@/lib/replay'
import type { Tracks } from '@/lib/tracks'
import type { City } from '@/types'

export interface TravelGlobeProps {
  /** 已点亮城市（由 trips.json 推导） */
  litCities: LitCity[]
  /** 常居城市：空心双环提示，不参与目的地统计 */
  homeCity?: City
  /** 行程轨迹（由 trips.json 推导） */
  tracks: Tracks
  /** 其他旅程的低透明度星尘轨迹，仅用于回忆氛围 */
  stardustTracks?: Tracks
  /** 当前高亮城市（卡片打开或时间轴选中时） */
  selectedCityId: string | null
  /** 当前选中的行程（轨迹保持高亮，其余轨迹/城市淡出） */
  selectedTripId: string | null
  /** 当前旅程；变化时播放路线生长与城市依次点亮 */
  journeyId: string | null
  /** 行程选中时的轨迹取景点；visit/city 由 selectedCityId 聚焦 */
  focusPoint: { lat: number; lng: number } | null
  /** 每次选择行程递增，用于重复播放同一条轨迹的载具动效 */
  tripPlaybackSignal: number
  /** 时间轴回放状态；非 idle 时轨迹按已发生范围显隐 */
  replayRuntime: ReplayRuntime | null
  /** 返回总览时的复位信号 */
  resetSignal: number
  /** 地球场景与首屏纹理准备完成 */
  onReady?: () => void
  /** 城市点击（选中城市，弹出卡片）；null 表示取消 */
  onSelectCity: (cityId: string | null) => void
  /** 轨迹点击（选中 trip） */
  onSelectTrip: (tripId: string) => void
  /** 反查区域（点击空白处） */
  region: PickedRegion | null
  onPick: (region: PickedRegion | null) => void
}
