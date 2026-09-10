import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../lib/types'

// "Add to queue", and proof that it did something (James, 2026-09-10: "need an
// animation, a colour change and text change to 'Added'"). It used to add the
// tracks silently — nothing on screen moved, so it read as a button that had
// not worked, and got pressed again.

/** How long it says "Added" before it is ready to add again. */
const ADDED_MS = 2400

export default function AddToQueue({ tracks }: { tracks: Track[] }) {
  const enqueue = usePlayerStore((s) => s.enqueue)
  const queued = usePlayerStore((s) => s.queue.length)
  const [added, setAdded] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  // Only offered once something is already playing — "add to queue" with an
  // empty queue is just "play", and two buttons that do the same thing is
  // worse than one.
  if (queued === 0 && !added) return null

  const add = () => {
    enqueue(tracks, 'end')
    setAdded(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), ADDED_MS)
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={tracks.length === 0}
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:opacity-50 ${
        added
          ? 'border-emerald-600 bg-emerald-600 text-white motion-safe:animate-[jb-added-pop_380ms_ease-out]'
          : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400'
      }`}
    >
      {added ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
          <path d="M10 4.5v11M4.5 10h11" />
        </svg>
      )}
      <span aria-live="polite">{added ? 'Added' : 'Add to queue'}</span>
    </button>
  )
}
