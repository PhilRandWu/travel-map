import type { MemoryPhoto } from '@/lib/memory'
import { photoVariantUrl } from '@/lib/photoUrls'

interface Props {
  photos: MemoryPhoto[]
  index: number
  onIndex: (index: number) => void
}

export default function MemoryFilmstrip({ photos, index, onIndex }: Props) {
  return (
    <div
      role="list"
      aria-label="照片胶片条"
      className="rg-scroll flex gap-2 overflow-x-auto px-5 pb-5 pt-2"
    >
      {photos.map((photo, photoIndex) => (
        <button
          key={photo.key}
          type="button"
          role="listitem"
          aria-label={`查看第 ${photoIndex + 1} 张照片`}
          aria-current={photoIndex === index ? 'true' : undefined}
          onClick={() => onIndex(photoIndex)}
          className={`rg-memory-thumb h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition ${
            photoIndex === index
              ? 'border-amber-100/75 opacity-100'
              : 'border-white/10 opacity-45 hover:opacity-75'
          }`}
        >
          <img
            src={photoVariantUrl(photo.visitId, photo.file, 'sm')}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}
