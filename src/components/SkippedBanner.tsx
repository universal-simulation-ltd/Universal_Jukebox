import { useState } from 'react'
import { plural } from '../lib/format'
import { usePlayerStore } from '../stores/playerStore'

// "N tracks couldn't play" — the other half of skipping them (James,
// 2026-09-11: "The playing stops and breaks the lock play when a track is no
// longer in library. It should skip to next and when they come back a banner
// saying X tracks couldn't play and if they tap it tells them more").
//
// The music no longer stops for a missing track — the queue moves on, often
// with the phone locked — so this is where the person finds out it happened,
// the next time they look. Tapping it lists which, and why.

export default function SkippedBanner() {
  const skipped = usePlayerStore((s) => s.skipped)
  const dismiss = usePlayerStore((s) => s.dismissSkipped)
  const [open, setOpen] = useState(false)

  if (skipped.length === 0) return null

  return (
    <div
      role="status"
      className="mb-5 rounded-2xl bg-amber-50 px-5 py-3.5 text-[13px] leading-relaxed text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800/60"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 basis-56 text-left font-medium underline-offset-2 hover:underline"
        >
          {plural(skipped.length, 'track')} couldn’t play and {skipped.length === 1 ? 'was' : 'were'} skipped
          <span className="ml-1.5 text-[11px] opacity-70">{open ? 'Hide' : 'Tell me more'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            dismiss()
          }}
          className="shrink-0 rounded-full px-3 py-1 text-[12.5px] font-medium text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          Dismiss
        </button>
      </div>
      {open && (
        <div className="mt-2.5">
          <ul className="space-y-1">
            {skipped.map((s, i) => (
              <li key={`${s.id}-${i}`}>
                <span className="font-medium">{s.title}</span>
                {s.artist ? ` — ${s.artist}` : ''}
                <span className="opacity-75"> · {s.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 opacity-80">
            The music carried on with the next track. A song that has gone from the iPhone’s Music library, or a file
            that was moved or deleted, can’t be played — rescan from Actions, or choose the folder again.
          </p>
        </div>
      )}
    </div>
  )
}
