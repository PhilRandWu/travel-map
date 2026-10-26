import { useState } from 'react'

interface Props {
  issueCount?: number
  onReload: () => void
  onRestoreBundled: () => void
  onClearArchive: () => void
}

type PendingAction = 'restore' | 'clear' | null

export default function ArchiveRecovery({
  issueCount = 0,
  onReload,
  onRestoreBundled,
  onClearArchive,
}: Props) {
  const [pending, setPending] = useState<PendingAction>(null)
  const isRestore = pending === 'restore'
  const confirm = isRestore ? onRestoreBundled : onClearArchive

  return (
    <main className="grid min-h-[100svh] place-items-center bg-[radial-gradient(circle_at_50%_30%,#111a30_0%,#02030a_58%)] px-6 font-sans text-white">
      <section className="w-full max-w-lg rounded-2xl border border-red-200/15 bg-red-200/[.035] px-6 py-5 text-center shadow-[0_20px_80px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <p className="font-mono text-[10px] tracking-[0.24em] text-red-100/45">
          ARCHIVE INTERRUPTED
        </p>
        <h1 className="mt-2 font-serif text-xl text-red-50/85">旅行档案暂时无法打开</h1>
        <p className="mt-2 text-sm leading-relaxed text-red-100/65">
          数据校验失败{issueCount > 0 ? `（${issueCount} 个错误）` : ''}。
          可以先重新加载；如果问题仍在，再明确选择恢复或清理。
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/38">
          恢复与清理会覆盖当前浏览器的旅行数据。照片库不会被自动删除。
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onReload}
            className="min-h-10 cursor-pointer rounded-full border border-white/12 bg-white/[.04] px-4 text-xs text-white/68 transition hover:border-white/24 hover:text-white"
          >
            重新加载
          </button>
          <button
            type="button"
            onClick={() => setPending('restore')}
            className="min-h-10 cursor-pointer rounded-full border border-cyan-200/22 bg-cyan-200/[.06] px-4 text-xs text-cyan-50/80 transition hover:border-cyan-200/38"
          >
            恢复内置示例
          </button>
          <button
            type="button"
            onClick={() => setPending('clear')}
            className="min-h-10 cursor-pointer rounded-full border border-red-200/18 px-4 text-xs text-red-100/62 transition hover:border-red-200/34"
          >
            清理本地存档
          </button>
        </div>

        {pending && (
          <div
            role="alertdialog"
            aria-label={isRestore ? '恢复内置示例？' : '清理本地存档？'}
            className="mt-4 rounded-xl border border-amber-100/16 bg-amber-100/[.045] px-4 py-3 text-left"
          >
            <p className="text-xs font-medium text-amber-50/85">
              {isRestore
                ? '恢复内置示例会覆盖当前浏览器中的旅行数据。'
                : '清理后将以内置示例重新开始，当前本地存档会被移除。'}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="min-h-9 cursor-pointer rounded-full px-3 text-[11px] text-white/50 transition hover:text-white/80"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirm}
                className="min-h-9 cursor-pointer rounded-full border border-amber-100/24 bg-amber-100/10 px-4 text-[11px] text-amber-50/85 transition hover:bg-amber-100/16"
              >
                {isRestore ? '确认恢复' : '确认清理'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
