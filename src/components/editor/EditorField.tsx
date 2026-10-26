import { useEffect, useRef, type ReactNode } from 'react'
import type { ValidationIssue } from '@/lib/validate'

export const editorInputClass =
  'w-full rounded-xl border border-white/12 bg-white/[.045] px-3 py-2.5 text-sm text-white/88 outline-none transition placeholder:text-white/24 focus:border-cyan-200/35 focus:bg-white/[.07] focus:ring-2 focus:ring-cyan-200/8'

export function EditorField({
  id,
  label,
  hint,
  children,
}: {
  id?: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-3 text-[11px] tracking-[0.12em] text-white/62"
      >
        <span>{label}</span>
        {hint && (
          <span className="text-right text-[10px] normal-case tracking-normal text-white/46">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

export function EditorErrors({ issues }: { issues: ValidationIssue[] }) {
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (issues.length > 0) alertRef.current?.focus()
  }, [issues])

  if (issues.length === 0) return null

  return (
    <div
      ref={alertRef}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-300/24 bg-red-300/[.07] px-3 py-2.5 text-xs leading-relaxed text-red-100/82 outline-none"
    >
      <p className="mb-1 font-mono text-[10px] tracking-[0.16em] text-red-100/62">
        SAVE BLOCKED
      </p>
      {issues.map((issue) => (
        <p key={`${issue.subject}-${issue.message}`}>
          <span className="text-red-200/65">[{issue.subject}]</span> {issue.message}
        </p>
      ))}
    </div>
  )
}

export function EditorFormActions({
  saveLabel,
  disabled,
  onCancel,
}: {
  saveLabel: string
  disabled: boolean
  onCancel: () => void
}) {
  return (
    <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-2 border-t border-white/8 bg-[rgba(5,8,18,.92)] px-5 py-3 backdrop-blur-xl">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-10 cursor-pointer rounded-full border border-white/12 px-4 text-xs text-white/62 transition hover:border-white/24 hover:text-white/88"
      >
        取消
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="min-h-10 cursor-pointer rounded-full border border-amber-100/25 bg-amber-100/12 px-5 text-xs tracking-[0.08em] text-amber-50 transition hover:bg-amber-100/18 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {saveLabel}
      </button>
    </div>
  )
}
