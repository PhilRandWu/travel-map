import type { CSSProperties, MouseEventHandler, PointerEventHandler } from 'react'
import type { MemoryPhoto as MemoryPhotoModel } from '@/lib/memory'
import { photoObjectPosition, photoOriginalUrl, photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  photo: MemoryPhotoModel
  index: number
  total: number
  direction: 'next' | 'previous' | 'none'
  scale?: number
  origin?: string
  onDoubleClick?: MouseEventHandler<HTMLElement>
  onPointerDown?: PointerEventHandler<HTMLElement>
  onPointerUp?: PointerEventHandler<HTMLElement>
}

export default function MemoryPhoto({
  photo,
  index,
  total,
  direction,
  scale = 1,
  origin = '50% 50%',
  onDoubleClick,
  onPointerDown,
  onPointerUp,
}: Props) {
  const source = scale > 1
    ? photoOriginalUrl(photo.visitId, photo.file)
    : photoVariantUrl(photo.visitId, photo.file, 'preview')

  return (
    <figure
      data-photo-direction={direction}
      className="rg-memory-photo relative flex min-h-0 flex-1 items-center justify-center"
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        aria-hidden
        className="rg-memory-photo-aura absolute inset-[9%]"
        style={{
          backgroundImage: `url(${photoVariantUrl(photo.visitId, photo.file, 'blur')})`,
          backgroundPosition: photoObjectPosition(photo.focalPoint),
        } as CSSProperties}
      >
        <span />
      </div>

      <div className="rg-memory-photo-frame">
        <div aria-hidden className="rg-memory-photo-registration">
          <span>FRAME {String(index + 1).padStart(2, '0')}</span>
          <span>{photo.featured ? 'SELECTED MEMORY' : 'TRAVEL RECORD'}</span>
          <span>{String(total).padStart(2, '0')} TOTAL</span>
        </div>

        <div className="rg-memory-photo-window">
          <img
            key={photo.key}
            src={source}
            alt={photo.caption ?? `${photo.cityName}旅行照片`}
            draggable={false}
            style={{
              objectPosition: photoObjectPosition(photo.focalPoint),
              transform: `scale(${scale})`,
              transformOrigin: origin,
            }}
            className="rg-memory-photo-image"
          />
          <span aria-hidden className="rg-memory-photo-scan" />
          <span aria-hidden className="rg-memory-photo-crop rg-memory-photo-crop-tl" />
          <span aria-hidden className="rg-memory-photo-crop rg-memory-photo-crop-tr" />
          <span aria-hidden className="rg-memory-photo-crop rg-memory-photo-crop-bl" />
          <span aria-hidden className="rg-memory-photo-crop rg-memory-photo-crop-br" />
        </div>

        <div aria-hidden className="rg-memory-photo-footer">
          <span>{photo.cityName}</span>
          <i />
          <span>{photo.file}</span>
        </div>
      </div>

      <span aria-hidden className="rg-memory-photo-number">
        {String(index + 1).padStart(2, '0')}
      </span>
    </figure>
  )
}
