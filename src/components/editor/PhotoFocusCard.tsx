import { useState, type CSSProperties } from 'react'
import type { Photo } from '@/types'
import { photoObjectPosition, photoVariantUrl } from '@/lib/photoUrls'
import { editorInputClass } from '@/components/editor/EditorField'

interface Props {
  visitId: string
  photo: Photo
  index: number
  onUpdate: (patch: Partial<Photo>) => void
  onRemove: () => void
}

export default function PhotoFocusCard({
  visitId,
  photo,
  index,
  onUpdate,
  onRemove,
}: Props) {
  const [focusOpen, setFocusOpen] = useState(false)
  const focalPoint = photo.focalPoint ?? { x: 0.5, y: 0.5 }
  const featured = photo.featured === true

  return (
    <div className="overflow-hidden rounded-xl border border-white/9 bg-white/[.025]">
      <div className="relative aspect-[4/3] bg-white/[.04]">
        <img
          src={photoVariantUrl(visitId, photo.file, 'sm')}
          alt={photo.caption || photo.file}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: photoObjectPosition(focalPoint) }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,.5),0_0_14px_rgba(255,255,255,.2)]"
          style={{
            left: `${focalPoint.x * 100}%`,
            top: `${focalPoint.y * 100}%`,
          }}
        />
        <button
          type="button"
          aria-label={featured ? '取消精选' : '将照片设为精选'}
          aria-pressed={featured}
          onClick={() => onUpdate({ featured: !featured })}
          className={`absolute left-1.5 top-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full border text-sm backdrop-blur transition ${
            featured
              ? 'border-amber-100/45 bg-amber-100/85 text-[#171208]'
              : 'border-white/20 bg-black/60 text-white/55 hover:text-amber-100'
          }`}
        >
          ★
        </button>
        <button
          type="button"
          aria-label={`移除照片 ${photo.file}`}
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/65 text-sm text-white/78 backdrop-blur transition hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-1.5 p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-[10px] text-white/46" title={photo.file}>
            {photo.file}
          </p>
          {featured && (
            <span className="shrink-0 text-[9px] tracking-[0.12em] text-amber-100/62">
              精选
            </span>
          )}
        </div>
        <input
          aria-label={`照片 ${index + 1} 标注`}
          value={photo.caption ?? ''}
          placeholder="一句话标注"
          maxLength={80}
          onChange={(event) => onUpdate({
            caption: event.target.value || undefined,
          })}
          className={`${editorInputClass} px-2.5 py-2 text-[11px]`}
        />
        <button
          type="button"
          aria-expanded={focusOpen}
          aria-label={`调整照片 ${index + 1} 焦点`}
          onClick={() => setFocusOpen((open) => !open)}
          className="w-full cursor-pointer rounded-lg border border-white/8 px-2.5 py-1.5 text-[10px] text-white/48 transition hover:border-white/18 hover:text-white/72"
        >
          {focusOpen ? '收起视觉焦点' : '调整视觉焦点'}
        </button>

        {focusOpen && (
          <div className="space-y-2 rounded-lg border border-cyan-100/10 bg-cyan-100/[.035] p-2.5">
            <FocusSlider
              label={`照片 ${index + 1} 水平焦点`}
              value={focalPoint.x}
              onChange={(x) => onUpdate({ focalPoint: { ...focalPoint, x } })}
            />
            <FocusSlider
              label={`照片 ${index + 1} 垂直焦点`}
              value={focalPoint.y}
              onChange={(y) => onUpdate({ focalPoint: { ...focalPoint, y } })}
            />
            <button
              type="button"
              onClick={() => onUpdate({ focalPoint: { x: 0.5, y: 0.5 } })}
              className="cursor-pointer text-[10px] text-cyan-100/55 transition hover:text-cyan-100/85"
            >
              重置为画面中心
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FocusSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-[10px] text-white/45">
      <span className="mb-1 flex items-center justify-between">
        <span>{label.includes('水平') ? '水平' : '垂直'}</span>
        <span className="font-mono tabular-nums">{Math.round(value * 100)}%</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min="0"
        max="100"
        step="1"
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="h-1.5 w-full cursor-pointer accent-cyan-200"
        style={{ '--rg-focus-value': `${value * 100}%` } as CSSProperties}
      />
    </label>
  )
}
