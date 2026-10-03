import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import Deck from './Deck'
import { ModeButton } from './ModeButton'
import SleepButton from './SleepButton'
import LevelButton from './LevelButton'
import { useKeepAwake } from '../lib/keepAwake'
import { rgba, useSleeveColour } from '../lib/sleeveColour'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useDialogFocus } from '../lib/useDialogFocus'

// Bedside: the record turning, the time, the song, and the sleep timer — on
// black, with the screen held on, for a phone on a bedside table or an iPad on
// a shelf (James, 2026-09-28, from the UX review: "a Now spinning bedside
// mode"). Everything else in the app is out of the way until it is closed.
//
// ⚠️ DIM ON PURPOSE. It is for a dark room: near-black ground, the sleeve's
// colour only as a faint glow, grey type. A bright screen by the bed is the
// thing this exists to avoid.
//
// ⚠️ `dark` ON THE OVERLAY, whatever the app's theme, so the buttons borrowed
// from the Now Playing row (`SleepButton`) draw their dark-mode colours here.
//
// ⚠️ The deck is the NON-ceremonial one — a picture of the state (the arm down
// while playing), with no countdown, no tonearm to grab and no tips. The stage
// deck on Now Playing, underneath, still owns all of that.

/**
 * Whether Bedside is up — in a STORE, not in the button, and drawn by
 * `BedsideHost` at the top of `App` rather than beside the button.
 *
 * ⚠️ TURNING THE PHONE USED TO CLOSE IT (James, 2026-09-29: "Bedside mode
 * should stay in mode after rotate instead of coming out"). The button lives in
 * the Now Playing row, which on a phone is folded inside `FoldUp` and wider than
 * one is not — so lying the phone down swaps the row's wrapper, React builds
 * the row afresh, and a `useState` in the button went with it. Held here, the
 * row can be rebuilt as often as it likes.
 */
const useBedside = create<{ open: boolean }>(() => ({ open: false }))
const close = () => useBedside.setState({ open: false })

export function BedsideHost() {
  const open = useBedside((s) => s.open)
  return open ? <Bedside onClose={close} /> : null
}

export function BedsideButton() {
  return (
    <>
      <ModeButton
        label="Bedside"
        ariaLabel="Bedside: the record, the time and the sleep timer, dimmed, with the screen kept on"
        onClick={() => useBedside.setState({ open: true })}
      >
        <BedsideGlyph />
      </ModeButton>
    </>
  )
}

function useClock(): string {
  const format = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const [now, setNow] = useState(format)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(format()), 10_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

function Bedside({ onClose }: { onClose(): void }) {
  const dialogRef = useDialogFocus()
  const track = usePlayerStore(currentTrack)
  const playing = usePlayerStore((s) => s.playing)
  const toggle = usePlayerStore((s) => s.toggle)
  const album = useLibraryStore((s) => (track ? s.albums.find((a) => a.id === track.albumId) : undefined))
  const colour = useSleeveColour(album)
  const time = useClock()
  useKeepAwake(true)

  // Lying down the record sits beside the words; standing, above them.
  const [size, setSize] = useState(() => deckSize())
  useEffect(() => {
    const resize = () => setSize(deckSize())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label="Bedside"
      // ⚠️ Not the document's click: `App.tsx` skips the ceremony on one.
      onClick={(e) => e.stopPropagation()}
      className="outline-none dark fixed inset-0 z-[1100] flex flex-col bg-black text-slate-400"
      style={{
        backgroundImage: colour ? `radial-gradient(70% 55% at 50% 45%, ${rgba(colour, 0.16)} 0%, transparent 70%)` : undefined,
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex justify-end px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close bedside"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 landscape:flex-row landscape:gap-12">
        {/* Dimmed with it: the record is a night light, not a lamp. */}
        <div className="opacity-80">
          <Deck album={album} size={size} />
        </div>
        <div className="text-center landscape:text-left">
          <p className="text-[clamp(3.5rem,16vw,7rem)] leading-none font-light text-slate-300 tabular-nums">{time}</p>
          <p className="mt-5 truncate text-[16px] font-medium text-slate-400">{track?.title ?? 'Nothing playing'}</p>
          <p className="mt-1 truncate text-[14px] text-slate-500">{track?.artist ?? track?.albumArtist ?? ''}</p>
          <div className="mt-6 flex items-center justify-center gap-4 landscape:justify-start">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              {playing ? (
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M6 3.5h2.4v13H6zM11.6 3.5H14v13h-2.4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-5 w-5 translate-x-[1px]" fill="currentColor" aria-hidden>
                  <path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" />
                </svg>
              )}
            </button>
            <SleepButton />
            {/* Quiet (James, 2026-09-29: "Add the quiet control shortcut to the
                sleep screen") — the one that steps the music down for bed,
                the same button as in the row under the song. It draws nothing
                where the engine cannot turn the music down (`quietUnavailable`). */}
            <LevelButton kind="quiet" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function deckSize(): number {
  if (typeof window === 'undefined') return 240
  const { innerWidth: w, innerHeight: h } = window
  const landscape = w > h
  return Math.round(Math.max(140, Math.min(360, landscape ? h * 0.55 : Math.min(w * 0.6, h * 0.36))))
}

/**
 * A bed — not a moon, which is Sleep's, the button beside it (the two read as
 * one button twice once Settings showed them side by side, 2026-09-29).
 */
export function BedsideGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 5v11M2.5 12.5h15V16M17.5 12.5v-1.8a2.7 2.7 0 0 0-2.7-2.7H9v4.5" />
      <circle cx="5.8" cy="9.8" r="1.6" />
    </svg>
  )
}
