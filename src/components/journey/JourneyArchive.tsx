import { useState } from 'react'
import type { TravelData } from '@/types'
import { sortJourneysNewestFirst, summarizeJourney } from '@/lib/journeys'
import JourneyCard from '@/components/journey/JourneyCard'
import JourneyArchiveDrawer from '@/components/journey/JourneyArchiveDrawer'

interface Props {
  data: TravelData
  onOpenJourney: (journeyId: string) => void
}

export default function JourneyArchive({ data, onOpenJourney }: Props) {
  const [allOpen, setAllOpen] = useState(false)
  const summaries = sortJourneysNewestFirst(data.journeys)
    .slice(0, 3)
    .map((journey) => summarizeJourney(data, journey))

  if (summaries.length === 0) {
    return (
      <section className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-white/10 bg-[rgba(6,9,20,.76)] p-6 text-center backdrop-blur-xl">
        <p className="text-[10px] tracking-[0.24em] text-cyan-100/45">TRAVEL ARCHIVE</p>
        <h2 className="mt-2 font-serif text-2xl text-white">建立第一段旅程</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          在 trips.json 中新增 journeys 记录，并为交通与到访填写 journeyId。
        </p>
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
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs tracking-[0.12em] text-white/62 transition hover:border-white/25 hover:text-white"
          >
            全部旅程
          </button>
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
          journeys={data.journeys}
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
