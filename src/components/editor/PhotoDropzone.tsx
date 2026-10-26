import { useRef, useState } from 'react'
import type { Photo } from '@/types'
import { registerLocalPhotoDraft } from '@/lib/localPhotoDrafts'
import { storeLocalPhoto } from '@/lib/localPhotoStore'
import { collectDroppedPhotos, collectSelectedPhotos } from '@/lib/photoFiles'
import PhotoFocusCard from '@/components/editor/PhotoFocusCard'

interface Props {
  visitId: string
  photos: Photo[]
  onChange: (photos: Photo[]) => void
  onBusyChange?: (busy: boolean) => void
}

function uniqueFileName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''
  let candidate = name
  let index = 2
  while (used.has(candidate)) {
    candidate = `${base}-${index}${extension}`
    index += 1
  }
  used.add(candidate)
  return candidate
}

export default function PhotoDropzone({
  visitId,
  photos,
  onChange,
  onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [storing, setStoring] = useState(false)
  const [storeError, setStoreError] = useState<string | null>(null)

  const addFiles = async (items: Array<{ file: File }>) => {
    if (items.length === 0 || storing) return
    setStoring(true)
    setStoreError(null)
    onBusyChange?.(true)
    const used = new Set(photos.map((photo) => photo.file))
    const additions = items.map(({ file }) => {
      const fileName = uniqueFileName(file.name, used)
      registerLocalPhotoDraft(visitId, fileName, file)
      return { file: fileName, source: file }
    })
    const results = await Promise.allSettled(additions.map(({ file, source }) => (
      storeLocalPhoto(visitId, file, source)
    )))
    const failures = results.filter((result) => (
      result.status === 'rejected' || result.value === false
    )).length
    if (failures > 0) {
      setStoreError(
        `${failures} 张照片无法写入浏览器照片库；刷新后这些照片会丢失。`,
      )
    }
    onChange([...photos, ...additions.map(({ file }) => ({ file }))])
    setStoring(false)
    onBusyChange?.(false)
  }

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    const items = await collectDroppedPhotos(event.dataTransfer)
    await addFiles(items)
  }

  const handleInput = (files: FileList | null) => {
    if (!files) return
    void addFiles(collectSelectedPhotos(files))
    if (inputRef.current) inputRef.current.value = ''
  }

  const updatePhoto = (index: number, patch: Partial<Photo>) => {
    onChange(photos.map((photo, photoIndex) => (
      photoIndex === index ? { ...photo, ...patch } : photo
    )))
  }

  return (
    <div className="space-y-2">
      <label
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(event) => void handleDrop(event)}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${
          dragging
            ? 'border-cyan-200/45 bg-cyan-200/[.07]'
            : 'border-white/14 bg-white/[.025] hover:border-white/26'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={storing}
          className="sr-only"
          aria-label="选择照片"
          onChange={(event) => handleInput(event.target.files)}
        />
        <span className="text-xs text-white/62">
          {dragging ? '松手加入照片' : '拖入照片，或点击选择'}
        </span>
        <span className="mt-1 text-[11px] leading-relaxed text-white/48">
          {storing
            ? '正在写入浏览器照片库…'
            : `支持多选与文件夹；照片会存进当前浏览器，并映射到 public/photos/${visitId}/`}
        </span>
      </label>

      {storeError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200/18 bg-amber-200/[.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/74"
        >
          {storeError}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, index) => (
            <PhotoFocusCard
              key={`${photo.file}-${index}`}
              visitId={visitId}
              photo={photo}
              index={index}
              onUpdate={(patch: Partial<Photo>) => updatePhoto(index, patch)}
              onRemove={() => onChange(
                photos.filter((_, itemIndex) => itemIndex !== index),
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
