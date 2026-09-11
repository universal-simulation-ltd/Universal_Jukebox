/**
 * Scroll the page back to its top — smoothly, unless reduced motion is asked for.
 *
 * ⚠️ AFTER THE NEXT FRAME, NOT AT ONCE, AND WITH A BACKSTOP (James, 2026-09-11:
 * "hide lyrics not scrolling to top of page"). A caller has usually just changed
 * the page — Hide lyrics takes a whole panel away — and a smooth scroll started
 * in the same moment is one WebKit on the iPhone abandons when the page shrinks
 * under it; Chromium carries on, which is why it passed there. So the scroll
 * waits for the change to be drawn, and if it still has not arrived a moment
 * later, it jumps the rest of the way.
 */
export function scrollToTop(): void {
  let reduced = false
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { /* no matchMedia — animate */ }
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      window.setTimeout(() => {
        if (window.scrollY > 2) window.scrollTo(0, 0)
      }, 800)
    }),
  )
}
