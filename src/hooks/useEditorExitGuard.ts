import { useCallback, useEffect, useState } from 'react'

export type EditorExitIntent = 'back' | 'close'

interface Options {
  dirty: boolean
  onDiscard: () => void
  onClose: () => void
  onBack: () => void
}

export function useEditorExitGuard({
  dirty,
  onDiscard,
  onClose,
  onBack,
}: Options) {
  const [pendingExit, setPendingExit] = useState<EditorExitIntent | null>(null)

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const requestClose = useCallback(() => {
    if (dirty) {
      setPendingExit('close')
      return
    }
    onClose()
  }, [dirty, onClose])

  const requestBack = useCallback(() => {
    if (dirty) {
      setPendingExit('back')
      return
    }
    onBack()
  }, [dirty, onBack])

  const confirmDiscard = useCallback(() => {
    if (!pendingExit) return
    setPendingExit(null)
    onDiscard()
    if (pendingExit === 'close') onClose()
    else onBack()
  }, [onBack, onClose, onDiscard, pendingExit])

  return {
    pendingExit,
    requestClose,
    requestBack,
    confirmDiscard,
    cancelExit: () => setPendingExit(null),
  }
}
