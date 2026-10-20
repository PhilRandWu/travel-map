import { useMemo } from 'react'

interface Star {
  top: string
  left: string
  size: number
  opacity: number
}

/**
 * 星空背景：确定性伪随机生成星点（纯 div，无外部资源）。
 * 叠在地球画布之下，地球背景透明即可透出。
 */
export default function Starfield() {
  const stars = useMemo<Star[]>(() => {
    let seed = 20261020
    // mulberry32 —— 确定性，避免重渲染星点闪烁
    const rand = () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    const layers = [
      { count: 220, size: 1, opacity: 0.85 },
      { count: 90, size: 2, opacity: 0.6 },
    ]
    return layers.flatMap(({ count, size, opacity }) =>
      Array.from({ length: count }, () => ({
        top: `${(rand() * 100).toFixed(2)}%`,
        left: `${(rand() * 100).toFixed(2)}%`,
        size: size + (rand() > 0.9 ? 1 : 0),
        opacity: opacity * (0.5 + rand() * 0.5),
      })),
    )
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#0b1026_0%,#05060f_60%,#020308_100%)]">
      {stars.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            boxShadow: star.size >= 2 ? '0 0 4px 1px rgba(255,255,255,0.5)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
