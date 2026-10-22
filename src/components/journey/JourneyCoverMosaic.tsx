import type { CSSProperties } from 'react'
import type { JourneyCoverPhoto, JourneyTheme } from '@/types'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  covers: JourneyCoverPhoto[]
  title: string
  theme: JourneyTheme
  large?: boolean
}

export default function JourneyCoverMosaic({
  covers,
  title,
  theme,
  large = false,
}: Props) {
  const visible = covers.slice(0, 5)

  if (visible.length === 0) {
    return (
      <div
        data-journey-theme={theme}
        className="relative flex h-full min-h-24 items-end overflow-hidden rounded-xl bg-[radial-gradient(circle_at_70%_20%,var(--rg-journey-glow),transparent_52%),linear-gradient(135deg,#0b1730,#060b16)] p-3"
      >
        <svg
          aria-hidden
          viewBox="0 0 220 90"
          className="absolute inset-0 h-full w-full opacity-65"
        >
          <path
            d="M-10 68 C36 16, 82 76, 122 34 S182 20, 230 44"
            fill="none"
            stroke="rgba(245,234,216,.34)"
            strokeWidth="1"
          />
          <circle cx="28" cy="47" r="3" fill="rgba(251,191,36,.9)" />
          <circle cx="122" cy="34" r="3" fill="rgba(103,232,249,.9)" />
          <circle cx="204" cy="38" r="2" fill="rgba(245,234,216,.62)" />
        </svg>
        <span className="relative font-serif text-lg text-white/85">{title}</span>
      </div>
    )
  }

  return (
    <div
      data-journey-theme={theme}
      className={`grid h-full gap-1 overflow-hidden rounded-xl ${
        large ? 'grid-cols-4 grid-rows-2' : 'grid-cols-3 grid-rows-2'
      }`}
    >
      {visible.map((cover, index) => (
        <span
          key={`${cover.visitId}:${cover.file}`}
          className={`group relative overflow-hidden rounded-lg ${
            index === 0 ? 'col-span-2 row-span-2' : ''
          }`}
        >
          <img
            src={photoVariantUrl(cover.visitId, cover.file, 'md')}
            alt=""
            loading="lazy"
            className="rg-stagger-item h-full w-full object-cover transition duration-700 group-hover:scale-105"
            style={{ '--rg-index': index } as CSSProperties}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        </span>
      ))}
    </div>
  )
}
