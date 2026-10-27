import { useEffect, useMemo, useRef, useState } from 'react'
import type { TravelData } from '@/types'
import {
  searchTravelData,
  type TravelSearchKind,
  type TravelSearchResult,
} from '@/lib/travelSearch'
import type {
  MemoryDiscovery,
  RandomMemoryTarget,
} from '@/lib/travelDiscovery'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import MemoryDiscoveryStrip from '@/components/search/MemoryDiscoveryStrip'

interface Props {
  data: TravelData
  discoveries: MemoryDiscovery[]
  onOpenResult: (result: TravelSearchResult) => void
  onOpenMemory: (target: RandomMemoryTarget) => void
  onRandomMemory: () => void
  onClose: () => void
}

const KIND_LABELS: Record<TravelSearchKind, string> = {
  journey: '旅程',
  visit: '地点',
  trip: '交通',
  photo: '照片',
}

export default function TravelCommandPalette({
  data,
  discoveries,
  onOpenResult,
  onOpenMemory,
  onRandomMemory,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo(() => searchTravelData(data, query), [data, query])
  useFocusTrap(rootRef, '[data-command-trigger]')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const select = (result: TravelSearchResult | undefined) => {
    if (result) onOpenResult(result)
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="旅行回忆索引"
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#02040b]/72 px-3 pt-[10vh] backdrop-blur-md sm:px-6"
      onClick={onClose}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="rg-command-palette w-full max-w-2xl overflow-hidden rounded-2xl border border-white/12 bg-[rgba(6,9,20,.96)] shadow-[0_35px_140px_rgba(0,0,0,.78)]"
      >
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
          <span aria-hidden className="font-mono text-sm text-cyan-100/55">⌕</span>
          <input
            ref={inputRef}
            role="combobox"
            aria-label="搜索旅程、地点、交通与照片"
            aria-controls="travel-command-results"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-activedescendant={results[activeIndex]
              ? `travel-command-${results[activeIndex].id}`
              : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) => (index + 1) % Math.max(results.length, 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) => (
                  (index - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1)
                ))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                select(results[activeIndex])
              }
            }}
            placeholder="搜索城市、备注、车次或照片…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white/88 outline-none placeholder:text-white/28"
          />
          <button
            type="button"
            onClick={onRandomMemory}
            className="shrink-0 rounded-full border border-amber-100/16 bg-amber-100/[.05] px-3 py-1.5 text-[10px] text-amber-50/68 transition hover:border-amber-100/34 hover:text-amber-50/92"
          >
            拾起一段回忆
          </button>
          <kbd className="hidden rounded border border-white/10 px-1.5 py-1 font-mono text-[9px] text-white/30 sm:block">
            ESC
          </kbd>
        </div>

        {!query && (
          <MemoryDiscoveryStrip
            discoveries={discoveries}
            onOpen={onOpenMemory}
          />
        )}

        <div
          id="travel-command-results"
          role="listbox"
          aria-label={query ? '搜索结果' : '最近旅程'}
          className="rg-scroll max-h-[56vh] overflow-y-auto overscroll-contain p-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-serif text-lg text-white/55">没有找到对应回忆</p>
              <p className="mt-1 text-xs text-white/30">换一个城市、日期、车次或照片标注试试</p>
            </div>
          ) : results.map((result, index) => (
            <button
              id={`travel-command-${result.id}`}
              key={result.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => select(result)}
              className={`grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                index === activeIndex
                  ? 'bg-cyan-100/[.075] text-white'
                  : 'text-white/68 hover:bg-white/[.035]'
              }`}
            >
              <span className="font-mono text-[9px] tracking-[0.12em] text-cyan-100/42">
                {KIND_LABELS[result.kind]}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-white/88">{result.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-white/36">
                  {result.subtitle}
                </span>
              </span>
              <span aria-hidden className="text-white/20">↵</span>
            </button>
          ))}
        </div>

        <footer className="flex items-center justify-between border-t border-white/7 px-4 py-2.5 font-mono text-[9px] tracking-[0.08em] text-white/28 sm:px-5">
          <span>↑↓ 选择 · ENTER 打开 · ESC 关闭</span>
          <span>{query ? `${results.length} 条结果` : 'RECENT JOURNEYS'}</span>
        </footer>
      </section>
    </div>
  )
}
