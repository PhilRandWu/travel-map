import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ArchiveRecovery from '@/components/common/ArchiveRecovery'

describe('ArchiveRecovery', () => {
  it('requires explicit confirmation before restoring bundled data', async () => {
    const onRestoreBundled = vi.fn()
    render(
      <ArchiveRecovery
        onReload={() => undefined}
        onRestoreBundled={onRestoreBundled}
        onClearArchive={() => undefined}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '恢复内置示例' }))
    expect(onRestoreBundled).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog', { name: '恢复内置示例？' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: '确认恢复' }))
    expect(onRestoreBundled).toHaveBeenCalledTimes(1)
  })

  it('requires explicit confirmation before clearing the local archive', async () => {
    const onClearArchive = vi.fn()
    render(
      <ArchiveRecovery
        onReload={() => undefined}
        onRestoreBundled={() => undefined}
        onClearArchive={onClearArchive}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '清理本地存档' }))
    await userEvent.click(screen.getByRole('button', { name: '确认清理' }))

    expect(onClearArchive).toHaveBeenCalledTimes(1)
  })
})
