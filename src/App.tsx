import { useEffect, useState } from 'react'
import Starfield from '@/components/globe/Starfield'
import TravelGlobe, { type PickedRegion } from '@/components/globe/TravelGlobe'
import { preloadGeoData } from '@/lib/geoLookup'

/**
 * 布局骨架（T0.3）：
 * - 全屏星空 + 3D 地球为底
 * - 悬浮 UI 层（顶栏 / 主图区 / 城市卡片 / 时间轴）后续阶段填充
 * 悬浮层使用 pointer-events-none，交互子元素自行 pointer-events-auto。
 */
export default function App() {
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans text-white select-none">
      <Starfield />
      <TravelGlobe region={region} onPick={setRegion} />

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

      {/* 首次引导 */}
      {!region && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 animate-pulse rounded-full border border-white/10 bg-black/40 px-5 py-2 text-xs tracking-[0.2em] text-white/55 backdrop-blur-md">
          点击地球任意位置，查看这里是哪里
        </div>
      )}
    </div>
  )
}
