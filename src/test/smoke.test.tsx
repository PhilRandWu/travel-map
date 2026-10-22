import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('component test environment', () => {
  it('renders a React component in jsdom', () => {
    render(<button type="button">打开旅程</button>)

    expect(screen.getByRole('button', { name: '打开旅程' })).toBeTruthy()
  })
})
