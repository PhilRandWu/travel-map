import type { PickedRegion } from '@/components/globe/pickedRegion'

interface Props {
  region: PickedRegion | null
  locating: boolean
  onCloseRegion: () => void
}

export default function GlobeFeedback({
  region,
  locating,
  onCloseRegion,
}: Props) {
  return (
    <>
      {/* 名称 HUD：屏幕固定顶部居中，永远不遮挡地球上的选中区域 */}
      {region && (
        <div
          key={`${region.lat.toFixed(2)},${region.lng.toFixed(2)}`}
          role="status"
          aria-live="polite"
          className="rg-hud pointer-events-auto absolute left-1/2 top-20 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/14 bg-[rgba(8,11,22,.72)] px-5 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,.45)] backdrop-blur-md">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${region.ocean ? 'bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,.7)]' : 'bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,.7)]'}`}
            />
            <span className="text-base font-semibold tracking-[0.05em] text-white">
              {region.name}
            </span>
            {region.detail && (
              <span className="text-xs text-white/55">{region.detail}</span>
            )}
            <button
              type="button"
              aria-label="取消选中"
              onClick={onCloseRegion}
              className="ml-1 h-5 w-5 cursor-pointer rounded-full border-none bg-white/12 text-xs leading-5 text-white/70 transition hover:bg-white/25 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 反查进行中的即时反馈（数据已预取，通常只是一瞬） */}
      {locating && (
        <div className="rg-locating pointer-events-none" role="status" aria-live="polite">
          定位中…
        </div>
      )}
    </>
  )
}
