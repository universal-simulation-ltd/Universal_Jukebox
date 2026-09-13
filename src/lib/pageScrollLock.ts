import { useEffect, useRef, type RefObject } from 'react'

// Keep the page still while a menu over it is open (James, 2026-09-13: "When
// scrolling anywhere on actions menu it shouldn't scroll the page behind").
//
// ⚠️ WHY A LOCK ON THE PAGE, AND NOT A STYLE ON THE MENU. The Actions panel is
// the SDK's `DropdownSurface`: it scrolls within itself (`overflowY: auto`,
// capped to the room on screen) but sets no `overscroll-behavior`, and
// `UserProfile` offers no way to style it. A drag that reaches the panel's end
// carries on into the page — and a drag on a panel with nothing to scroll,
// which is most of the time, goes to the page straight away. Even
// `overscroll-behavior: contain` would only cure the first of those: a panel
// that does not overflow is never scrolled, so there is nothing to contain.
// Stopping the page is what covers both.
//
// ⚠️ WHY IT WATCHES RATHER THAN LOCKING ON MOUNT. The SDK keeps the panel
// MOUNTED while shut — hidden by `visibility`, so that it can fade — so the rows
// inside it (our `AppMenu`) never unmount, and a lock taken on mount would
// never be let go. The panel's own inline `visibility` is what says it is open.
//
// The better home for this is the SDK's `DropdownSurface`, for every menu in
// the suite; this is the Jukebox's until it is there.

/** Stop the page from scrolling. Returns the undo. */
export function lockPageScroll(): () => void {
  const html = document.documentElement
  const body = document.body
  const before = {
    overflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    overscroll: html.style.getPropertyValue('overscroll-behavior'),
    gutter: html.style.getPropertyValue('scrollbar-gutter'),
  }
  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  // No rubber-banding of the page behind, on iOS.
  html.style.setProperty('overscroll-behavior', 'none')
  // A classic scrollbar (the Windows app) keeps its width, so the page does not
  // shift sideways as the menu opens.
  html.style.setProperty('scrollbar-gutter', 'stable')
  return () => {
    html.style.overflow = before.overflow
    body.style.overflow = before.bodyOverflow
    html.style.setProperty('overscroll-behavior', before.overscroll)
    html.style.setProperty('scrollbar-gutter', before.gutter)
  }
}

/**
 * Lock the page while the fixed-position panel that `inside` is drawn in is
 * showing, and let it go when the panel hides or `inside` goes away.
 *
 * `onHidden` runs each time the panel is put away — for state inside it that
 * should start afresh next time, since (see above) nothing inside unmounts.
 */
export function usePageLockWhileShown(inside: RefObject<HTMLElement | null>, onHidden?: () => void): void {
  const hidden = useRef(onHidden)
  useEffect(() => {
    hidden.current = onHidden
  })
  useEffect(() => {
    // The panel: the nearest ancestor pinned to the screen.
    let surface: HTMLElement | null = inside.current
    while (surface && surface.style.position !== 'fixed') surface = surface.parentElement
    if (!surface) return
    const panel = surface
    let undo: (() => void) | null = null
    const sync = () => {
      const shown = panel.style.visibility === 'visible'
      if (shown && !undo) undo = lockPageScroll()
      else if (!shown && undo) {
        undo()
        undo = null
        hidden.current?.()
      }
    }
    sync()
    const watch = new MutationObserver(sync)
    watch.observe(panel, { attributes: true, attributeFilter: ['style'] })
    return () => {
      watch.disconnect()
      undo?.()
    }
  }, [inside])
}
