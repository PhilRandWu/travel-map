import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Starfield from '@/components/globe/Starfield'
import type { PickedRegion } from '@/components/globe/TravelGlobe'
import CityCard from '@/components/city/CityCard'
import { useTravelData } from '@/hooks/useTravelData'
import { preloadGeoData } from '@/lib/geoLookup'
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
  const { data, litCities } = useTravelData()
  const tracks = useMemo(() => (data ? buildTracks(data) : EMPTY_TRACKS), [data])
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const [cardCityId, setCardCityId] = useState<string | null>(null)
  const [region, setRegion] = useState<PickedRegion | null>(null)

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
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              统计
            </span>
          </div>
        </header>

        {/* 主图区占位（阶段 4 填充） */}
        <div className="flex flex-1 items-start justify-end px-6 py-2">
          <div className="pointer-events-none h-36 w-64 rounded-2xl border border-dashed border-white/15 bg-white/3 backdrop-blur-md">
            <span className="sr-only">主图区</span>
          </div>
        </div>

        {/* 时间轴胶片条占位（阶段 4 填充） */}
        <footer className="px-6 pb-5">
          <div className="mx-auto h-20 max-w-4xl rounded-2xl border border-dashed border-white/15 bg-white/3 backdrop-blur-md">
            <span className="sr-only">时间轴</span>
          </div>
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

      {/* 首次引导 */}
      {!region && !cardCityId && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 animate-pulse rounded-full border border-white/10 bg-black/40 px-5 py-2 text-xs tracking-[0.2em] text-white/55 backdrop-blur-md">
          点击地球任意位置，查看这里是哪里
        </div>
      )}
    </div>
  )
}
