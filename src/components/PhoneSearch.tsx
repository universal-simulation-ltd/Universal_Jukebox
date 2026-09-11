import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

// The library's search box on a PHONE: folded away above the tabs, and pulled
// down into view with your finger (James, 2026-09-11: "hide the search box at
// the top and then peek it and swipe it into view"). It follows the finger —
// at a little over half its speed, like a rubber band — and on release either
// settles open with the keyboard up, or folds back away.
//
// ⚠️ THE HEIGHT IS DRIVEN HERE, ON THE ELEMENT, NOT THROUGH REACT. A drag moves
// it sixty times a second, and routing that through state would re-render the
// whole library page under the finger. So React never writes `height`: the
// class gives the folded start, and `settle` / the drag write the rest.
//
// ⚠️ Opening happens INSIDE `touchend`, with `flushSync` first. iOS only raises
// the keyboard for a focus made during the gesture, so the field has to be
// focusable before the handler returns — not on the next render.

/** How far the finger has to travel for a release to open it. */
const PULL_TO_OPEN = 64
/** The box moves at this share of the finger's travel. */
const RESIST = 0.6

export interface PhoneSearchHandle {
  open(): void
}

interface PhoneSearchProps {
  query: string
  setQuery(query: string): void
  open: boolean
  setOpen(open: boolean): void
}

const PhoneSearch = forwardRef<PhoneSearchHandle, PhoneSearchProps>(function PhoneSearch(
  { query, setQuery, open, setOpen },
  ref,
) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const shown = open || query.trim() !== ''

  const full = () => inner.current?.offsetHeight ?? 52

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
  }, [])

  useLayoutEffect(() => {
    settle(shown ? full() : 0)
  }, [shown, settle])

  const openNow = useCallback(() => {
    flushSync(() => setOpen(true))
    settle(full())
    input.current?.focus()
  }, [setOpen, settle])

  useImperativeHandle(ref, () => ({ open: openNow }), [openNow])

  // The pull. Only from the very top of the page, one finger, on a phone.
  //
  // ⚠️ AND ONLY DOWN (James, 2026-09-11, with a screenshot of the search box
  // open over a shelf: "Don't allow a swipe down as you're swiping left right
  // on the shelves"). A swipe along a shelf drifts down a little, and at the
  // top of the page that drift was a pull. Now a touch that starts on anything
  // that swipes sideways (`data-swipe-x` — the shelves) is never a pull, and
  // the first 10px of any touch decide it: across (or up) and it is not a pull
  // for the rest of that touch.
  useEffect(() => {
    if (shown) return
    const phone = window.matchMedia('(max-width: 639px)')
    let startY: number | null = null
    let startX = 0
    let pulled = 0
    let decided = false
    const start = (e: TouchEvent) => {
      const onSwiper = e.target instanceof Element && e.target.closest('[data-swipe-x]') !== null
      startY = phone.matches && !onSwiper && window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
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
      if (pulled > PULL_TO_OPEN) openNow()
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
  }, [shown, openNow, settle])

  return (
    <div ref={box} className="h-0 overflow-hidden opacity-0 sm:hidden" aria-hidden={!shown}>
      <div ref={inner} className="pb-4">
        <input
          ref={input}
          type="search"
          value={query}
          tabIndex={shown ? 0 : -1}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => {
            if (!query.trim()) setOpen(false)
          }}
          placeholder="Search your library"
          aria-label="Search your library"
          className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
    </div>
  )
})

export default PhoneSearch
