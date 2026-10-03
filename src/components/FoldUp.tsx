import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// The last row of Now Playing on a PHONE — shuffle, the repeats, a shelf, the
// "i" — folded away under the records waiting to go on, and pulled up into view
// with your finger (James, 2026-09-13: "on scrolling down stop the page after
// the record queue and then if swipe again show the options, a reverse of how
// the search bar works").
//
// `PhoneSearch` upside down: that folds away above the tabs and is pulled DOWN
// from the top of the page; this folds away below the last thing on the page
// and is swiped UP from its end. Unlike the search box it does not follow the
// finger: a swipe of `POP_AT` pops it open, and a swipe back down pops it shut
// (2026-10-03, see the swipe below). The height is written on the element, not
// through React; a touch that starts on something that swipes sideways
// (`data-swipe-x`) is never ours.
//
// ⚠️ TWO DIFFERENCES, both because this end of the page is the END.
//   - A box growing at the top pushes the page down under the finger and is
//     seen; one growing at the bottom grows below the screen, unseen. So every
//     step of the opening also moves the page down by exactly as much as the
//     box grew.
//   - The swipe is decided on the FIRST move, and claimed then (a non-passive
//     `touchmove`). At the bottom iOS rubber-bands the page on an upward drag,
//     and once it has started it will not let a later `preventDefault` stop it
//     — the bounce and the pull would fight for the whole gesture.
//
// ⚠️ ONE UPDATE PER PAINTED FRAME, AND THE PAGE MOVES BY A MEASURED DELTA
// (James, 2026-09-19: "when I scroll down to reveal the shuffle repeat etc bar
// the screen keeps flashing until it's fully open"). Both halves of that rule
// were what flashed:
//   - `touchmove` arrives faster than the screen refreshes — 120Hz on a recent
//     iPhone, and in coalesced bursts — so writing the height and scrolling the
//     page straight out of the handler moved the page several times between two
//     paints, and what landed on the glass was a frame torn between them. The
//     swipe now draws nothing at all (2026-10-03): it starts `settle`, whose
//     `requestAnimationFrame` moves the page once per frame.
//   - The page used to be kept at its end by slamming it to
//     `scrollHeight` every frame, during the pull and again for the whole of
//     the opening. That reads a layout that is still moving and fights both
//     iOS's rubber band and the momentum left over from the flick, and the two
//     take turns winning for as long as it lasts — "until it's fully open".
//     Now the page is moved by `scrollBy` by the exact number of pixels the
//     box just grew. The document grew by that much and we were at its end, so
//     it lands on the new end with nothing to argue with.
// That is also why the opening is drawn here rather than by a CSS `height`
// transition: only by setting the height ourselves do we know, each frame, how
// far to move the page with it.
//
// ⚠️ IT FOLDS BACK WHEN YOU LEAVE THE END OF THE PAGE (James, 2026-09-15: "when
// scrolling back up when additional buttons revealed (shuffle etc) then re-hide
// the box so they need to swipe down to bottom then down again to reveal"). It
// used to stay open for the rest of the visit, which sounds harmless and is
// not: this row is the whole reason the page has an end worth pulling from, so
// leaving it open leaves the pull with nothing to do — scroll back down and the
// row is simply there, and the gesture that put it there never happens again.
// Folding it back makes the pull the way in every time.
//
// Wider than a phone it is not folded at all.
//
// ⚠️ NOT HIDDEN FROM A SCREEN READER, unlike the search box. These are the play
// controls, not a shortcut to something reachable elsewhere, and a pull is a
// gesture VoiceOver users cannot easily make. Focus arriving inside (VoiceOver,
// a keyboard) opens it instead.

