import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransportMix from '@/components/stats/TransportMix'

describe('TransportMix', () => {
  it('always renders all five modes, including zero counts', () => {
    render(
      <TransportMix
        counts={{ flight: 2, train: 1, metro: 0, ship: 3, car: 0 }}
      />,
    )

    expect(screen.getByLabelText('飞机 2')).toBeTruthy()
    expect(screen.getByLabelText('地铁 0')).toBeTruthy()
    expect(screen.getByLabelText('轮船 3')).toBeTruthy()
    expect(screen.getByLabelText('汽车 0')).toBeTruthy()
  })
})
