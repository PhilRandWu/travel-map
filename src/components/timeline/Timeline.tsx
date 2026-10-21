import { useEffect, useMemo, useRef, useState } from 'react'
import type { TravelData } from '@/types'
import type { Selection } from '@/types'
import type { TimelineNode as TimelineNodeModel } from '@/lib/derive'
import {
  getTimelineSelectionIndex,
  selectionMatchesTimelineNode,
} from '@/lib/selection'
import { buildReplayPlan } from '@/lib/replay'
import TimelineNode from '@/components/timeline/TimelineNode'
import TimelineControls from '@/components/timeline/TimelineControls'
import { useTimelinePlayback } from '@/components/timeline/hooks/useTimelinePlayback'
import { buildTimelineItems } from '@/components/timeline/items'

interface Props {
  data: TravelData
  nodes: TimelineNodeModel[]
  selection: Selection
  onSelect: (node: TimelineNodeModel) => void
  onFinishPlayback: () => void
}

export default function Timeline({
  data,
  nodes,
  selection,
  onSelect,
  onFinishPlayback,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<number, HTMLButtonElement>())
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  // pointerup 发生在节点外时保留一次性抑制，防止拖拽结束误触发选中
  const dragHadMovedRef = useRef(false)

  const items = useMemo(() => buildTimelineItems(data, nodes), [data, nodes])
  const replayPlan = useMemo(() => buildReplayPlan(data, nodes), [data, nodes])
  const activeIndex = getTimelineSelectionIndex(nodes, selection)
  const expectedPlaybackNodeRef = useRef<TimelineNodeModel | null>(null)
  const previousSelectionRef = useRef(selection)
  const playback = useTimelinePlayback({
    plan: replayPlan,
    onActivate: (node) => {
      expectedPlaybackNodeRef.current = node
      onSelect(node)
    },
    onFinish: onFinishPlayback,
  })

  useEffect(() => {
    if (activeIndex < 0) return
    const scroller = scrollRef.current
    const node = nodeRefs.current.get(activeIndex)
    if (!scroller || !node) return
    const left = node.offsetLeft - (scroller.clientWidth - node.offsetWidth) / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [activeIndex])

  // 地球轨迹、城市卡片等外部入口改变 Selection 时，终止正在进行的回放。
  useEffect(() => {
    const selectionChanged = previousSelectionRef.current !== selection
    previousSelectionRef.current = selection
    if (!selectionChanged || playback.status === 'idle') return

    const expected = expectedPlaybackNodeRef.current
    if (expected && selectionMatchesTimelineNode(selection, expected)) {
      expectedPlaybackNodeRef.current = null
      return
    }
    playback.stop()
  }, [playback.status, playback.stop, selection])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const scroller = scrollRef.current
    if (!scroller) return
    // 点击时不捕获指针，否则 click 会被滚动容器拦截；拖动超过阈值后再捕获
    dragRef.current = { x: event.clientX, left: scroller.scrollLeft, moved: false }
    dragHadMovedRef.current = false
    setDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current
    const drag = dragRef.current
    if (!scroller || !drag) return
    const delta = event.clientX - drag.x
    if (Math.abs(delta) > 4) drag.moved = true
    if (drag.moved && !scroller.hasPointerCapture(event.pointerId)) {
      scroller.setPointerCapture(event.pointerId)
    }
    dragHadMovedRef.current = drag.moved
    scroller.scrollLeft = drag.left - delta
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.moved) suppressClickRef.current = true
    dragRef.current = null
    setDragging(false)
    if (scrollRef.current?.hasPointerCapture(event.pointerId)) {
      scrollRef.current.releasePointerCapture(event.pointerId)
    }
  }

  const handleSelect = (index: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    playback.stop()
    expectedPlaybackNodeRef.current = null
    onSelect(nodes[index])
    setTimeout(() => {
      suppressClickRef.current = false
      dragHadMovedRef.current = false
    }, 0)
  }

  return (
    <div className="pointer-events-auto relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(5,8,17,.72)] p-2 shadow-[0_-15px_50px_rgba(0,0,0,.28)] backdrop-blur-xl">
      <TimelineControls
        status={playback.status}
        speed={playback.speed}
        progress={playback.progress}
        activeIndex={playback.activeIndex >= 0 ? playback.activeIndex : activeIndex}
        total={items.length}
        onToggle={playback.toggle}
        onSpeedChange={playback.setSpeed}
        onSeek={playback.seek}
      />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#050811] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#050811] to-transparent" />
        <div
          ref={scrollRef}
          role="list"
          aria-label="旅行时间轴"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragStart={(event) => event.preventDefault()}
          onWheel={(event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              event.currentTarget.scrollLeft += event.deltaY
            }
          }}
          className={`rg-timeline flex snap-x gap-2 overflow-x-auto px-6 py-1 ${
            dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
        >
          {items.map((item, index) => (
            <TimelineNode
              key={`${nodes[index].kind}:${nodes[index].refId}`}
              item={item}
              active={index === activeIndex}
              index={index}
              buttonRef={(element) => {
                if (element) nodeRefs.current.set(index, element)
                else nodeRefs.current.delete(index)
              }}
              onSelect={() => handleSelect(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
