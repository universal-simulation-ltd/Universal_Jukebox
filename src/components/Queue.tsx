import { useState } from 'react'
import { usePlayerStore } from '../stores/playerStore'

// What is coming up.
//
// ⚠️ This list walks `order`, not `queue`. The queue is the set of tracks; the
// order is the sequence they play in, and shuffle permutes the order while
// leaving the queue alone. Rendering `queue` directly would show the album's
// running order while playing something else entirely — a list that is wrong
// precisely when someone opens it to find out what is next.
//
// Rows are clickable, and `jumpTo` takes an index into `order` for that same
// reason — see the note on `orderIndex` below, which was already the hard part.
//
// ⚠️ OPENED FROM THE "+N" RECORD, AND TEN AT A TIME (James, 2026-09-11: "Only
// show the up next when they click the + X record … if the up next section has
// too many show 'Show more' and then show 10 more each time and 'show all' for
// the full queue"). A shuffled library is a queue of thousands, and all of
// them as rows made Now Playing a page you scrolled for minutes.

/** Rows shown at first, and added by each "Show more". */
const PAGE = 10

export default function Queue({ onHide }: { onHide?: () => void }) {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const [limit, setLimit] = useState(PAGE)

  if (order.length === 0) return null

  // Only what is still to come. A queue view that lists what has already played
  // is a history, and the two want different screens.
  const upcoming = order.slice(cursor + 1)
  const shown = upcoming.slice(0, limit)
  const hidden = upcoming.length - shown.length

  return (
    <section id="jb-up-next" className="mt-12">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Up next <span className="font-normal tabular-nums normal-case opacity-80">({upcoming.length.toLocaleString()})</span>
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={clearQueue}
            className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
          >
            Clear
          </button>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
            >
              Hide
            </button>
          )}
        </div>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Nothing after this one.
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 dark:divide-slate-800">
          {shown.map((queueIndex, i) => {
            const track = queue[queueIndex]
            if (!track) return null
            // The index this row occupies in `order` — which is what
            // `removeFromQueue` takes, and getting it wrong removes a different
            // track than the one whose button was pressed.
            const orderIndex = cursor + 1 + i
            return (
              <li key={`${track.id}-${orderIndex}`} className="flex items-center gap-3 py-2.5">
                {/* The row is the control: this list is the only place the rest
                    of the queue is visible, and reaching track six meant
                    pressing next five times. */}
                <button
                  type="button"
                  onClick={() => jumpTo(orderIndex)}
                  aria-label={`Play ${track.title} now`}
                  className="min-w-0 flex-1 rounded-md text-left transition hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] dark:hover:text-orange-400"
                >
                  <span className="block truncate text-[13.5px] text-slate-900 dark:text-slate-100">
                    {track.title}
                  </span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {track.artist ?? 'Unknown artist'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(orderIndex)}
                  aria-label={`Remove ${track.title} from the queue`}
                  className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] dark:text-slate-500 dark:hover:text-red-400"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="m5 5 10 10M15 5 5 15" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {hidden > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-orange-400"
          >
            Show {Math.min(PAGE, hidden)} more
          </button>
          <button
            type="button"
            onClick={() => setLimit(Number.POSITIVE_INFINITY)}
            className="rounded-full px-4 py-1.5 text-[13px] font-medium text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
          >
            Show all {upcoming.length.toLocaleString()}
          </button>
        </div>
      )}
    </section>
  )
}
