import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../lib/types'
import { ShelfSheet } from './AddToShelf'
import { TickGlyph } from './DoneBubble'
import { useDialogFocus } from '../lib/useDialogFocus'

// What a held artist or album offers (James, 2026-10-11: "Allow long taps e.g.
// on the artist and show things like view albums, view all tracks etc"): play
// or shuffle all of it, queue it, put it on a shelf, then the pages it has.
// The song's own sheet, `TrackOptions`, for a whole artist or album — the same
// look, the same "Plays next" confirmation.

const SAID_MS = 900

export interface CollectionLink {
  label: string
  /** A glyph, as `TrackOptions` uses. */
  icon: string
  go(): void
}

export default function CollectionOptions({ title, subtitle, tracks, links, onClose }: {
  title: string
  subtitle?: string
  tracks: Track[]
  links: CollectionLink[]
  onClose(): void
}) {
  const t = useT()
  const dialogRef = useDialogFocus()
  const playTracks = usePlayerStore((s) => s.playTracks)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
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
    const timer = window.setTimeout(onClose, SAID_MS)
    return () => window.clearTimeout(timer)
  }, [said, onClose])

  if (shelving) return <ShelfSheet tracks={tracks} title={title} onClose={onClose} />

  const run = (action: () => void) => () => {
    action()
    onClose()
  }
  const queue = (mode: 'next' | 'end') => {
    enqueue(tracks, mode)
    const { order, cursor } = usePlayerStore.getState()
    setSaid(mode === 'next' ? t('library.plays_next') : t.plural('library.in_queue', order.length - cursor - 1))
  }
  const row =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
  return (
    <div
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label={t('library.options_for', { title })}
      className="outline-none fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 pt-1 pb-2">
          <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="truncate text-[12.5px] text-slate-500 dark:text-slate-400">
            {[subtitle, t.plural('common.songs', tracks.length)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {said ? (
          <p aria-live="polite" className="flex items-center justify-center gap-2 px-3 py-6 text-[15px] font-semibold text-emerald-700 dark:text-emerald-400">
            <TickGlyph className="h-5 w-5" />
            {said}
          </p>
        ) : (
          <div className="flex flex-col">
            <button type="button" className={row} onClick={run(() => playTracks(tracks, 0))}>
              <span className="w-5 text-center text-orange-600">▶</span>
              {t('library.play_all')}
            </button>
            <button
              type="button"
              className={row}
              onClick={run(() => {
                // Shuffle turns shuffle on and starts, never off (AlbumView's rule).
                if (!shuffle) toggleShuffle()
                playTracks(tracks, Math.floor(Math.random() * tracks.length))
              })}
            >
              <span className="w-5 text-center text-slate-500">⤨</span>
              {t('common.shuffle')}
            </button>
            {/* With nothing playing, "next" and "the end" are both "now". */}
            {queued > 0 && (
              <>
                <button type="button" className={row} onClick={() => queue('next')}>
                  <span className="w-5 text-center text-slate-500">⤴</span>
                  {t('library.play_next')}
                </button>
                <button type="button" className={row} onClick={() => queue('end')}>
                  <span className="w-5 text-center text-slate-500">＋</span>
                  {t('library.add_to_queue')}
                </button>
              </>
            )}
            <button type="button" className={row} onClick={() => setShelving(true)}>
              <span className="w-5 text-center text-slate-500">◎</span>
              {t('library.add_to_a_shelf')}
            </button>
            {links.map((link) => (
              <button key={link.label} type="button" className={row} onClick={run(link.go)}>
                <span className="w-5 text-center text-slate-500">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
