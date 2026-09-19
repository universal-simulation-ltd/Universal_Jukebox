import { useEffect, useState } from 'react'
import { plural } from '../lib/format'
import { NAME_MAX, NEW_SHELF, shelfName } from '../lib/shelves'
import { useShelvesStore } from '../stores/shelvesStore'
import type { Track } from '../lib/types'
import { ModeButton } from './ModeButton'

// Put songs on a Jukebox shelf from anywhere (James, 2026-09-11: the Jukebox
// tab's extras — "yes"): a song's row, an album's or artist's page, the song on
// Now Playing. Opens a sheet of your shelves — a tick where the song already is
// — and a new shelf. One song toggles on and off; several (an album) are added,
// skipping any already there.
//
// ⚠️ A NEW SHELF STARTED HERE ASKS WHAT TO CALL IT (James, 2026-09-19: "when
// adding a new shelf to the jukebox directly from adding a track ask the user
// to name that shelf"), and it is the only place that has to. Start a shelf in
// the Jukebox TAB and it appears in front of you with its name right there to
// tap; start one from here and the song lands on a shelf you never see, called
// "Shelf 4" until you go looking for it. The name is asked for at the one
// moment you know what the shelf is FOR.
//
// Asked for, not demanded: leaving it blank makes the shelf anyway, and it
// keeps the positional "Shelf N" the rest of the app falls back to — the point
// is to offer the name, not to stand between the song and the shelf.

export default function AddToShelf({ tracks, variant }: { tracks: Track[]; variant: 'pill' | 'icon' | 'mode' }) {
  const [open, setOpen] = useState(false)
  if (tracks.length === 0) return null
  const one = tracks.length === 1 ? tracks[0] : null
  const label = one ? `Add “${one.title}” to a shelf` : `Add ${plural(tracks.length, 'song')} to a shelf`
  return (
    <>
      {variant === 'mode' ? (
        // In the row of round buttons on Now Playing (`PlayModes`).
        <ModeButton label="Add to shelf" ariaLabel={label} onClick={() => setOpen(true)}>
          <ShelfGlyph />
        </ModeButton>
      ) : variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
        >
          <ShelfGlyph />
          Add to shelf
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          title={label}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E05504] dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-orange-400"
        >
          <ShelfGlyph />
        </button>
      )}
      {open && <ShelfSheet tracks={tracks} title={one ? one.title : plural(tracks.length, 'song')} onClose={() => setOpen(false)} />}
    </>
  )
}

function ShelfSheet({ tracks, title, onClose }: { tracks: Track[]; title: string; onClose(): void }) {
  const shelves = useShelvesStore((s) => s.shelves)
  const toggle = useShelvesStore((s) => s.toggle)
  const add = useShelvesStore((s) => s.add)
  const rename = useShelvesStore((s) => s.rename)
  const ids = tracks.map((t) => t.id)
  const one = ids.length === 1 ? ids[0] : null
  /** The name being typed for a new shelf — `null` until "New shelf" is tapped. */
  const [draft, setDraft] = useState<string | null>(null)
  /** What the shelf would be called if it is left unnamed — the placeholder. */
  const nextName = `Shelf ${shelves.length + 1}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const put = (shelfId: string) => (one ? toggle(shelfId, one) : add(shelfId, ids))

  // The song goes on first and the name is written on the shelf it made: the
  // shelf has no id until it has a song, so there is nothing to name before.
  const start = () => {
    const shelfId = put(NEW_SHELF)
    if (draft?.trim()) rename(shelfId, draft)
    setDraft(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${title} to a shelf`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Add to a shelf</p>
            <p className="truncate text-[12.5px] text-slate-500 dark:text-slate-400">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1 text-[13px] font-semibold text-white shadow-sm"
          >
            Done
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {shelves.map((shelf, i) => {
            const on = ids.every((id) => shelf.trackIds.includes(id))
            return (
              <li key={shelf.id}>
                <button
                  type="button"
                  onClick={() => put(shelf.id)}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">{shelfName(shelf, i)}</span>
                    <span className="block text-[12px] text-slate-500 dark:text-slate-400">{plural(shelf.trackIds.length, 'song')}</span>
                  </span>
                  <Tick on={on} />
                </button>
              </li>
            )
          })}
          <li>
            {draft === null ? (
              <button
                type="button"
                onClick={() => setDraft('')}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
              >
                <span className="min-w-0 flex-1 text-[14px] font-medium">New shelf…</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-current text-[15px]" aria-hidden>
                  +
                </span>
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  start()
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-2"
              >
                <input
                  autoFocus
                  value={draft}
                  maxLength={NAME_MAX}
                  onChange={(e) => setDraft(e.target.value)}
                  // ⚠️ Escape backs out of the NAME, not the sheet. The sheet
                  // listens for Escape on the document, so without stopping it
                  // here one press would throw the whole thing away — and the
                  // song with it.
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setDraft(null)
                    }
                  }}
                  placeholder={nextName}
                  aria-label="Name for the new shelf"
                  className="min-w-0 flex-1 rounded-lg border border-orange-400 bg-white px-2.5 py-1.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm"
                >
                  Create
                </button>
              </form>
            )}
          </li>
        </ul>
      </div>
    </div>
  )
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] ${
        on ? 'bg-orange-500 text-white' : 'border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'
      }`}
      aria-hidden
    >
      {on ? '✓' : '+'}
    </span>
  )
}

/** A record standing on a shelf. */
export function ShelfGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <circle cx="10" cy="8.5" r="5" />
      <circle cx="10" cy="8.5" r="1.3" />
      <path d="M3 16.5h14" />
    </svg>
  )
}
