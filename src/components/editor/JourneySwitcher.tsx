import { useEffect, useMemo, useRef, useState } from 'react'
import type { Journey } from '@/types'
import { groupJourneysByYear } from '@/lib/journeys'
import {
  loadJourneyPreferences,
  rememberJourney,
  saveJourneyPreferences,
  toggleJourneyPinned,
} from '@/lib/journeyPreferences'
import JourneySwitchRow from '@/components/editor/JourneySwitchRow'

interface Props {
  journeys: Journey[]
  journeyId: string
  disabled: boolean
  onChange: (journeyId: string) => void
}

export default function JourneySwitcher({
  journeys,
  journeyId,
  disabled,
  onChange,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [preferences, setPreferences] = useState(loadJourneyPreferences)
  const current = journeys.find((journey) => journey.id === journeyId)

  useEffect(() => {
    if (!journeyId) return
    setPreferences((value) => rememberJourney(value, journeyId))
  }, [journeyId])

  useEffect(() => {
    saveJourneyPreferences(preferences)
  }, [preferences])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!disabled) return
    setOpen(false)
    setQuery('')
  }, [disabled])

  const byId = useMemo(
    () => new Map(journeys.map((journey) => [journey.id, journey])),
    [journeys],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = (journey: Journey) => (
    normalizedQuery === ''
    || journey.title.toLocaleLowerCase().includes(normalizedQuery)
  )
  const pinned = preferences.pinnedIds.flatMap((id) => {
    const journey = byId.get(id)
    return journey && matches(journey) ? [journey] : []
  })
  const quickIds = new Set([
    ...preferences.pinnedIds,
    ...preferences.recentIds,
  ])
  const recent = preferences.recentIds.flatMap((id) => {
    if (preferences.pinnedIds.includes(id)) return []
    const journey = byId.get(id)
    return journey && matches(journey) ? [journey] : []
  })
  const remaining = journeys.filter((journey) => (
    !quickIds.has(journey.id) && matches(journey)
  ))
  const groups = groupJourneysByYear(remaining)
  const noMatches = pinned.length + recent.length + remaining.length === 0

  const closePanel = () => {
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }

  const select = (nextId: string) => {
    onChange(nextId)
    closePanel()
  }

  const togglePin = (id: string) => {
    setPreferences((value) => toggleJourneyPinned(value, id))
  }

  const toggleOpen = () => {
    setQuery('')
    setOpen((value) => !value)
  }

  return (
    <div
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        closePanel()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={open ? '收起旅程选择' : `当前旅程：${current?.title ?? '暂无旅程'}`}
        aria-expanded={open}
        onClick={toggleOpen}
        className="mt-1.5 flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[.035] px-3.5 text-left transition hover:border-white/22 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm text-white/82">
            {open ? '选择一段旅程' : current?.title ?? '暂无旅程'}
          </span>
          {!open && current && (
            <span className="mt-0.5 block font-mono text-[9px] text-white/34">
              {current.startDate.replaceAll('-', '.')} - {current.endDate.replaceAll('-', '.')}
            </span>
          )}
        </span>
        <span aria-hidden className="text-white/34">{open ? '↑' : '⌄'}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-[#070b16] p-2.5 shadow-[0_18px_50px_rgba(0,0,0,.32)]">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3">
            <span aria-hidden className="text-sm text-cyan-100/45">⌕</span>
            <input
              ref={searchRef}
              type="search"
              aria-label="搜索旅程"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按旅程标题搜索…"
              className="min-h-10 min-w-0 flex-1 bg-transparent text-xs text-white/82 outline-none placeholder:text-white/28"
            />
          </label>

          <div className="rg-scroll mt-2 max-h-[42vh] space-y-3 overflow-y-auto overscroll-contain pr-0.5">
            {pinned.length > 0 && (
              <section>
                <h3 className="mb-1.5 px-1 text-[9px] tracking-[0.16em] text-amber-100/52">
                  置顶旅程
                </h3>
                <div className="space-y-1.5">
                  {pinned.map((journey) => (
                    <JourneySwitchRow
                      key={journey.id}
                      journey={journey}
                      current={journey.id === journeyId}
                      pinned
                      onSelect={() => select(journey.id)}
                      onTogglePin={() => togglePin(journey.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {recent.length > 0 && (
              <section>
                <h3 className="mb-1.5 px-1 text-[9px] tracking-[0.16em] text-cyan-100/45">
                  最近使用
                </h3>
                <div className="space-y-1.5">
                  {recent.map((journey) => (
                    <JourneySwitchRow
                      key={journey.id}
                      journey={journey}
                      current={journey.id === journeyId}
                      pinned={false}
                      onSelect={() => select(journey.id)}
                      onTogglePin={() => togglePin(journey.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {groups.map(({ year, journeys: yearJourneys }) => (
              <section key={year}>
                <h3 className="mb-1.5 flex items-center gap-2 px-1 font-mono text-[9px] tracking-[0.16em] text-white/35">
                  {year}
                  <span className="h-px flex-1 bg-white/6" />
                </h3>
                <div className="space-y-1.5">
                  {yearJourneys.map((journey) => (
                    <JourneySwitchRow
                      key={journey.id}
                      journey={journey}
                      current={journey.id === journeyId}
                      pinned={false}
                      onSelect={() => select(journey.id)}
                      onTogglePin={() => togglePin(journey.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {noMatches && (
              <p className="px-2 py-7 text-center text-xs text-white/38">
                没有匹配的旅程
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
