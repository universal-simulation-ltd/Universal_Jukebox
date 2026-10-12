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

/**
 * Scroll back to the top FIRST, and only then run `done` — for closing a panel
 * the way it opened, backwards (James, 2026-10-12: "clicking hide the lyric
 * sheet abruptly jumps to the top, it should transition out the reverse of how
 * it transitions in").
 *
 * Opening shows the panel and then scrolls down to it. Closing it at once and
 * scrolling afterwards (`scrollToTop`) took the page's height away under the
 * reader: the browser clamped the scroll position to the shorter page in one
 * frame, which is the jump. So the panel stays while the page glides up, and
 * goes once the record is back in view.
 *
 * ⚠️ WITH A BACKSTOP. A smooth scroll can be abandoned (WebKit) or fought by a
 * finger; after a second the panel closes anyway and the page jumps the rest
 * of the way, which is the old behaviour rather than a stuck button. Reduced
 * motion closes it at once.
 */
export function scrollToTopThen(done: () => void): void {
  let reduced = false
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { /* no matchMedia — animate */ }
  if (reduced || window.scrollY <= 2) {
    done()
    window.scrollTo(0, 0)
    return
  }
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    window.clearTimeout(backstop)
    done()
    if (window.scrollY > 2) window.scrollTo(0, 0)
  }
  const backstop = window.setTimeout(finish, 1000)
  window.scrollTo({ top: 0, behavior: 'smooth' })
  const watch = () => {
    if (finished) return
    if (window.scrollY <= 2) finish()
    else requestAnimationFrame(watch)
  }
  requestAnimationFrame(watch)
}
