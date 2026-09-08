import { useState } from 'react'
import Cover from './Cover'
import { clock } from '../lib/format'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'

// The persistent transport, pinned to the bottom of every view.
//
// ⚠️ At the narrowest tier (T6, < 430px) the stage above is HIDDEN and this bar
// IS the app — cover to 52px, controls centred. That is a real mode, not a
// broken layout: an empty stage under a full navbar reads as a bug, so the bar
// grows rather than the page emptying. See §22.10.

export default function PlayerBar() {
  const track = usePlayerStore(currentTrack)
  const playing = usePlayerStore((s) => s.playing)
  const loading = usePlayerStore((s) => s.loading)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const durationSec = usePlayerStore((s) => s.durationSec)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const ceremony = usePlayerStore((s) => s.ceremony)
  const albums = useLibraryStore((s) => s.albums)

  const toggle = usePlayerStore((s) => s.toggle)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const seekTo = usePlayerStore((s) => s.seekTo)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)

  // While dragging, the bar follows the pointer rather than the audio clock —
  // otherwise every `timeupdate` yanks the thumb back under the finger.
  const [scrubbing, setScrubbing] = useState<number | null>(null)

  if (!track) return null
  const album = albums.find((a) => a.id === track.albumId)
  const position = scrubbing ?? currentSec
  const known = Number.isFinite(durationSec) && durationSec > 0

  return (
    <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      {/* The scrub bar spans the full width above the controls: it is the one
          control people aim at without looking, so it gets the whole edge. */}
      <input
        type="range"
        min={0}
        max={known ? durationSec : 1}
        step={0.5}
        value={known ? Math.min(position, durationSec) : 0}
        disabled={!known}
        aria-label="Seek"
        onChange={(e) => setScrubbing(Number(e.target.value))}
        onPointerUp={() => {
          if (scrubbing !== null) seekTo(scrubbing)
          setScrubbing(null)
        }}
        onKeyUp={() => {
          if (scrubbing !== null) seekTo(scrubbing)
          setScrubbing(null)
        }}
        className="jb-scrub block h-1 w-full cursor-pointer appearance-none bg-slate-200 disabled:cursor-default dark:bg-slate-800"
        style={{
          background: known
            ? `linear-gradient(to right, #E05504 ${(position / durationSec) * 100}%, rgb(226 232 240) ${(position / durationSec) * 100}%)`
            : undefined,
        }}
      />

      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 lg:px-8">
        {/* Identity — tap to reach Now Playing, which at T6 is the only way. */}
        <button
          type="button"
          onClick={() => navigate({ view: 'playing' })}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          <Cover album={album} className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {track.title}
            </span>
            <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
              {track.artist ?? 'Unknown artist'}
            </span>
          </span>
        </button>

        {/* Transport. Order is prev / play / next at every width; only the
            shuffle and repeat toggles are shed. */}
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Shuffle" onClick={toggleShuffle} active={shuffle} className="hidden sm:inline-flex">
            <ShuffleGlyph />
          </IconButton>
          <IconButton label="Previous track" onClick={previous}>
            <PrevGlyph />
          </IconButton>
          <button
            type="button"
            onClick={(e) => {
              // ⚠️ `stopPropagation` is load-bearing. `App.tsx` has a
              // document-level "click anywhere to skip the ceremony" handler,
              // and without this the very click that STARTS the ceremony
              // bubbles up and instantly cancels it. Cost twenty minutes in the
              // prototype; the same twenty minutes are available here.
              e.stopPropagation()
              toggle()
            }}
            aria-label={ceremony ? 'Skip the intro' : playing ? 'Pause' : 'Play'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
          >
            {loading && !playing ? <SpinnerGlyph /> : playing ? <PauseGlyph /> : <PlayGlyph />}
          </button>
          <IconButton label="Next track" onClick={next}>
            <NextGlyph />
          </IconButton>
          <IconButton
            label={`Repeat: ${repeat}`}
            onClick={cycleRepeat}
            active={repeat !== 'off'}
            className="hidden sm:inline-flex"
          >
            {repeat === 'one' ? <RepeatOneGlyph /> : <RepeatGlyph />}
          </IconButton>
        </div>

        {/* Times and volume — the last things to go, below 560px (T5). */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
            {clock(position)} / {clock(known ? durationSec : undefined)}
          </span>
          <div className="hidden items-center gap-1.5 lg:flex">
            <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
              {muted || volume === 0 ? <MutedGlyph /> : <VolumeGlyph />}
            </IconButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(e) => setVolume(Number(e.target.value))}
              className="jb-scrub h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  label, onClick, children, active = false, className = '',
}: {
  label: string
  onClick(): void
  children: React.ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] ${
        active
          ? 'text-orange-700 dark:text-orange-400'
          : 'text-slate-600 hover:text-orange-700 dark:text-slate-300 dark:hover:text-orange-400'
      } ${className}`}
    >
      {children}
    </button>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function PlayGlyph() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4 translate-x-[1px]" fill="currentColor" aria-hidden><path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" /></svg>
}
function PauseGlyph() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M6 3.5h2.4v13H6zM11.6 3.5H14v13h-2.4z" /></svg>
}
function SpinnerGlyph() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4 motion-safe:animate-spin" {...stroke} aria-hidden><path d="M10 3a7 7 0 1 0 7 7" /></svg>
}
function PrevGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden><path d="M6 4h2v12H6zM17 4.7v10.6a1 1 0 0 1-1.53.85l-8.2-5.3a1 1 0 0 1 0-1.7l8.2-5.3A1 1 0 0 1 17 4.7Z" /></svg>
}
function NextGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden><path d="M12 4h2v12h-2zM3 4.7v10.6a1 1 0 0 0 1.53.85l8.2-5.3a1 1 0 0 0 0-1.7l-8.2-5.3A1 1 0 0 0 3 4.7Z" /></svg>
}
function ShuffleGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M3 5h3c1 0 2 .5 2.5 1.4l3.5 6.2c.5.9 1.5 1.4 2.5 1.4H17M3 15h3c1 0 2-.5 2.5-1.4l.8-1.4M12.2 7l.8-1.5C13.5 4.6 14.5 4 15.5 4H17" /><path d="m15 2 2 2-2 2M15 12l2 2-2 2" /></svg>
}
function RepeatGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M4 8V7a3 3 0 0 1 3-3h9M16 12v1a3 3 0 0 1-3 3H4" /><path d="m13 1.5 3 2.5-3 2.5M7 13.5 4 16l3 2.5" /></svg>
}
function RepeatOneGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M4 8V7a3 3 0 0 1 3-3h9M16 12v1a3 3 0 0 1-3 3H4" /><path d="m13 1.5 3 2.5-3 2.5M7 13.5 4 16l3 2.5M10 8.2l1.2-.7V12.5" /></svg>
}
function VolumeGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M4 7.5h2.5L10 4.5v11L6.5 12.5H4zM13 7.2a4 4 0 0 1 0 5.6" /></svg>
}
function MutedGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M4 7.5h2.5L10 4.5v11L6.5 12.5H4zM13 8l4 4M17 8l-4 4" /></svg>
}
