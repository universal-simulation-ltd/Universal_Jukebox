import { useCallback, useImperativeHandle, useRef, type Ref } from 'react'
import { PHONE_QUERY, PullDrawer, openThenFocus, useMediaQuery } from '@unisim/sdk'
import { useT } from '../i18n'

// A search box for the page you are ALREADY on — one record, rather than the
// whole library (James, 2026-09-15: "Album scroll down for search within").
// Folded away above the track list, and pulled down into view with your finger.
//
// `PhoneSearch` is the same idea for the library's tabs, and the gesture here
// is deliberately identical to it: the box follows the finger at a little over
// half its speed, a release past `PULL_TO_OPEN` settles it open with the
// keyboard up, and anything less folds it back. A person who has found the
// library's search box has found this one.
//
// ⚠️ Three differences from `PhoneSearch`, all because this one is not on the
// library page.
//   - IT IS NOT PHONE-ONLY. A pull is a phone gesture, so wider than a phone
//     there is nothing to pull — but the search itself is just as useful with a
//     mouse, which is what `FindWithinHandle.open()` and the button on the page
//     that calls it are for. The box is folded at every width and opened by
//     either route.
//   - IT CLOSES WHEN IT IS EMPTIED AND LEFT. The library's search survives
//     because the query drives the tab counts and the whole page under it; here
//     an empty box over a full track list is a row of nothing.
//   - THE TWO NEVER BOTH LISTEN. `PhoneSearch` is mounted only on the library
//     views and this only on a record, so the two pulls cannot fight over one
//     touch. If that ever stops being true, this is the note that says why it
//     mattered.
//
// The gesture is the SDK's `PullDrawer` (@unisim/sdk ≥ 0.197, 2026-10-19),
// the same one `PhoneSearch` and the phone app use; `pullable` limits the
// pull to a phone while the box stays folded at every width.

export interface FindWithinHandle {
  open(): void
}

export default function FindWithin({
  query, setQuery, open, setOpen, label, placeholder, handle,
}: {
  query: string
  setQuery(query: string): void
  open: boolean
  setOpen(open: boolean): void
  /** What is being searched, for the screen reader and the placeholder. */
  label: string
  placeholder: string
  handle?: Ref<FindWithinHandle>
}) {
  const input = useRef<HTMLInputElement>(null)
  const shown = open || query.trim() !== ''
  const phone = useMediaQuery(PHONE_QUERY)

  // ⚠️ Opening happens INSIDE `touchend` (or the button's click), rendered
  // open first — iOS only raises the keyboard for a focus made during the
  // gesture, so the field has to be focusable before the handler returns
  // rather than on the next render.
  const openNow = useCallback(() => openThenFocus(() => setOpen(true), input, {}), [setOpen])

  useImperativeHandle(handle, () => ({ open: openNow }), [openNow])

  // The way out. Clearing alone would leave the box open over the track list
  // with nothing in it, so the X does both: empties the field and folds it
  // away. Escape is the keyboard's version of the same thing.
  const clearAndClose = useCallback(() => {
    setQuery('')
    setOpen(false)
    input.current?.blur()
  }, [setQuery, setOpen])

  // The pull: only from the very top of the page, one finger, on a phone, only
  // down, and never off something that swipes sideways (`data-swipe-x`) — a
  // record page has a cover on it that people drag.
  return (
    <PullDrawer shown={shown} onOpen={openNow} pullable={phone} containOverscroll={phone} className="h-0 opacity-0" innerClassName="pb-4">
      <div className="relative">
        <SearchGlyph />
        <input
          ref={input}
          type="search"
          value={query}
          tabIndex={shown ? 0 : -1}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Escape clears and folds it away — the way out without reaching
            // for the X, or for the button that opened it.
            if (e.key === 'Escape') clearAndClose()
          }}
          onBlur={() => {
            if (!query.trim()) setOpen(false)
          }}
          placeholder={placeholder}
          aria-label={label}
          className="w-full rounded-full border border-slate-300 bg-white py-2 pr-11 pl-9 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <ClearButton onClear={clearAndClose} tabIndex={shown ? 0 : -1} />
      </div>
    </PullDrawer>
  )
}

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

function SearchGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9 3.5a5.5 5.5 0 1 0 3.38 9.84l3.14 3.14a1 1 0 0 0 1.42-1.42l-3.14-3.14A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
    </svg>
  )
}
