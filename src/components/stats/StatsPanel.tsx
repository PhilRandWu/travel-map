import { useState } from 'react'
import type { TravelStats } from '@/lib/derive'

interface Props {
  stats: TravelStats | null
}

export default function StatsPanel({ stats }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="pointer-events-auto cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-[0.12em] text-white/55 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10 hover:text-white"
      >
        统计
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="关闭统计"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-transparent"
          />
          <div className="rg-stats-in absolute right-0 top-10 z-40 w-60 rounded-xl border border-white/12 bg-[rgba(5,8,17,.86)] p-4 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-2">
              <Metric value={stats ? `${stats.cityCount}` : '—'} label="城市" />
              <Metric
                value={stats ? `${stats.provinceCount}/${stats.countryCount}` : '—'}
                label="省 · 国"
              />
              <Metric value={stats ? `${stats.flightCount}` : '—'} label="飞行段" />
              <Metric value={stats ? `${stats.trainCount}` : '—'} label="高铁段" />
            </div>
            <div className="mt-3 border-t border-white/8 pt-3">
              <Metric
                value={stats ? `${stats.totalDistanceKm.toLocaleString()} km` : '—'}
                label="累计里程"
                accent
              />
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-white/42">
                <span>{stats?.firstDate ? stats.firstDate.replaceAll('-', '.') : '—'}</span>
                <span aria-hidden className="text-white/22">
                  →
                </span>
                <span>{stats?.lastDate ? stats.lastDate.replaceAll('-', '.') : '—'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Metric({
  value,
  label,
  accent,
}: {
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <div>
      <div
        className={`text-sm font-semibold tabular-nums ${accent ? 'text-amber-200' : 'text-white/88'}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[9px] tracking-[0.14em] text-white/34">{label}</div>
    </div>
  )
}
