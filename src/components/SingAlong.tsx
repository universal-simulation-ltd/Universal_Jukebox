import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import SingingMic from './SingingMic'
import { activeLine } from '../lib/lyrics'
import { useKeepAwake } from '../lib/keepAwake'
import { micPhase, nextSungLine } from '../lib/singing'
import { rgba, useSleeveColour } from '../lib/sleeveColour'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { useLibraryStore } from '../stores/libraryStore'
import { useLyricsStore } from '../stores/lyricsStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'

// Sing along: the line being sung, big, on the sleeve's own colour, and
// nothing else (James, 2026-09-28, from the UX review). The lyrics panel is
// for reading and scrolling a song; this is for the room — the phone on the
// table, or propped up with people round it — so it is readable from across
// it and keeps the screen awake while it is up.
//
// ⚠️ A TIMED SHEET ONLY. Its button is drawn only over one (`Lyrics.tsx`);
// untimed words have no "line being sung" to put in the middle.
//
// ⚠️ Portalled to <body> and above z-1000 (the SDK navbar's), so the sticky
// navbar and the player bar cannot sit over it; fully opaque, or the page's
// own words show through the middle, and fixed over the whole screen including the notch (the safe-area
// padding keeps the words and the close button clear of it).

/** How far ahead of the next line its count-in starts, in seconds — as the panel's. */
const COUNT_IN_SEC = 5

export default function SingAlong({ onClose }: { onClose(): void }) {
  const track = usePlayerStore(currentTrack)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const playing = usePlayerStore((s) => s.playing)
  const toggle = usePlayerStore((s) => s.toggle)
  const sheet = useLyricsStore((s) => s.sheet)
  const album = useLibraryStore((s) => (track ? s.albums.find((a) => a.id === track.albumId) : undefined))
  const colour = useSleeveColour(album)
  const reduced = usePrefersReducedMotion()
  useKeepAwake(true)

  const lines = useMemo(() => sheet?.lines ?? [], [sheet])
  const active = activeLine(lines, currentSec)
  const next = nextSungLine(lines, active)
  const phase = micPhase(lines, active, currentSec, playing)
  const nextAt = next >= 0 ? lines[next]?.timeSec : null
  const countIn =
    typeof nextAt === 'number' && nextAt - currentSec > 0 && nextAt - currentSec <= COUNT_IN_SEC
      ? Math.ceil(nextAt - currentSec)
      : null

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  // The song changed to one with no timed words: nothing to sing along to.
  useEffect(() => {
    if (sheet && !sheet.synced) onClose()
  }, [sheet, onClose])

  const base = colour ?? { r: 30, g: 41, b: 59 }
  // Darkened so white words read on any sleeve, bright or pale.
  const deep = { r: Math.round(base.r * 0.35), g: Math.round(base.g * 0.35), b: Math.round(base.b * 0.35) }
  const sung = active >= 0 ? lines[active]?.text ?? '' : ''
  const coming = next >= 0 ? lines[next]?.text ?? '' : ''

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sing along${track ? ` — ${track.title}` : ''}`}
      // ⚠️ Not the document's click: `App.tsx` skips the ceremony on one.
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[1100] flex flex-col text-white"
      style={{
        background: `radial-gradient(120% 90% at 50% 30%, ${rgba(base, 1)} 0%, ${rgba(deep, 1)} 70%)`,
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center gap-3 px-5">
        <SingingMic phase={phase} reduced={reduced} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{track?.title}</p>
          <p className="truncate text-[12.5px] text-white/70">{track?.artist ?? track?.albumArtist ?? ''}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sing along"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" aria-live="polite">
        <p
          key={`sung-${active}`}
          className="max-w-3xl text-[clamp(2rem,8.5vw,4.5rem)] leading-[1.12] font-bold text-balance"
          style={{ animation: reduced ? undefined : 'jb-count-in 420ms ease-out both' }}
        >
          {sung || (active < 0 ? '♪' : ' ')}
        </p>
        <p key={`next-${next}`} className="mt-8 max-w-2xl text-[clamp(1.1rem,4.5vw,2rem)] leading-snug font-medium text-balance text-white/55">
          {coming}
          {countIn !== null && (
            <span key={countIn} className="ml-3 font-semibold text-white/90 tabular-nums" style={{ animation: reduced ? undefined : 'jb-count-in 420ms ease-out both' }}>
              {countIn}
            </span>
          )}
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {playing ? (
            <svg viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M6 3.5h2.4v13H6zM11.6 3.5H14v13h-2.4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-6 w-6 translate-x-[1px]" fill="currentColor" aria-hidden>
              <path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" />
            </svg>
          )}
        </button>
      </div>
    </div>,
    document.body,
  )
}
