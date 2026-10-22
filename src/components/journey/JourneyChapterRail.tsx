import type { TravelData } from '@/types'
import type { Selection } from '@/types'
import type { TimelineNode } from '@/lib/derive'
import type { ReplayRuntime } from '@/lib/replay'
import Timeline from '@/components/timeline/Timeline'

interface Props {
  data: TravelData
  nodes: TimelineNode[]
  selection: Selection
  startSignal: number
  onSelect: (node: TimelineNode) => void
  onFinishPlayback: () => void
  onPlaybackRuntimeChange: (runtime: ReplayRuntime) => void
}

export default function JourneyChapterRail(props: Props) {
  return (
    <section aria-label="当前旅程章节">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] tracking-[0.22em] text-amber-100/55">JOURNEY CHAPTERS</p>
        <p className="text-[10px] text-white/35">按日期从出发到归程</p>
      </div>
      <Timeline {...props} />
    </section>
  )
}
