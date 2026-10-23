import { useEffect, type RefObject } from 'react'

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  fallbackSelector?: string,
) {
  useEffect(() => {
    const root = ref.current
    if (!root) return

    const activeElement = document.activeElement
    const previousFocus = activeElement instanceof HTMLElement
      && activeElement !== document.body
      ? activeElement
      : null
    const initial = root.querySelector<HTMLElement>(FOCUSABLE)
    initial?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!root.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      const fallback = fallbackSelector
        ? document.querySelector<HTMLElement>(fallbackSelector)
        : null
      const target = previousFocus?.isConnected ? previousFocus : fallback
      target?.focus()
    }
  }, [fallbackSelector, ref])
}
