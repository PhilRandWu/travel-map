import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JourneyCoverPhoto } from '@/types'
import JourneyCoverMosaic from '@/components/journey/JourneyCoverMosaic'

describe('JourneyCoverMosaic', () => {
  it('renders up to five cover photos with md assets', () => {
    const covers: JourneyCoverPhoto[] = Array.from({ length: 6 }, (_, index) => ({
      visitId: 'v001',
      file: `${index + 1}.svg`,
    }))
    const { container } = render(
      <JourneyCoverMosaic covers={covers} title="江南春行" theme="cyan" />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(5)
    expect(container.querySelector('img')?.getAttribute('src'))
      .toContain('/media/v001/1.svg/thumb-md.webp')
  })

  it('renders a generated route cover without photos', () => {
    render(<JourneyCoverMosaic covers={[]} title="江南春行" theme="cyan" />)
    expect(screen.getByText('江南春行')).toBeTruthy()
  })
})
