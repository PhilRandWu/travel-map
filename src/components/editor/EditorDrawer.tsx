import type { ReactNode, RefObject } from 'react'
import type { EditorExitIntent } from '@/hooks/useEditorExitGuard'
import { formatSavedAt } from '@/lib/travelStorage'
import UnsavedChangesGuard from '@/components/editor/UnsavedChangesGuard'

interface Props {
  drawerRef: RefObject<HTMLElement | null>
  storageError: string | null
  lastSavedAt: string | null
  pendingExit: EditorExitIntent | null
  onClose: () => void
  onContinue: () => void
  onDiscard: () => void
  children: ReactNode
}

export default function EditorDrawer({
  drawerRef,
  storageError,
  lastSavedAt,
  pendingExit,
  onClose,
  onContinue,
  onDiscard,
  children,
}: Props) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        tabIndex={-1}
        aria-label="关闭编辑器遮罩"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-editor-title"
        data-editor-drawer
        className="rg-editor-drawer absolute right-0 top-0 flex h-full w-[min(460px,100vw)] flex-col border-l border-white/10 bg-[rgba(4,7,17,.96)] text-white shadow-[-30px_0_100px_rgba(0,0,0,.55)] backdrop-blur-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-100/55">
              TRAVEL ARCHIVE / EDITOR
            </p>
            <h2 id="travel-editor-title" className="mt-1 font-serif text-xl text-white/92">
              旅行档案编辑器
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭编辑器"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-white/12 text-lg text-white/58 transition hover:border-white/24 hover:text-white/88"
          >
            ×
          </button>
        </header>

        <div className="rg-scroll flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {pendingExit && (
          <UnsavedChangesGuard
            intent={pendingExit}
            onContinue={onContinue}
            onDiscard={onDiscard}
          />
        )}

        <footer className="border-t border-white/7 px-5 py-3 text-[11px] leading-relaxed text-white/58">
          <p>
            提交修改后自动保存到当前浏览器；照片本体保存在浏览器照片库。
          </p>
          <p className="mt-0.5 text-white/46">
            导出的 JSON 仅包含数据与照片引用，不包含照片文件。
            {storageError
              ? ' 当前自动保存失败。'
              : lastSavedAt
                ? ` 上次保存 ${formatSavedAt(lastSavedAt)}。`
                : ' 尚未保存到本机。'}
          </p>
        </footer>
      </aside>
    </div>
  )
}
