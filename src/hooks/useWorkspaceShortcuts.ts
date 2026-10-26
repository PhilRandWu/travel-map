import { useEffect } from 'react'

interface Options {
  blocked: boolean
  onToggleFocus: () => void
  onExitFocus: () => void
  onCommandOpen: () => void
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input'
    || tag === 'textarea'
    || tag === 'select'
    || target.isContentEditable
}

export function useWorkspaceShortcuts({
  blocked,
  onToggleFocus,
  onExitFocus,
  onCommandOpen,
}: Options) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = (event.metaKey || event.ctrlKey)
        && event.key.toLocaleLowerCase() === 'k'

      if (command) {
        if (blocked) return
        event.preventDefault()
        onCommandOpen()
        return
      }
      if (blocked) return

      if (event.key === 'Escape') {
        onExitFocus()
        return
      }
      if (
        event.key.toLocaleLowerCase() === 'f'
        && !event.metaKey
        && !event.ctrlKey
        && !event.altKey
        && !isEditableTarget(event.target)
      ) {
        event.preventDefault()
        onToggleFocus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [blocked, onCommandOpen, onExitFocus, onToggleFocus])
}
