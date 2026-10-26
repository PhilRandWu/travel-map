import { useState } from 'react'
import type { TravelData } from '@/types'
import { sortJourneysNewestFirst, summarizeJourney } from '@/lib/journeys'
import JourneyCard from '@/components/journey/JourneyCard'
import JourneyArchiveDrawer from '@/components/journey/JourneyArchiveDrawer'

interface Props {
  data: TravelData
  onOpenJourney: (journeyId: string) => void
  onNewJourney: () => void
  onRandomMemory?: () => void
}

export default function JourneyArchive({
  data,
  onOpenJourney,
  onNewJourney,
  onRandomMemory,
}: Props) {
  const [allOpen, setAllOpen] = useState(false)
  const allSummaries = sortJourneysNewestFirst(data.journeys)
    .map((journey) => summarizeJourney(data, journey))
  const summaries = allSummaries.slice(0, 3)

  if (summaries.length === 0) {
    return (
      <section className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-white/10 bg-[rgba(6,9,20,.76)] p-6 text-center backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
        <h2 className="mt-2 font-serif text-2xl text-white">建立第一段旅程</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          给一段时间一个名字，再放进第一座城市与第一张照片。
        </p>
        <button
          type="button"
          onClick={onNewJourney}
          className="mt-4 min-h-10 cursor-pointer rounded-full border border-cyan-200/24 bg-cyan-200/[.07] px-5 text-xs tracking-[0.1em] text-cyan-50/85 transition hover:border-cyan-200/45 hover:bg-cyan-200/12"
        >
          新增第一段旅程
        </button>
      </section>
    )
  }

  return (
    <>
      <section aria-label="旅行档案" className="pointer-events-auto">
        <div className="mb-2 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
            <h2 className="mt-1 font-serif text-lg text-white">选择一段旅程，重新走一遍</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onRandomMemory && (
              <button
                type="button"
                onClick={onRandomMemory}
                className="min-h-9 rounded-full border border-amber-100/12 px-3 text-[11px] text-amber-50/55 transition hover:border-amber-100/28 hover:text-amber-50/85"
              >
                拾起回忆
              </button>
            )}
            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="min-h-9 rounded-full border border-white/10 bg-white/5 px-4 text-xs tracking-[0.12em] text-white/62 transition hover:border-white/25 hover:text-white"
            >
              全部旅程
            </button>
          </div>
        </div>
        <div className="rg-scroll flex gap-3 overflow-x-auto pb-2">
          {summaries.map((summary, index) => (
            <JourneyCard
              key={summary.journey.id}
              summary={summary}
              featured={index === 0}
              onOpen={() => onOpenJourney(summary.journey.id)}
            />
          ))}
        </div>
      </section>

      {allOpen && (
        <JourneyArchiveDrawer
          summaries={allSummaries}
          onNewJourney={() => {
            setAllOpen(false)
            onNewJourney()
          }}
          onOpenJourney={(journeyId) => {
            setAllOpen(false)
            onOpenJourney(journeyId)
          }}
          onClose={() => setAllOpen(false)}
        />
      )}
    </>
  )
}
