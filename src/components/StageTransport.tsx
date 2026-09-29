import { useState } from 'react'
import { clock, plural } from '../lib/format'
import { usePlayerStore } from '../stores/playerStore'

// The transport at full size, under the record on a phone's Now Playing —
// where the thumb already is after swiping the records (James, 2026-09-28,
// from the UX review: the screen had a big empty band under the deck and the
// only controls were the small ones in the bar at the bottom).
//
// ⚠️ IT REPLACES THE PLAYER BAR ON THIS SCREEN, it does not sit on top of it.
// Two sets of play buttons a few centimetres apart is the thing to avoid, so
// `App.tsx` hides the bar on Now Playing wherever this is drawn: portrait,
// below `lg`. Lying down there is no room for both the record and this, so
// there the bar stays and this is not drawn; from `lg` the bar stays too,
// because the words column beside the record is not under a thumb.

/**
 * `compact` is the phone lying down, where this sits in the words column beside
 * the record and every row is height the record could have had: hard left,
 * tighter, and a smaller play button that is still well over a thumb's width.
 */
export default function StageTransport({ compact = false, after }: { compact?: boolean; after?: React.ReactNode }) {
  const playing = usePlayerStore((s) => s.playing)
  const loading = usePlayerStore((s) => s.loading)
  const ceremony = usePlayerStore((s) => s.ceremony)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const durationSec = usePlayerStore((s) => s.durationSec)
  const queue = usePlayerStore((s) => s.queue)
  const cursor = usePlayerStore((s) => s.cursor)
  const toggle = usePlayerStore((s) => s.toggle)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const seekTo = usePlayerStore((s) => s.seekTo)
  // As the bar's: while dragging, follow the finger, not the audio clock.
  const [scrubbing, setScrubbing] = useState<number | null>(null)

  const known = Number.isFinite(durationSec) && durationSec > 0
  const position = scrubbing ?? currentSec
  const share = known ? Math.min(1, position / durationSec) * 100 : 0
  const release = () => {
    if (scrubbing !== null) seekTo(scrubbing)
    setScrubbing(null)
  }

  return (
    <div className={compact ? 'w-full max-w-sm' : 'mx-auto w-full max-w-sm px-2'}>
      <input
        type="range"
        min={0}
        max={known ? durationSec : 1}
        step={0.5}
        value={known ? Math.min(position, durationSec) : 0}
        disabled={!known}
        aria-label="Seek"
        onChange={(e) => setScrubbing(Number(e.target.value))}
        onPointerUp={release}
        onKeyUp={release}
        // ⚠️ Not the document's click: `App.tsx` skips the ceremony on one.
        onClick={(e) => e.stopPropagation()}
        className="jb-scrub block h-1.5 w-full cursor-pointer appearance-none disabled:cursor-default"
        style={{
          background: `linear-gradient(to right, #E05504 ${share}%, rgb(148 163 184 / 0.35) ${share}%)`,
        }}
      />
      <div className="mt-1.5 flex items-center justify-between text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">
        <span>{clock(position)}</span>
        <span>{cursor >= 0 ? `${cursor + 1} of ${plural(queue.length, 'track')}` : ''}</span>
        <span>{known ? `−${clock(Math.max(0, durationSec - position))}` : '—'}</span>
      </div>

      <div className={`flex items-center ${compact ? 'mt-1.5 justify-start gap-5' : 'mt-3 justify-center gap-8'}`}>
        <RoundButton label="Previous track" onPress={previous}>
          <svg viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M6 4h2v12H6zM17 4.7v10.6a1 1 0 0 1-1.53.85l-8.2-5.3a1 1 0 0 1 0-1.7l8.2-5.3A1 1 0 0 1 17 4.7Z" />
          </svg>
        </RoundButton>
        <button
          type="button"
          onClick={(e) => {
            // Load-bearing, as on the bar's: the click that starts the
            // ceremony must not bubble up and skip it.
            e.stopPropagation()
            toggle()
          }}
          aria-label={ceremony ? 'Skip the intro' : playing ? 'Pause' : 'Play'}
          className={`inline-flex ${compact ? 'h-14 w-14' : 'h-16 w-16'} items-center justify-center rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-lg shadow-orange-600/25 transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E05504]`}
        >
          {loading && !playing ? (
            <svg viewBox="0 0 20 20" className="h-7 w-7 motion-safe:animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M10 3a7 7 0 1 0 7 7" />
            </svg>
          ) : playing ? (
            <svg viewBox="0 0 20 20" className="h-7 w-7" fill="currentColor" aria-hidden>
              <path d="M6 3.5h2.4v13H6zM11.6 3.5H14v13h-2.4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-7 w-7 translate-x-[2px]" fill="currentColor" aria-hidden>
              <path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" />
            </svg>
          )}
        </button>
        <RoundButton label="Next track" onPress={next}>
          <svg viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M12 4h2v12h-2zM3 4.7v10.6a1 1 0 0 0 1.53.85l8.2-5.3a1 1 0 0 0 0-1.7l-8.2-5.3A1 1 0 0 0 3 4.7Z" />
          </svg>
        </RoundButton>
        {/* Lying down, the row's spare width carries "Show lyrics" — a row
            of its own was one more than the screen had. */}
        {after}
      </div>
    </div>
  )
}

function RoundButton({ label, onPress, children }: { label: string; onPress(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onPress()
      }}
      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-700 transition hover:text-orange-700 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] dark:text-slate-200 dark:hover:text-orange-400"
    >
      {children}
    </button>
  )
}
