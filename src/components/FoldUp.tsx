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
//     step of the pull also moves the page down by exactly as much as the box
//     grew, and so does the opening.
//   - The pull is decided on the FIRST move, and claimed then (a non-passive
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
//     handler now only records where the finger is; a single `requestAnimation-
//     Frame` does the drawing, so the page moves once per frame.
//   - The page used to be kept at its end by slamming it to
//     `scrollHeight` every frame, during the pull and again for the whole of
//     the opening. That reads a layout that is still moving and fights both
//     iOS's rubber band and the momentum left over from the flick, and the two
//     take turns winning for as long as it lasts — "until it's fully open".
//     Now the end is anchored ONCE, on the first frame of the pull, and after
//     that the page is moved by `scrollBy` by the exact number of pixels the
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

/** How far the finger has to travel for a release to open it. */
const PULL_TO_OPEN = 64
/** The row moves at this share of the finger's travel. */
const RESIST = 0.6
/** How long the opening takes — and so how long the page is moved along with it. */
const OPEN_MS = 240
/** Near enough the end of the page to count as at it: a fractional scroll, a hair of bounce. */
const AT_END = 2
/**
 * How far from the end of the page counts as having scrolled back up.
 *
 * ⚠️ Shorter than the row is tall, on purpose: it folds while it is still
 * partly on screen, so what you see is the box closing rather than the page
 * quietly rearranging itself somewhere below. And comfortably more than a
 * thumb's jitter or iOS's rubber band at the bottom, which goes the other way
 * and reads as a NEGATIVE gap here.
 */
const CLOSE_GAP = 96

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
      const gap = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
      if (gap > CLOSE_GAP) closer.current()
    }
    const scrolled = () => {
      if (waiting) return
      waiting = true
      requestAnimationFrame(look)
    }
    window.addEventListener('scroll', scrolled, { passive: true })
    return () => window.removeEventListener('scroll', scrolled)
  }, [phone, open])

  // The pull. Only from the very end of the page, one finger, on a phone.
  useEffect(() => {
    if (!phone || open) return
    let startY: number | null = null
    let startX = 0
    let pulled = 0
    let decided = false
    /** The row's full height, read once per gesture rather than on every move. */
    let tall = 1
    /** The height the box is drawn at, and whether the end has been anchored yet. */
    let at = 0
    let anchored = false
    /** The frame the next draw is waiting on — see the one-per-frame note above. */
    let painting = 0

    const draw = () => {
      painting = 0
      const el = box.current
      if (!el) return
      const peek = Math.round(Math.max(0, Math.min(tall, pulled * RESIST)))
      el.style.height = `${peek}px`
      el.style.opacity = String(Math.min(1, peek / tall))
      if (!anchored) {
        // The one scroll of the gesture that is not a delta: it puts the page
        // on its true end, bounce and fractions and all, for the rest to
        // measure from.
        anchored = true
        window.scrollTo(0, document.documentElement.scrollHeight)
      } else if (peek !== at) {
        window.scrollBy(0, peek - at)
      }
      at = peek
    }
    const wake = () => {
      if (!painting) painting = requestAnimationFrame(draw)
    }
    const rest = () => {
      if (painting) cancelAnimationFrame(painting)
      painting = 0
    }

    const start = (e: TouchEvent) => {
      const onSwiper = e.target instanceof Element && e.target.closest('[data-swipe-x]') !== null
      startY = !onSwiper && e.touches.length === 1 && atEnd() ? e.touches[0].clientY : null
      startX = e.touches[0]?.clientX ?? 0
      pulled = 0
      decided = false
      if (startY === null) return
      // A pull that starts while the last one is still folding back takes over
      // from where it left it.
      stop()
      tall = full()
      at = box.current?.offsetHeight ?? 0
      anchored = false
    }
    const move = (e: TouchEvent) => {
      if (startY === null || e.touches.length !== 1 || !box.current) return
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
      wake()
    }
    const end = () => {
      if (startY === null) return
      startY = null
      rest()
      if (pulled > PULL_TO_OPEN) {
        settle(full())
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
      rest()
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
