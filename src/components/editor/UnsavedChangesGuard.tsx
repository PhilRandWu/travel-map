import type { EditorExitIntent } from '@/hooks/useEditorExitGuard'

interface Props {
  intent: EditorExitIntent
  onContinue: () => void
  onDiscard: () => void
}

export default function UnsavedChangesGuard({
  intent,
  onContinue,
  onDiscard,
}: Props) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-description"
      className="border-t border-amber-100/18 bg-amber-100/[.055] px-5 py-3"
    >
      <p id="unsaved-title" className="text-sm font-medium text-amber-50/90">
        有未保存的修改
      </p>
      <p id="unsaved-description" className="mt-1 text-[11px] leading-relaxed text-white/52">
        {intent === 'close'
          ? '关闭编辑器会丢失当前表单内容。'
          : '返回列表会丢失当前表单内容。'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={onContinue}
          className="min-h-10 cursor-pointer rounded-full border border-white/12 px-4 text-xs text-white/70 transition hover:border-white/24 hover:text-white/90"
        >
          继续编辑
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-10 cursor-pointer rounded-full border border-red-200/24 bg-red-200/10 px-4 text-xs text-red-50/82 transition hover:bg-red-200/16"
        >
          放弃修改
        </button>
      </div>
    </div>
  )
}
