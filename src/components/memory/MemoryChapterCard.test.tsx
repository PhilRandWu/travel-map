import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MemoryChapterCard from '@/components/memory/MemoryChapterCard'

describe('MemoryChapterCard', () => {
  it('shows the date on the left and the place on the right', () => {
    render(<MemoryChapterCard date="2025-05-02" cityName="杭州" />)
    expect(screen.getByText('5 月 2 日')).toBeTruthy()
    expect(screen.getByText('杭州')).toBeTruthy()
  })
})
