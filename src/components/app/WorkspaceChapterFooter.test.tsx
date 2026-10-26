import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import dataJson from '@/data/trips.json'
import type { TravelData } from '@/types'
import WorkspaceChapterFooter from '@/components/app/WorkspaceChapterFooter'

vi.mock('@/components/journey/JourneyChapterRail', () => ({
  default: () => <div>章节回放控制</div>,
}))

const data = dataJson as TravelData

function renderFooter(focusMode: boolean) {
  return render(
    <WorkspaceChapterFooter
      footerRef={createRef<HTMLElement>()}
      focusMode={focusMode}
      isArchive={false}
      data={data}
      activeJourneyId="j001"
      scopedData={data}
      timeline={[]}
      selection={{ kind: 'none' }}
      replayStartSignal={0}
      onOpenJourney={vi.fn()}
      onNewJourney={vi.fn()}
      onRandomMemory={vi.fn()}
      onSelectTimelineNode={vi.fn()}
      onFinishPlayback={vi.fn()}
      onPlaybackRuntimeChange={vi.fn()}
    />,
  )
}

describe('WorkspaceChapterFooter', () => {
  it('keeps replay controls available unless focus mode owns the interaction', () => {
    const { container, rerender } = renderFooter(false)
    const footer = container.querySelector('footer')

    expect(footer?.hasAttribute('inert')).toBe(false)
    expect(screen.getByText('章节回放控制')).toBeTruthy()

    rerender(
      <WorkspaceChapterFooter
        footerRef={createRef<HTMLElement>()}
        focusMode
        isArchive={false}
        data={data}
        activeJourneyId="j001"
        scopedData={data}
        timeline={[]}
        selection={{ kind: 'none' }}
        replayStartSignal={0}
        onOpenJourney={vi.fn()}
        onNewJourney={vi.fn()}
        onRandomMemory={vi.fn()}
        onSelectTimelineNode={vi.fn()}
        onFinishPlayback={vi.fn()}
        onPlaybackRuntimeChange={vi.fn()}
      />,
    )

    expect(footer?.hasAttribute('inert')).toBe(true)
  })
})
