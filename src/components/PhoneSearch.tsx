import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { PHONE_QUERY, PullDrawer, openThenFocus, useMediaQuery } from '@unisim/sdk'
import { useT } from '../i18n'

// The library's search box on a PHONE: folded away above the tabs, and pulled
// down into view with your finger (James, 2026-09-11: "hide the search box at
// the top and then peek it and swipe it into view"). It follows the finger —
// at a little over half its speed, like a rubber band — and on release either
// settles open with the keyboard up, or folds back away.
//
// The gesture is the SDK's `PullDrawer` (@unisim/sdk ≥ 0.197, moved there on
// 2026-10-19 from this file and the phone app's `native/PullDrawer.tsx`), and
// it keeps every rule this file used to spell out:
//   - The height is driven on the element, not through React, so a drag does
//     not re-render the whole library page under the finger.
//   - Only from the very top of the page, one finger, on a phone — AND ONLY
//     DOWN (James, 2026-09-11, with a screenshot of the search box open over a
//     shelf: "Don't allow a swipe down as you're swiping left right on the
//     shelves"). A touch that starts on anything that swipes sideways
//     (`data-swipe-x` — the shelves) is never a pull, and the first 10px of
//     any touch decide it: across (or up) and it is not a pull for the rest of
//     that touch.
//
// ⚠️ Opening happens INSIDE `touchend` (PullDrawer calls `onOpen` from it),
// and `openThenFocus` renders it open first. iOS only raises the keyboard for
// a focus made during the gesture, so the field has to be focusable before the
// handler returns — not on the next render.

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
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const shown = open || query.trim() !== ''
  const phone = useMediaQuery(PHONE_QUERY)

  const openNow = useCallback(() => openThenFocus(() => setOpen(true), input, {}), [setOpen])

  useImperativeHandle(ref, () => ({ open: openNow }), [openNow])

  // The way out. Clearing alone would leave the box open over the library with
  // nothing in it, so the X does both: empties the field and folds it away.
  const clearAndClose = useCallback(() => {
    setQuery('')
    setOpen(false)
    input.current?.blur()
  }, [setQuery, setOpen])

  return (
    <PullDrawer shown={shown} onOpen={openNow} pullable={phone} containOverscroll={phone} className="h-0 opacity-0 sm:hidden" innerClassName="pb-4">
      <div className="relative">
        <input
          ref={input}
          type="search"
          value={query}
          tabIndex={shown ? 0 : -1}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Escape is the keyboard's X.
            if (e.key === 'Escape') clearAndClose()
          }}
          onBlur={() => {
            if (!query.trim()) setOpen(false)
          }}
          placeholder={t('library.search_your_library')}
          aria-label={t('library.search_your_library')}
          className="w-full rounded-full border border-slate-300 bg-white py-2 pr-11 pl-4 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <ClearButton onClear={clearAndClose} tabIndex={shown ? 0 : -1} />
      </div>
    </PullDrawer>
  )
})

/**
 * The X inside the box: clears what you typed and folds the box away.
 *
 * ⚠️ IT PREVENTS THE DEFAULT ON `mousedown`, and that is load-bearing. The
 * field loses focus on mousedown, which runs its `onBlur` — and on an empty box
 * that blur folds the box away, taking this button out from under the finger
 * before the click ever lands. Keeping focus on the field until our own click
 * handler runs is what makes the X work on an empty box as well as a full one.
 */
function ClearButton({ onClear, tabIndex }: { onClear(): void; tabIndex: number }) {
  const t = useT()
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClear}
      tabIndex={tabIndex}
      aria-label={t('library.clear_and_close_search')}
      title={t('library.clear_and_close')}
      className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-orange-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-orange-400"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
      </svg>
    </button>
  )
}

export default PhoneSearch
