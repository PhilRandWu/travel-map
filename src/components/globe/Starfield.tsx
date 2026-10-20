import { useMemo, type CSSProperties } from 'react'

interface Star {
  top: string
  left: string
  size: number
  opacity: number
  /** 基础色相：多数冷白，少量暖黄 / 冰蓝，增加真实感 */
  color: string
  /** 闪烁时长（s），0 表示不闪烁 */
  twinkle: number
  /** 闪烁延迟（s） */
  delay: number
  glow: boolean
}

/**
 * 星空背景：确定性伪随机生成星点（纯 DOM，无外部资源）。
 * 三层结构：细碎远星 + 中层星 + 少量带光晕的亮星，冷暖混色、缓慢闪烁。
 * 叠在地球画布之下，地球背景透明即可透出。
 */
export default function Starfield() {
  const { stars, nebulae } = useMemo(() => {
    let seed = 20261020
    // mulberry32 —— 确定性，避免重渲染星点闪烁
    const rand = () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    const palette = ['#ffffff', '#ffffff', '#ffffff', '#cdd9ff', '#a9c4ff', '#ffe6c2']
    const pickColor = () => palette[Math.floor(rand() * palette.length)]

    // 远星：多、小、暗；中层：中等；近景亮星：少、大、带光晕，部分会闪烁
    const layers = [
      { count: 260, size: 1, opacity: 0.7, glow: false },
      { count: 110, size: 1.6, opacity: 0.85, glow: false },
      { count: 26, size: 2.4, opacity: 1, glow: true },
    ]
    const stars: Star[] = layers.flatMap(({ count, size, opacity, glow }) =>
      Array.from({ length: count }, () => {
        const r = rand()
        return {
          top: `${(rand() * 100).toFixed(2)}%`,
          left: `${(rand() * 100).toFixed(2)}%`,
          size: size + (r > 0.88 ? 0.8 : 0),
          opacity: opacity * (0.45 + rand() * 0.55),
          color: pickColor(),
          glow,
          // 只有亮星和少量中层星闪烁，节奏错开避免"一起眨"
          twinkle: glow || r > 0.92 ? 2.6 + rand() * 3.4 : 0,
          delay: rand() * 5,
        }
      }),
    )

    // 两团极淡的星云冷光，给纯黑背景一点纵深（位置确定性固定）
    const nebulae = [
      { top: '12%', left: '68%', size: 560, color: 'rgba(86,120,220,0.10)' },
      { top: '58%', left: '8%', size: 640, color: 'rgba(120,90,200,0.07)' },
    ]

    return { stars, nebulae }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#0c1330_0%,#070b1c_55%,#02030a_100%)]">
      {nebulae.map((n, i) => (
        <span
          key={`nebula-${i}`}
          className="absolute rounded-full"
          style={{
            top: n.top,
            left: n.left,
            width: n.size,
            height: n.size,
            transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, ${n.color} 0%, transparent 68%)`,
          }}
        />
      ))}
      {stars.map((star, i) => {
        const style: CSSProperties = {
          top: star.top,
          left: star.left,
          width: star.size,
          height: star.size,
          opacity: star.opacity,
          backgroundColor: star.color,
          boxShadow: star.glow
            ? `0 0 ${star.size * 3}px ${star.size * 0.7}px rgba(190,205,255,0.35)`
            : undefined,
        }
        if (star.twinkle) {
          style.animationDuration = `${star.twinkle}s`
          style.animationDelay = `${star.delay}s`
          // 闪烁动画需要各星自己的基础亮度
          ;(style as Record<string, string | number>)['--rg-star-o'] = star.opacity
        }
        return (
          <span
            key={i}
            className={star.twinkle ? 'rg-twinkle absolute rounded-full' : 'absolute rounded-full'}
            style={style}
          />
        )
      })}
    </div>
  )
}
