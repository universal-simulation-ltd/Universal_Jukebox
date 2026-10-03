import { useEffect, useState } from 'react'
import { plural } from '../lib/format'
import { navigate } from '../lib/route'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../lib/types'
import { ShelfSheet } from './AddToShelf'
import { TickGlyph } from './DoneBubble'
import { useDialogFocus } from '../lib/useDialogFocus'

// A song's options, from a tap and hold on its record on the Tracks shelf
// (James, 2026-09-27: "remove the play and queue icons instead show options on
// tap and hold of the record"). A plain tap still plays from that record.

/** How long "✓ N songs in queue" shows before the sheet goes. */
const SAID_MS = 900

export default function TrackOptions({ track, onPlay, onClose }: { track: Track; onPlay(): void; onClose(): void }) {
  const dialogRef = useDialogFocus()
  const enqueue = usePlayerStore((s) => s.enqueue)
  const queued = usePlayerStore((s) => s.queue.length)
  const [said, setSaid] = useState<string | null>(null)
  const [shelving, setShelving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    if (said === null) return
    const t = window.setTimeout(onClose, SAID_MS)
    return () => window.clearTimeout(t)
  }, [said, onClose])

  const queue = (mode: 'next' | 'end') => {
    enqueue([track], mode)
    const { order, cursor } = usePlayerStore.getState()
    setSaid(mode === 'next' ? 'Plays next' : `${plural(order.length - cursor - 1, 'song')} in queue`)
  }

  if (shelving) return <ShelfSheet tracks={[track]} title={track.title} onClose={onClose} />

  const row =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
  return (
    <div
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label={`Options for ${track.title}`}
      className="outline-none fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 pt-1 pb-2">
          <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{track.title}</p>
          <p className="truncate text-[12.5px] text-slate-500 dark:text-slate-400">
            {[track.artist ?? track.albumArtist, track.album].filter(Boolean).join(' — ') || 'Unknown artist'}
          </p>
        </div>
        {said ? (
          <p aria-live="polite" className="flex items-center justify-center gap-2 px-3 py-6 text-[15px] font-semibold text-emerald-700 dark:text-emerald-400">
            <TickGlyph className="h-5 w-5" />
            {said}
          </p>
        ) : (
          <div className="flex flex-col">
            <button
              type="button"
              className={row}
              onClick={() => {
                onPlay()
                onClose()
              }}
            >
              <span className="w-5 text-center text-orange-600">▶</span>
              Play now
            </button>
            {/* With nothing playing, "next" and "the end" are both "now". */}
            {queued > 0 && (
              <>
                <button type="button" className={row} onClick={() => queue('next')}>
                  <span className="w-5 text-center text-slate-500">⤴</span>
                  Play next
                </button>
                <button type="button" className={row} onClick={() => queue('end')}>
                  <span className="w-5 text-center text-slate-500">＋</span>
                  Add to queue
                </button>
              </>
            )}
            <button type="button" className={row} onClick={() => setShelving(true)}>
              <span className="w-5 text-center text-slate-500">◎</span>
              Add to a shelf…
            </button>
            <button
              type="button"
              className={row}
              onClick={() => {
                onClose()
                navigate({ view: 'album', albumId: track.albumId })
              }}
            >
              <span className="w-5 text-center text-slate-500">▤</span>
              Go to the album
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
