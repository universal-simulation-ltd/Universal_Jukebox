import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keyboard focus for a modal sheet: in on open, kept inside while open, and
 * back to whatever opened it on close.
 *
 * The sheets all closed on Escape already, but focus stayed on the page behind
 * an `aria-modal` overlay: Tab walked out into controls that were covered up,
 * and closing left focus at the top of the document instead of on the button
 * that opened the sheet.
 *
 * Put the returned ref on the `role="dialog"` element, with `tabIndex={-1}`.
 * A sheet that autofocuses its own input keeps that focus; otherwise the sheet
 * itself takes it (not its first button — that would pre-select an action).
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialog || !dialog.isConnected) return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      // Only back to the opener if it is still on the page — a sheet that
      // replaced another sheet has nothing to return to.
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return ref
}
