import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '@/components/common/ErrorBoundary'

function BrokenScene(): never {
  throw new Error('WebGL unavailable')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the surrounding app alive and reports a failed scene', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onError = vi.fn()

    render(
      <ErrorBoundary
        fallback={<p>场景暂不可用</p>}
        onError={onError}
      >
        <BrokenScene />
      </ErrorBoundary>,
    )

    expect(screen.getByText('场景暂不可用')).toBeTruthy()
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toMatchObject({ message: 'WebGL unavailable' })
  })
})
