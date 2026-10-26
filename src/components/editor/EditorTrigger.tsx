export default function EditorTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      data-editor-trigger
      aria-label="编辑旅行数据"
      onClick={onOpen}
      className="pointer-events-auto flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-white/[.045] px-3 text-[11px] tracking-[0.08em] text-white/62 backdrop-blur-md transition hover:border-white/24 hover:text-white/88"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
        <path
          d="M13.9 3.1a1.7 1.7 0 0 1 2.4 2.4l-8.4 8.4-3.4 1 1-3.4 8.4-8.4Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">编辑</span>
    </button>
  )
}
