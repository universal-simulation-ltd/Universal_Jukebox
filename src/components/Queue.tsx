import { usePlayerStore } from '../stores/playerStore'

// What is coming up.
//
// ⚠️ This list walks `order`, not `queue`. The queue is the set of tracks; the
// order is the sequence they play in, and shuffle permutes the order while
// leaving the queue alone. Rendering `queue` directly would show the album's
// running order while playing something else entirely — a list that is wrong
// precisely when someone opens it to find out what is next.

export default function Queue() {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)

  if (order.length === 0) return null

  // Only what is still to come. A queue view that lists what has already played
  // is a history, and the two want different screens.
  const upcoming = order.slice(cursor + 1)

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Up next
        </h2>
        <button
          type="button"
          onClick={clearQueue}
          className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          Clear
        </button>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Nothing after this one.
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 dark:divide-slate-800">
          {upcoming.map((queueIndex, i) => {
            const track = queue[queueIndex]
            if (!track) return null
            // The index this row occupies in `order` — which is what
            // `removeFromQueue` takes, and getting it wrong removes a different
            // track than the one whose button was pressed.
            const orderIndex = cursor + 1 + i
            return (
              <li key={`${track.id}-${orderIndex}`} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-slate-900 dark:text-slate-100">
                    {track.title}
                  </span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {track.artist ?? 'Unknown artist'}
                  </span>
                </span>
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
    </section>
  )
}
