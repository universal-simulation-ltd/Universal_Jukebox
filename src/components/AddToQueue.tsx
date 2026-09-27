import { usePlayerStore } from '../stores/playerStore'
import { plural } from '../lib/format'
import { DoneBubble, TickGlyph } from './DoneBubble'
import { useDone } from '../lib/useDone'
import type { Track } from '../lib/types'

// "Add to queue", and proof that it did something (James, 2026-09-10: "need an
// animation, a colour change and text change to 'Added'"). It used to add the
// tracks silently — nothing on screen moved, so it read as a button that had
// not worked, and got pressed again.
//
// And since 2026-09-27 it says how many are now waiting ("show tick and 'X in
// queue'"): the pill in its own words, the round and row icons in a bubble.

/**
 * `pill`: an icon and words (the artist page). `round`: the + alone, the size
 * of the pills beside it (the album page). `icon`: a small one at the end of a
 * song's row.
 */
export default function AddToQueue({ tracks, variant = 'pill' }: { tracks: Track[]; variant?: 'pill' | 'round' | 'icon' }) {
  const enqueue = usePlayerStore((s) => s.enqueue)
  const queued = usePlayerStore((s) => s.queue.length)
  const { said, say } = useDone()

  // Only offered once something is already playing — "add to queue" with an
  // empty queue is just "play", and two buttons that do the same thing is
  // worse than one.
  if (queued === 0 && !said) return null

  const add = () => {
    enqueue(tracks, 'end')
    const { order, cursor } = usePlayerStore.getState()
    say(`${plural(order.length - cursor - 1, 'song')} in queue`)
  }
  const label = tracks.length === 1 ? `Add “${tracks[0].title}” to the queue` : 'Add to queue'
  const done = said !== null

  if (variant === 'icon') {
    return (
      <span className="relative shrink-0">
        <button
          type="button"
          onClick={add}
          aria-label={label}
          title="Add to queue"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E05504] ${
            done
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 hover:bg-slate-100 hover:text-orange-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-orange-400'
          }`}
        >
          {done ? <TickGlyph className="h-4 w-4" /> : <QueueGlyph />}
        </button>
        <DoneBubble text={said} align="end" />
      </span>
    )
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={add}
        disabled={tracks.length === 0}
        aria-label={variant === 'round' ? label : undefined}
        title={variant === 'round' ? 'Add to queue' : undefined}
        className={`inline-flex items-center rounded-full border text-sm font-medium transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:opacity-50 ${
          variant === 'round' ? 'h-[38px] w-[38px] justify-center' : 'gap-2 px-5 py-2'
        } ${
          done
            ? 'border-emerald-600 bg-emerald-600 text-white motion-safe:animate-[jb-added-pop_380ms_ease-out]'
            : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400'
        }`}
      >
        {done ? <TickGlyph className="h-4 w-4" /> : <QueueGlyph />}
        {variant === 'pill' && <span aria-live="polite">{said ?? 'Add to queue'}</span>}
      </button>
      {variant === 'round' && <DoneBubble text={said} />}
    </span>
  )
}

export function QueueGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  )
}
