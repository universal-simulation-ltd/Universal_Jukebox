import { PREVIEW_RUN_SEC, PREVIEW_START_SEC } from '../lib/audio'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../lib/types'

// The one way to hear a track without putting the record on.
//
// ⚠️ THIS IS THE EXCEPTION THAT MAKES THE RULE BEARABLE. Every other play in
// this app now goes to the deck and cues the arm (James, 2026-09-08) — which is
// the right answer for "play this", and the wrong one for "is this the take I
// mean?". Ten seconds, taken ten seconds in, in the list you are already
// looking at: no queue, no change of screen, and the record you had on is still
// cued up behind it.
//
// Ten seconds IN, because the first ten seconds of a track are the part least
// like it: an intro, a count-in, or silence.
//
// It sits beside the row rather than inside it because a button cannot be
// nested in a button — the row itself is the play target, and this is not it.

export default function PreviewButton({ track }: { track: Track }) {
  const previewTrackId = usePlayerStore((s) => s.previewTrackId)
  const preview = usePlayerStore((s) => s.preview)
  const running = previewTrackId === track.id

  const label = running
    ? `Stop previewing ${track.title}`
    : `Preview ${track.title} — ${PREVIEW_RUN_SEC} seconds from ${PREVIEW_START_SEC} seconds in`

  return (
    <button
      type="button"
      onClick={() => preview(track)}
      aria-label={label}
      aria-pressed={running}
      title={running ? 'Stop the preview' : `Preview ${PREVIEW_RUN_SEC} seconds`}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E05504] ${
        running
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
          : 'text-slate-400 hover:bg-slate-100 hover:text-orange-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-orange-400'
      }`}
    >
      {running ? <StopGlyph /> : <PreviewGlyph />}
    </button>
  )
}

/**
 * Headphones — "listen", as distinct from the row's own "play".
 *
 * ⚠️ Deliberately NOT a play triangle. The row beside it starts the record; a
 * second triangle next to it would be two buttons that look like the same
 * button and do very different things.
 */
function PreviewGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 12V9.8a6.5 6.5 0 0 1 13 0V12" />
      <path d="M3.5 11.6h1.8a.8.8 0 0 1 .8.8v3a.8.8 0 0 1-.8.8H4.6A1.1 1.1 0 0 1 3.5 15v-3.4ZM16.5 11.6h-1.8a.8.8 0 0 0-.8.8v3a.8.8 0 0 0 .8.8h.7a1.1 1.1 0 0 0 1.1-1.2v-3.4Z" />
    </svg>
  )
}

function StopGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[15px] w-[15px]" fill="currentColor" aria-hidden>
      <rect x="5" y="5" width="10" height="10" rx="2" />
    </svg>
  )
}
