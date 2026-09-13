import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// The last row of Now Playing on a PHONE — shuffle, the repeats, a shelf, the
// "i" — folded away under the records waiting to go on, and pulled up into view
// with your finger (James, 2026-09-13: "on scrolling down stop the page after
// the record queue and then if swipe again show the options, a reverse of how
// the search bar works").
//
// `PhoneSearch` upside down: that folds away above the tabs and is pulled DOWN
// from the top of the page; this folds away below the last thing on the page
// and is pulled UP from its end. Same rules otherwise: the height is written on
// the element, not through React (a pull moves it sixty times a second); it
// follows the finger at a little over half its speed; a release past
// `PULL_TO_OPEN` opens it and anything less folds it back; a touch that starts
// on something that swipes sideways (`data-swipe-x`) is never a pull.
//
// ⚠️ TWO DIFFERENCES, both because this end of the page is the END.
//   - A box growing at the top pushes the page down under the finger and is
//     seen; one growing at the bottom grows below the screen, unseen. So every
//     step of the pull also scrolls the page to its new end, and so does the
//     opening.
//   - The pull is decided on the FIRST move, and claimed then (a non-passive
//     `touchmove`). At the bottom iOS rubber-bands the page on an upward drag,
//     and once it has started it will not let a later `preventDefault` stop it
//     — the bounce and the pull would fight for the whole gesture.
//
// Once open it stays open for this visit to Now Playing. Wider than a phone it
// is not folded at all.
//
// ⚠️ NOT HIDDEN FROM A SCREEN READER, unlike the search box. These are the play
// controls, not a shortcut to something reachable elsewhere, and a pull is a
// gesture VoiceOver users cannot easily make. Focus arriving inside (VoiceOver,
// a keyboard) opens it instead.

/** How far the finger has to travel for a release to open it. */
const PULL_TO_OPEN = 64
/** The row moves at this share of the finger's travel. */
const RESIST = 0.6
/** How long the opening takes — and so how long the page is kept at its end. */
const OPEN_MS = 240

export default function FoldUp({ open, onOpen, children }: { open: boolean; onOpen(): void; children: ReactNode }) {
  const phone = usePhone()
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const opener = useRef(onOpen)
  useEffect(() => {
    opener.current = onOpen
  })

  const full = () => inner.current?.offsetHeight ?? 80

  /** To `to` pixels, animated; `follow` keeps the page at its end as it grows. */
  const settle = useCallback((to: number, follow = false) => {
    const el = box.current
    if (!el) return
    let reduced = false
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* animate */ }
    el.style.transition = reduced ? 'none' : `height ${OPEN_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${OPEN_MS}ms ease-out`
    el.style.height = `${to}px`
    el.style.opacity = to > 0 ? '1' : '0'
    if (follow) {
      const until = performance.now() + OPEN_MS + 40
      const pin = () => {
        window.scrollTo(0, document.documentElement.scrollHeight)
        if (performance.now() < until) requestAnimationFrame(pin)
      }
      requestAnimationFrame(pin)
    }
  }, [])

  // Folded or open, as `open` says. Once open, the height is let go (`auto`),
  // so a row that wraps on a narrow screen is never clipped.
  useLayoutEffect(() => {
    if (!phone) return
    if (!open) {
      settle(0)
      return
    }
    settle(full())
    const loosen = window.setTimeout(() => {
      if (box.current) box.current.style.height = 'auto'
    }, OPEN_MS + 20)
    return () => window.clearTimeout(loosen)
  }, [phone, open, settle])

  // The pull. Only from the very end of the page, one finger, on a phone.
  useEffect(() => {
    if (!phone || open) return
    let startY: number | null = null
    let startX = 0
    let pulled = 0
    let decided = false
    const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
    const start = (e: TouchEvent) => {
      const onSwiper = e.target instanceof Element && e.target.closest('[data-swipe-x]') !== null
      startY = !onSwiper && e.touches.length === 1 && atEnd() ? e.touches[0].clientY : null
      startX = e.touches[0]?.clientX ?? 0
      pulled = 0
      decided = false
    }
    const move = (e: TouchEvent) => {
      const el = box.current
      if (startY === null || e.touches.length !== 1 || !el) return
      // Up is positive: the finger moving towards the top of the screen.
      const dy = startY - e.touches[0].clientY
      const dx = e.touches[0].clientX - startX
      if (!decided) {
        if (dx === 0 && dy === 0) return
        decided = true
        // Down, or more across than up: a scroll or a swipe, not a pull.
        if (dy <= 0 || Math.abs(dx) > dy) {
          startY = null
          return
        }
      }
      // Ours from here — see the note on the rubber band above.
      if (e.cancelable) e.preventDefault()
      pulled = dy
      const peek = Math.max(0, Math.min(full(), pulled * RESIST))
      el.style.transition = 'none'
      el.style.height = `${peek}px`
      el.style.opacity = String(Math.min(1, peek / full()))
      window.scrollTo(0, document.documentElement.scrollHeight)
    }
    const end = () => {
      if (startY === null) return
      startY = null
      if (pulled > PULL_TO_OPEN) {
        settle(full(), true)
        opener.current()
      } else {
        settle(0)
      }
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [phone, open, settle])

  if (!phone) return <>{children}</>
  return (
    <div
      ref={box}
      className="h-0 overflow-hidden opacity-0"
      onFocus={() => {
        if (!open) opener.current()
      }}
    >
      {/* `flow-root`, so the row's own top margin is inside the height measured. */}
      <div ref={inner} className="flow-root pb-2">
        {children}
      </div>
    </div>
  )
}

/** A phone — the width below which the search box folds away too. */
function usePhone(): boolean {
  const query = '(max-width: 639px)'
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const change = () => setPhone(media.matches)
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return phone
}
