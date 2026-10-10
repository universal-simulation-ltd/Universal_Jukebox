// PullDrawer.tsx — the search box, Shuffle and the list options, folded away
// above a library tab until you pull down from the top of the page (James,
// 2026-10-10: "don't show the search bar until you scroll down and it pops
// out", and the same for the playing options). The same gesture as the
// website's phone search (`components/PhoneSearch.tsx`, which has the long
// version of every rule below): only from the very top, only a mostly
// vertical pull, and not one that starts on a sideways swiper (`data-swipe-x`,
// the shelves). It follows the finger with some resistance, opens past
// PULL_TO_OPEN, and springs shut otherwise.
//
// Scroll it out of sight and it folds itself away again, so the next time
// it's wanted it is pulled out again (James, 2026-10-10). The list below is
// held where it is on screen, so nothing jumps. The
// parent decides whether to let go: with a search typed in, the box stays.

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { navBarBottom } from '../lib/scrollBelowBar'

/** How far the finger has to travel, in px, before letting go opens it. */
const PULL_TO_OPEN = 64
/** The drawer moves this much per pixel of finger: a pull, not a drag. */
const RESIST = 0.6

export function PullDrawer({
  shown,
  onOpen,
  onScrolledAway,
  children,
}: {
  shown: boolean
  onOpen(): void
  /** It has scrolled out of sight under the top bar. Left out while it must
   *  stay (a search is typed in), and then it never folds itself. */
  onScrolledAway?: () => void
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const full = () => inner.current?.offsetHeight ?? 120

  const settle = useCallback((to: number) => {
    const el = box.current
    if (!el) return
    let reduced = false
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* animate */ }
    el.style.transition = reduced ? 'none' : 'height 240ms cubic-bezier(.2,.8,.2,1), opacity 240ms ease-out'
    el.style.height = `${to}px`
    el.style.opacity = to > 0 ? '1' : '0'
    // Open, it takes the height of what is in it, so the options row can
    // grow (Genre adds a chip) without being cut off.
    if (to > 0) {
      const done = () => { if (box.current) box.current.style.height = 'auto' }
      if (reduced) done()
      else window.setTimeout(done, 260)
    }
  }, [])

  useLayoutEffect(() => {
    settle(shown ? full() : 0)
  }, [shown, settle])

  // Open: fold away once it is scrolled out of sight.
  useEffect(() => {
    if (!shown || !onScrolledAway) return
    let frame = 0
    const check = () => {
      frame = 0
      const el = box.current
      if (!el || el.offsetHeight === 0) return
      if (el.getBoundingClientRect().bottom > navBarBottom()) return
      // Keep what's below exactly where it is on screen. Measured rather than
      // assumed: Chromium (Android) moves the page itself when content above
      // the view goes (scroll anchoring) and WebKit (iOS) doesn't, so a fixed
      // scrollBy(-height) jumped twice the height on the A065's WebView.
      const below = el.nextElementSibling
      const before = below?.getBoundingClientRect().top ?? 0
      el.style.transition = 'none'
      el.style.height = '0px'
      el.style.opacity = '0'
      const after = below?.getBoundingClientRect().top ?? 0
      if (after !== before) window.scrollBy(0, after - before)
      onScrolledAway()
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [shown, onScrolledAway])

  useEffect(() => {
    if (shown) return
    let startY: number | null = null
    let startX = 0
    let pulled = 0
    let decided = false
    const start = (e: TouchEvent) => {
      const onSwiper = e.target instanceof Element && e.target.closest('[data-swipe-x]') !== null
      startY = !onSwiper && window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
      startX = e.touches[0]?.clientX ?? 0
      pulled = 0
      decided = false
    }
    const move = (e: TouchEvent) => {
      const el = box.current
      if (startY === null || e.touches.length !== 1 || !el) return
      const dy = e.touches[0].clientY - startY
      const dx = e.touches[0].clientX - startX
      if (!decided) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        decided = true
        if (dy <= 0 || Math.abs(dx) >= Math.abs(dy) * 0.75) {
          startY = null
          return
        }
      }
      pulled = dy
      const peek = Math.max(0, Math.min(full(), pulled * RESIST))
      el.style.transition = 'none'
      el.style.height = `${peek}px`
      el.style.opacity = String(Math.min(1, peek / full()))
    }
    const end = () => {
      if (startY === null) return
      startY = null
      if (pulled > PULL_TO_OPEN) onOpen()
      else settle(0)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [shown, onOpen, settle])

  return (
    <div
      ref={box}
      className="jx-drawer"
      aria-hidden={!shown}
      // Shut, nothing in it can take focus. (React 18's types predate `inert`.)
      {...({ inert: shown ? undefined : '' } as Record<string, string | undefined>)}
    >
      <div ref={inner} className="jx-drawer-inner">{children}</div>
    </div>
  )
}
