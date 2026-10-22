import type { CSSProperties, MouseEventHandler, PointerEventHandler } from 'react'
import type { MemoryPhoto as MemoryPhotoModel } from '@/lib/memory'
import { photoObjectPosition, photoOriginalUrl, photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  photo: MemoryPhotoModel
  direction: 'next' | 'previous' | 'none'
  scale?: number
  origin?: string
  onDoubleClick?: MouseEventHandler<HTMLElement>
  onPointerDown?: PointerEventHandler<HTMLElement>
  onPointerUp?: PointerEventHandler<HTMLElement>
}

export default function MemoryPhoto({
  photo,
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
      className="rg-memory-photo relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        aria-hidden
        className="absolute inset-4 rounded-[2rem] opacity-40 blur-2xl"
        style={{
          backgroundImage: `url(${photoVariantUrl(photo.visitId, photo.file, 'blur')})`,
          backgroundPosition: photoObjectPosition(photo.focalPoint),
          backgroundSize: 'cover',
          opacity: scale > 1 ? 0.16 : 0.4,
          transition: 'opacity 180ms ease-out',
        } as CSSProperties}
      />
      <img
        key={photo.key}
        src={source}
        alt={photo.caption ?? `${photo.cityName}旅行照片`}
        draggable={false}
        style={{
          objectPosition: photoObjectPosition(photo.focalPoint),
          transform: `scale(${scale})`,
          transformOrigin: origin,
          transition: 'transform 240ms ease-out',
        }}
        className="rg-memory-photo-image relative max-h-[66vh] max-w-[min(88vw,1180px)] rounded-xl object-contain shadow-[0_28px_100px_rgba(0,0,0,.7)]"
      />
      <figcaption
        className="absolute inset-x-0 bottom-2 text-center text-sm tracking-wide text-[#f5ead8]/85"
        style={{ opacity: scale > 1 ? 0.18 : 1 }}
      >
        {photo.caption}
      </figcaption>
    </figure>
  )
}