/** How far the finger travels before the row pops open, or shut. */
const POP_AT = 24
/** How long the opening takes — and so how long the page is moved along with it. */
const OPEN_MS = 240
/** Near enough the end of the page to count as at it: a fractional scroll, a hair of bounce. */
const AT_END = 2
/**
 * How little of the row may still show before it counts as scrolled back up:
 * its TOP this close to the bottom of the screen.
 *
 * ⚠️ MEASURED FROM THE ROW'S TOP, NOT FROM THE PAGE'S END (James, 2026-09-29,
 * a screen recording: "Hidden box bouncing back on reveal"). It used to be
 * "more than 96px from the end of the page", which was only ever the same
 * thing while the row was shorter than 96px. Since the Output, Quiet/Loud and
 * Bedside buttons joined it, it is some 250px tall, and an opening that left
 * its last line below the screen — iOS clamps a `scrollBy` made while the page
 * is still growing to the page's OLD length — was already "96px from the end"
 * the moment it finished, and folded straight back. From the top it cannot
 * matter how tall the row is: it folds once it has really gone.
 */
const CLOSE_LEFT = 24

/** Fast away, gentle in — the shape the CSS transition used to have. */
const ease = (t: number) => 1 - (1 - t) ** 3

/** The page is scrolled to its very end. */
const atEnd = () =>
  window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - AT_END

