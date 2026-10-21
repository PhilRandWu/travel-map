import { usePresence } from '@/components/common/usePresence'

interface Props {
  ready: boolean
}

const EXIT_MS = 420

/** 地球大 chunk 与纹理加载期间的沉浸式过渡层。 */
export default function GlobeLoader({ ready }: Props) {
  const { mounted, closing } = usePresence(!ready, EXIT_MS)
  if (!mounted) return null

  return (
    <div
      data-globe-loader
      role="status"
      aria-live="polite"
      aria-label="正在展开旅行地图"
      className={`pointer-events-none absolute inset-0 z-[6] grid place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(17,30,64,.58),rgba(2,3,10,.94)_66%)] ${
        closing ? 'rg-loader-out' : ''
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="rg-loader-orb" aria-hidden="true">
          <span className="rg-loader-ring" />
          <span className="rg-loader-orbit" />
          <span className="rg-loader-core" />
        </div>
        <p className="mt-5 text-[10px] tracking-[0.28em] text-white/48">
          正在展开旅行地图
        </p>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          <span className="rg-loader-dot" />
          <span className="rg-loader-dot" />
          <span className="rg-loader-dot" />
        </div>
      </div>
    </div>
  )
}
