import { lazy, Suspense, useState } from 'react'
import type { TravelData } from '@/types'

const PhotoGroupingDialog = lazy(
  () => import('@/components/photos/PhotoGroupingDialog'),
)

interface Props {
  data: TravelData
}

export default function PhotoGrouping({ data }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="照片自动归组"
        className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-[10px] text-white/48 transition hover:border-cyan-200/25 hover:bg-cyan-200/7 hover:text-cyan-100/75"
      >
        <CameraIcon />
        照片归组
      </button>
      {open && (
        <Suspense fallback={null}>
          <PhotoGroupingDialog data={data} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
      <path
        d="M6.4 5.2 7.5 3.5h5l1.1 1.7h2A1.4 1.4 0 0 1 17 6.6v8A1.4 1.4 0 0 1 15.6 16H4.4A1.4 1.4 0 0 1 3 14.6v-8a1.4 1.4 0 0 1 1.4-1.4h2Zm3.6 2.3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
        fill="currentColor"
      />
    </svg>
  )
}