export default function FoldUp({
  open, onOpen, onClose, children,
}: { open: boolean; onOpen(): void; onClose(): void; children: ReactNode }) {
  const phone = usePhone()
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const opener = useRef(onOpen)
  const closer = useRef(onClose)
  useEffect(() => {
    opener.current = onOpen
    closer.current = onClose
  })

  /** The frame the opening (or folding) is drawn on, and where it is headed. */
  const frame = useRef(0)
  const target = useRef<number | null>(null)

  const full = useCallback(() => Math.max(1, inner.current?.offsetHeight ?? 80), [])

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = 0
  }, [])

  /**
   * To `to` pixels over `OPEN_MS`, drawn a frame at a time so the page can be
   * moved by exactly as much as the box grows — see the note on the delta above.
   *
   * ⚠️ Only while it GROWS, and only from the end of the page. Shrinking needs
   * no help (the browser pulls the scroll in as the document gets shorter, and
   * a `scrollBy` on top of that would move it twice), and a box opened by focus
   * from halfway up the page must not drag the page anywhere.
   */
  const settle = useCallback((to: number) => {
    const el = box.current
    if (!el) return
    // Already on its way there — a second call (the pull's, then the effect's)
    // must not restart it, which would lose the anchor it is scrolling from.
    if (frame.current && target.current === to) return
    stop()
    target.current = to
    const from = el.offsetHeight
    const tall = full()
    const follow = to > from && atEnd()
    let at = from
    const draw = (h: number) => {
      el.style.height = `${h}px`
      el.style.opacity = String(Math.min(1, h / tall))
      if (follow && h !== at) window.scrollBy(0, h - at)
      at = h
    }
    // Once open the height is let go, so a row that wraps on a narrow screen is
    // never clipped.
    const done = () => {
      frame.current = 0
      if (to > 0) el.style.height = 'auto'
      // ⚠️ ONE last anchor, once the height has stopped moving. On iOS a
      // `scrollBy` made while the page grows is clamped to the length the
      // scroller last heard about, so the steps above can fall short, and the
      // row ends with its bottom below the screen. The page is finished
      // growing now, so its end is where it will stay.
      if (follow) requestAnimationFrame(() => window.scrollTo(0, document.documentElement.scrollHeight))
    }
    let reduced = false
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* animate */ }
    if (reduced || from === to) {
      draw(to)
      done()
      return
    }
    const began = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / OPEN_MS)
      draw(Math.round(from + (to - from) * ease(t)))
      if (t < 1) frame.current = requestAnimationFrame(step)
      else done()
    }
    frame.current = requestAnimationFrame(step)
  }, [full, stop])

  // Folded or open, as `open` says.
  //
  // ⚠️ NOTHING IS CANCELLED HERE. The pull starts the opening itself, on the
  // release, and only then tells the parent — so by the time this runs the
  // animation is already going and `settle` sees its own target and leaves it
  // alone. Cancelling first would throw away the anchor it is scrolling the
  // page from. The frame is dropped on unmount instead, just below.
  useLayoutEffect(() => {
    if (!phone) return
    settle(open ? full() : 0)
  }, [phone, open, settle, full])

  useEffect(() => stop, [stop])

  // Scrolled back up: fold it away, so the pull is the way in next time too.
  //
  // ⚠️ Hung on the page's SCROLL rather than on the pull's own `touchend`,
  // because the row can be left behind by a scroll that never touched it — a
  // flick that carries on under its own momentum, the keyboard, a link that
  // jumps. Cheap: one `requestAnimationFrame` per scroll burst, and only while
  // it is open at all.
  useEffect(() => {
    if (!phone || !open) return
    let waiting = false
    const look = () => {
      waiting = false
      const el = box.current
      if (!el) return
      // ⚠️ Never out from under a cursor or VoiceOver. Focus inside is the
      // other way this opens (see the note above), and folding it then would
      // take the focused control off the page mid-read.
      if (el.contains(document.activeElement)) return
      if (el.getBoundingClientRect().top > window.innerHeight - CLOSE_LEFT) closer.current()
    }
    const scrolled = () => {
      if (waiting) return
      waiting = true
      requestAnimationFrame(look)
    }
    window.addEventListener('scroll', scrolled, { passive: true })
    return () => window.removeEventListener('scroll', scrolled)
  }, [phone, open])

  // The swipe. One finger, on a phone: up from the very end of the page pops it
  // open, and once it is open and in sight, down pops it shut.
  //
  // ⚠️ A POP, NOT A PULL (James, 2026-10-03: "pop open when swiping instead of
  // scrolling and pop close when swiping backwards"). The row used to follow
  // the finger at a little over half its speed and decide on the release, which read
  // as the page scrolling. Now the swipe is claimed on its first move and, the
  // moment it has gone `POP_AT`, the row opens (or folds) by itself, the way it
  // does from focus. The rest of that gesture is swallowed, so the page does not
  // scroll under it.
  useEffect(() => {
    if (!phone) return
    let startY: number | null = null
    let startX = 0
    let decided = false
    let popped = false
    /** Some of the open row is on the screen — the same line the fold-back uses. */
    const showing = () => {
      const el = box.current
      return el !== null && el.getBoundingClientRect().top <= window.innerHeight - CLOSE_LEFT
    }

    const start = (e: TouchEvent) => {
      const onSwiper = e.target instanceof Element && e.target.closest('[data-swipe-x]') !== null
      // Opening needs the end of the page; closing only needs the row in sight,
      // because the page can grow under an open row (a taller machine from the
      // Player button) and leave it short of the end.
      const ready = open ? showing() : atEnd()
      startY = !onSwiper && e.touches.length === 1 && ready ? e.touches[0].clientY : null
      startX = e.touches[0]?.clientX ?? 0
      decided = false
      popped = false
    }
    const move = (e: TouchEvent) => {
      if (startY === null || e.touches.length !== 1 || !box.current) return
      // Towards what this swipe would do: up to open, down to close.
      const up = startY - e.touches[0].clientY
      const toward = open ? -up : up
      const dx = e.touches[0].clientX - startX
      if (!decided) {
        if (dx === 0 && up === 0) return
        decided = true
        // The other way, or more across than along: a scroll or a swipe.
        if (toward <= 0 || Math.abs(dx) > toward) {
          startY = null
          return
        }
      }
      // Ours from here — see the note on the rubber band above.
      if (e.cancelable) e.preventDefault()
      if (popped || toward < POP_AT) return
      popped = true
      if (open) {
        // A button just tapped in the row still has focus, and focus inside
        // is the other way in — let it go, or the row could not be focused
        // open again.
        const focused = document.activeElement
        if (focused instanceof HTMLElement && box.current.contains(focused)) focused.blur()
        settle(0)
        closer.current()
      } else {
        stop()
        settle(full())
        opener.current()
      }
    }
    const end = () => {
      startY = null
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
  }, [phone, open, settle, full, stop])

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
