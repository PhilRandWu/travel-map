interface Props {
  journeyTitle?: string
  onOpenCommand: () => void
  onReplay?: () => void
  onExit: () => void
}

export default function FocusModeBar({
  journeyTitle,
  onOpenCommand,
  onReplay,
  onExit,
}: Props) {
  return (
    <div className="rg-focus-bar pointer-events-auto absolute bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-white/12 bg-[rgba(4,7,16,.78)] p-1.5 pl-4 shadow-[0_16px_60px_rgba(0,0,0,.52)] backdrop-blur-xl">
      <span className="max-w-36 truncate text-[10px] tracking-[0.12em] text-white/42">
        {journeyTitle ?? '旅行档案'} · 专注
      </span>
      <button
        type="button"
        onClick={onOpenCommand}
        className="min-h-8 rounded-full px-3 text-[10px] text-cyan-100/62 transition hover:bg-cyan-100/8 hover:text-cyan-50"
      >
        回忆索引
      </button>
      {onReplay && (
        <button
          type="button"
          onClick={onReplay}
          className="min-h-8 rounded-full border border-amber-100/16 bg-amber-100/[.045] px-3 text-[10px] text-amber-50/72 transition hover:border-amber-100/32"
        >
          回放
        </button>
      )}
      <button
        type="button"
        onClick={onExit}
        className="min-h-8 rounded-full bg-white/8 px-3 text-[10px] text-white/62 transition hover:bg-white/14 hover:text-white"
      >
        退出 F
      </button>
    </div>
  )
}
