import { lazy, Suspense } from 'react'
import type { TravelData } from '@/types'
import ErrorBoundary from '@/components/common/ErrorBoundary'

const TravelEditor = lazy(() => import('@/components/editor/TravelEditor'))

interface Props {
  data: TravelData
  storageError: string | null
  lastSavedAt?: string | null
  initialJourneyId?: string
  onChange: (data: TravelData) => void
  onClose: () => void
}

function EditorLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 backdrop-blur-sm"
    >
      <div className="rounded-2xl border border-white/10 bg-[rgba(4,7,17,.94)] px-5 py-4 text-center">
        <span className="mx-auto block h-5 w-5 animate-spin rounded-full border border-white/15 border-t-cyan-100/70" />
        <p className="mt-3 text-[10px] tracking-[0.16em] text-white/46">
          正在打开编辑器…
        </p>
      </div>
    </div>
  )
}

function EditorFailure({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 backdrop-blur-sm"
    >
      <div className="max-w-sm rounded-2xl border border-red-200/15 bg-[rgba(12,8,12,.96)] px-6 py-5 text-center">
        <p className="font-mono text-[9px] tracking-[0.22em] text-red-100/45">
          EDITOR UNAVAILABLE
        </p>
        <h2 className="mt-2 font-serif text-xl text-white/88">编辑器加载失败</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/42">
          当前旅行数据不会受影响，请重新加载页面再试。
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs text-white/52"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full border border-red-100/20 bg-red-100/8 px-4 py-2 text-xs text-red-50/78"
          >
            重新加载
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkspaceEditor(props: Props) {
  return (
    <ErrorBoundary fallback={<EditorFailure onClose={props.onClose} />}>
      <Suspense fallback={<EditorLoading />}>
        <TravelEditor {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
