import { useEffect, useRef, useState } from 'react'
import Cover from './Cover'
import { clock } from '../lib/format'
import { currentRoute, navigate } from '../lib/route'
import { canSetElementVolume } from '../lib/volumeSupport'
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
  const ceremony = usePlayerStore((s) => s.ceremony)
  const ceremonyCount = usePlayerStore((s) => s.ceremonyCount)
  const albums = useLibraryStore((s) => s.albums)

  const toggle = usePlayerStore((s) => s.toggle)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const seekTo = usePlayerStore((s) => s.seekTo)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)

  // While dragging, the bar follows the pointer rather than the audio clock —
  // otherwise every `timeupdate` yanks the thumb back under the finger.
  const [scrubbing, setScrubbing] = useState<number | null>(null)

  if (!track) return null
  const album = albums.find((a) => a.id === track.albumId)
  const position = scrubbing ?? currentSec
  const known = Number.isFinite(durationSec) && durationSec > 0

  return (
    // ⚠️ `pb-[env(safe-area-inset-bottom)]` is the bottom half of the same rule
    // the page wrapper carries at the top (see `App.tsx`). This bar is
    // `sticky bottom-0` and the native shell runs with `viewport-fit=cover` and
    // `contentInset: 'never'`, so without it the transport sits UNDER the home
    // indicator on a phone — the play button and the scrub bar are the things
    // that end up beneath it. 0 on the web, so nothing changes there.
    <div data-jb-playerbar className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
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
          // From anywhere, to Now Playing — which opens at its top
          // (`PAGE_VIEWS` in App.tsx). From Now Playing itself, to the ALBUM,
          // as tapping the record on the deck does (James, 2026-09-11: "if on
          // animation page and then click the art on the media player, take
          // them to the album view (like clicking the animation)").
          onClick={() => {
            if (currentRoute().view !== 'playing') navigate({ view: 'playing' })
            else if (album) navigate({ view: 'album', albumId: album.id })
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          {/* ⚠️ THE COUNTDOWN, OVER THE SLEEVE (James, 2026-09-10: "you also need
              to see the 3,2,1 in the mini player … so you know it's working").
              The ceremony's numerals otherwise render only on Now Playing, so
              anybody who started an album without being on that screen saw
              about two seconds of apparent nothing before the music began —
              which reads as a button that did not work. */}
          <span className="relative shrink-0">
            <Cover album={album} className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
            {ceremony && ceremonyCount !== null && (
              <span
                key={ceremonyCount}
                aria-live="polite"
                className="absolute inset-0 grid place-items-center rounded-xl bg-slate-950/55 text-[22px] font-semibold tabular-nums text-white"
              >
                {ceremonyCount}
              </span>
            )}
          </span>
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
            shuffle toggle is shed. No repeat button (James, 2026-09-11:
            "remove the repeat option from the mini player"). */}
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
          <QueuePeek />
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
            {/* ⚠️ The same capability check as the Settings fade sliders
                (`lib/volumeSupport.ts`), asked of the ENGINE rather than the
                platform. Where assigning `element.volume` is refused, this
                slider would move and change nothing you can hear — so it says
                where the volume is instead. Mute STAYS: it goes through
                `element.muted`, not `volume`, and works on those engines too.
                A current iPhone answers yes and keeps the slider. */}
            {canSetElementVolume() ? (
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
            ) : (
              <span
                className="max-w-[7.5rem] text-[11px] leading-tight text-slate-500 dark:text-slate-400"
                title="This device doesn’t let an app set the playback volume — that belongs to its own volume buttons."
              >
                Volume is on your device’s buttons
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The queue at a glance, from the transport.
 *
 * ⚠️ This is NOT a smaller `Queue`. That list is a deliberate look FORWARD —
 * "a queue view that lists what has already played is a history, and the two
 * want different screens". This one is the exception that proves it: opened
 * from the bar, mid-track, the question is usually "what was that one before?"
 * as often as "what's next", so it shows a couple either side of the cursor and
 * says where you are in them. `order.slice(0, cursor)` gets its first use here.
 *
 * It matters most at T6 (< 430px), where the stage is hidden and the bar IS the
 * app — there, this is the only way to see the queue at all.
 */
const BEHIND = 2
const AHEAD = 4

function QueuePeek() {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // `pointerdown`, NOT `click`: App.tsx puts a document-level `click`
    // listener up while the ceremony is running, and sharing the event type
    // would tangle closing this panel with skipping the intro.
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  if (order.length === 0) return null

  const from = Math.max(0, cursor - BEHIND)
  const to = Math.min(order.length, cursor + AHEAD + 1)
  const window = order.slice(from, to).map((queueIndex, i) => ({
    track: queue[queueIndex],
    // The index in `order` — what `jumpTo` takes, and the one number that is
    // wrong in every obvious way of writing this.
    orderIndex: from + i,
  }))

  // ⚠️ DELIBERATELY NO `aria-controls` here, although every fold in the library
  // has one. `aria-expanded` + `aria-controls` is what the SDK's reveal-on-expand
  // keys on, and it answers by SCROLLING THE PAGE until the panel is on screen.
  // This panel is a popover pinned to the sticky transport — it is on screen by
  // construction, and scrolling the window does not move it at all. The only
  // thing the reveal could do is shift the library underneath an open overlay
  // (it would, on a short window, where the panel's top passes under the navbar
  // and "keep the top in view" asks for an upward scroll). The same goes for any
  // positioned menu or popover added to this app.
  return (
    <div ref={wrap} className="relative">
      <IconButton
        label={open ? 'Hide what’s playing next' : 'What’s playing next'}
        active={open}
        onClick={() => setOpen((v) => !v)}
        // Same reason as the play button: without this the click that OPENS
        // the panel bubbles to the document and cancels the ceremony.
        stopPropagation
      >
        <QueueGlyph />
      </IconButton>

      {open ? (
        <div
          role="dialog"
          aria-label="Playing next"
          onClick={(e) => e.stopPropagation()}
          // Right-aligned and above the bar. `max-h` with its own scroller, or
          // a long lookahead pushes the panel off the top of a phone.
          className="absolute right-0 bottom-full z-40 mb-2 max-h-[min(60vh,20rem)] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {window.map(({ track, orderIndex }) => {
            if (!track) return null
            const isCurrent = orderIndex === cursor
            return (
              <button
                key={`${track.id}-${orderIndex}`}
                type="button"
                onClick={() => {
                  jumpTo(orderIndex)
                  setOpen(false)
                }}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                  isCurrent
                    ? 'bg-orange-50 dark:bg-orange-500/10'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {/* A fixed-width marker rather than an icon only on the current
                    row: a column that appears and disappears re-indents every
                    title as the queue moves on. */}
                <span className="w-3.5 shrink-0 text-orange-600 dark:text-orange-400">
                  {isCurrent ? <PlayingGlyph /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13px] ${
                      isCurrent
                        ? 'font-semibold text-orange-700 dark:text-orange-300'
                        : orderIndex < cursor
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {track.title}
                  </span>
                  <span className="block truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                    {track.artist ?? 'Unknown artist'}
                  </span>
                </span>
              </button>
            )
          })}
          {to < order.length ? (
            <p className="px-2 py-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              and {order.length - to} more
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function IconButton({
  label, onClick, children, active = false, className = '', stopPropagation = false,
}: {
  label: string
  onClick(): void
  children: React.ReactNode
  active?: boolean
  className?: string
  stopPropagation?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        onClick()
      }}
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
function QueueGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M3 5.5h10M3 10h10M3 14.5h6" /><path d="M15.5 8.5v6.2" /><circle cx="14" cy="15" r="1.6" fill="currentColor" stroke="none" /></svg>
}
function PlayingGlyph() {
  return <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden><path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" /></svg>
}
function VolumeGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M4 7.5h2.5L10 4.5v11L6.5 12.5H4zM13 7.2a4 4 0 0 1 0 5.6" /></svg>
}
function MutedGlyph() {
  return <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden><path d="M4 7.5h2.5L10 4.5v11L6.5 12.5H4zM13 8l4 4M17 8l-4 4" /></svg>
}
