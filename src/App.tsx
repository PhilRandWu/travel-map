import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Starfield from '@/components/globe/Starfield'
import type { PickedRegion } from '@/components/globe/TravelGlobe'
import CityCard from '@/components/city/CityCard'
import HeroPhoto from '@/components/hero/HeroPhoto'
import StatsPanel from '@/components/stats/StatsPanel'
import Timeline from '@/components/timeline/Timeline'
import { useTravelData } from '@/hooks/useTravelData'
import { preloadGeoData } from '@/lib/geoLookup'
import { findTrip, type TimelineNode } from '@/lib/derive'
import { buildTracks, type Tracks } from '@/lib/tracks'
import type { Selection } from '@/types'

const EMPTY_TRACKS: Tracks = { flights: [], trains: [] }

// three.js + globe.gl 体积大，拆成异步 chunk：星空与 UI 先出，地球随后加载
const TravelGlobe = lazy(() => import('@/components/globe/TravelGlobe'))

/**
 * 布局骨架（T0.3）：
 * - 全屏星空 + 3D 地球为底
 * - 悬浮 UI 层（顶栏 / 主图区 / 城市卡片 / 时间轴）后续阶段填充
 * 悬浮层使用 pointer-events-none，交互子元素自行 pointer-events-auto。
 *
 * 状态（PLAN 0.3）：Selection 为唯一选中态；城市卡片另用 cardCityId 保持可见，
 * 便于卡片内点行程时切换到 trip 而不丢失城市上下文。
 */
export default function App() {
  const { data, litCities, timeline, stats } = useTravelData()
  const tracks = useMemo(() => (data ? buildTracks(data) : EMPTY_TRACKS), [data])
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const [cardCityId, setCardCityId] = useState<string | null>(null)
  const [region, setRegion] = useState<PickedRegion | null>(null)
  // 递增信号让地球在“回到总览”时强制复位，即使 POV 已经接近初始值
  const [resetSignal, setResetSignal] = useState(0)

  const focusPoint = useMemo(() => {
    if (!data || selection.kind !== 'trip') return null
    const track = [...tracks.flights, ...tracks.trains].find(
      (item) => item.trip.id === selection.tripId,
    )
    if (!track) return null
    return {
      lat: (track.fromLat + track.toLat) / 2,
      lng: (track.fromLng + track.toLng) / 2,
    }
  }, [selection, tracks])

  // 浏览器空闲时预取边界数据，消除首次点击的反查延迟
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    if (idle) idle(() => preloadGeoData())
    else {
      const t = setTimeout(preloadGeoData, 2500)
      return () => clearTimeout(t)
    }
  }, [])

  const handleSelectCity = (cityId: string | null) => {
    setCardCityId(cityId)
    setSelection(cityId ? { kind: 'city', cityId } : { kind: 'none' })
    if (cityId) setRegion(null)
  }

  const handleSelectTrip = (tripId: string) => {
    // 轨迹点击：选中 trip 并聚焦其出发城市卡片，保持上下文
    const trip = data?.trips.find((t) => t.id === tripId)
    setSelection({ kind: 'trip', tripId })
    setRegion(null)
    if (trip) setCardCityId(trip.from)
  }

  const handleSelectTimelineNode = (node: TimelineNode) => {
    if (!data) return
    setRegion(null)
    if (node.kind === 'visit') {
      setSelection({ kind: 'visit', visitId: node.refId })
      setCardCityId(node.cityId)
      return
    }
    const trip = findTrip(data, node.refId)
    if (!trip) return
    setSelection({ kind: 'trip', tripId: trip.id })
    setCardCityId(trip.from)
  }

  const resetToOverview = () => {
    setSelection({ kind: 'none' })
    setCardCityId(null)
    setRegion(null)
    setResetSignal((signal) => signal + 1)
  }

  const handlePickRegion = (next: PickedRegion | null) => {
    setRegion(next)
    // 点击空白区域时收起城市卡片，反查 HUD 与卡片互斥
    if (next) {
      setCardCityId(null)
      setSelection({ kind: 'none' })
    }
  }

  const handleCloseCard = () => {
    setCardCityId(null)
    setSelection({ kind: 'none' })
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans text-white select-none">
      <Starfield />
      <Suspense fallback={null}>
        <TravelGlobe
          litCities={litCities}
          tracks={tracks}
          selectedCityId={cardCityId}
          selectedTripId={selection.kind === 'trip' ? selection.tripId : null}
          focusPoint={focusPoint}
          resetSignal={resetSignal}
          onSelectCity={handleSelectCity}
          onSelectTrip={handleSelectTrip}
          region={region}
          onPick={handlePickRegion}
        />
      </Suspense>

      {/* 悬浮 UI 层 */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
        {/* 顶栏：标题 | 统计 · 模式切换 */}
        <header className="flex items-center justify-between px-6 py-4">
          <h1 className="text-sm font-medium tracking-[0.3em] text-white/80">
            我的旅行足迹
          </h1>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <StatsPanel stats={stats} />
          </div>
        </header>

        {/* 主图区占位（阶段 4 填充） */}
        <div className="flex flex-1 items-start justify-end px-6 py-2">
          {data && <HeroPhoto data={data} selection={selection} onExpand={resetToOverview} />}
        </div>

        {/* 时间轴胶片条占位（阶段 4 填充） */}
        <footer className="px-6 pb-5">
          {data && (
            <Timeline
              data={data}
              nodes={timeline}
              selection={selection}
              onSelect={handleSelectTimelineNode}
            />
          )}
        </footer>
      </div>

      {/* 城市卡片：地球左侧，不遮挡主视区 */}
      {data && cardCityId && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center px-6">
          <CityCard
            data={data}
            cityId={cardCityId}
            selection={selection}
            onSelectTrip={(tripId) => setSelection({ kind: 'trip', tripId })}
            onClose={handleCloseCard}
          />
        </div>
      )}

      {/* 全局模式引导 */}
      {!region && !cardCityId && selection.kind === 'none' && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 animate-pulse rounded-full border border-white/10 bg-black/40 px-5 py-2 text-xs tracking-[0.2em] text-white/55 backdrop-blur-md">
          点击地球任意位置，查看这里是哪里
        </div>
      )}
    </div>
  )
}
