import { coverUrl } from '../lib/art'
import { plural } from '../lib/format'
import { goHome, navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { useSettingsStore } from '../stores/settingsStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import Deck, { CeremonyCount } from './Deck'
import Queue from './Queue'
import Visualiser from './Visualiser'

// The one screen in the suite that is genuinely pleasurable to leave open.
//
// Layout: the deck on the left, the words on the right. The words column is
// also where the ceremony's numerals appear — they take the space the track
// title occupies the rest of the time, so nothing moves that wasn't going to.
//
// ⚠️ Below 980px (tier T3) this stacks to one column: deck above, words below,
// centred. Below 430px (T6) the whole stage is hidden and the player bar
// becomes the app — see `App.tsx`, which owns that decision, because a stage
// that hides itself while the page still shows a heading reads as a bug.

export default function NowPlaying() {
  const track = usePlayerStore(currentTrack)
  const ceremony = usePlayerStore((s) => s.ceremony)
  const skipCeremony = usePlayerStore((s) => s.skipCeremony)
  const setSetting = useSettingsStore((s) => s.set)
  const queue = usePlayerStore((s) => s.queue)
  const cursor = usePlayerStore((s) => s.cursor)
  const albums = useLibraryStore((s) => s.albums)

  const album = track ? albums.find((a) => a.id === track.albumId) : undefined

  if (!track) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing playing.</p>
        <button
          type="button"
          onClick={() => navigate({ view: 'albums' })}
          className="mt-3 text-sm font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
        >
          Pick an album
        </button>
      </div>
    )
  }

  return (
    <>
    <BackToLibrary />
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-14">
      {/* Blurred cover as the ground, the way every good Now Playing screen
          does it — the album's own colours, at a size that can't compete with
          the deck. Behind everything, and only when there IS a cover. */}
      {album?.cover && <BlurredGround albumId={album.id} cover={album.cover} />}

      <div className="relative shrink-0">
        <Deck album={album} size={clampDeck()} ceremonial />
      </div>

      <div className="relative min-w-0 flex-1 text-center lg:text-left">
        {/* ⚠️ The numerals REPLACE the title for two seconds; they do not sit on
            top of anything. This is the corrected design — see Deck.tsx. */}
        {ceremony ? (
          <div className="min-h-[8rem]">
            <CeremonyCount />
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Cueing up…</p>
            {/* ⚠️ The way out, offered AT THE MOMENT the thing happens.
                Burying "turn this off" in Settings only helps the person who
                already knows the page exists; the person who finds a 2.3-second
                animation irritating is looking at it right now. It also stops
                the animation immediately rather than only from next time —
                being told "we'll stop doing that later" while it carries on is
                the worst version of this control. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSetting('ceremonyMode', 'off')
                skipCeremony()
              }}
              className="mt-4 text-[12px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
            >
              Don’t show this again
            </button>
          </div>
        ) : (
          <div className="min-h-[8rem]">
            <h1 className="text-2xl font-semibold text-balance text-slate-900 sm:text-3xl dark:text-slate-100">
              {track.title}
            </h1>
            <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300">
              {track.artist ?? track.albumArtist ?? 'Unknown artist'}
            </p>
            {track.album && (
              <button
                type="button"
                onClick={() => navigate({ view: 'album', albumId: track.albumId })}
                className="mt-1 text-[14px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
              >
                {track.album}
                {track.year ? ` · ${track.year}` : ''}
              </button>
            )}
          </div>
        )}

        {/* Spec chips — the honest technical facts about the file that is
            playing. Hidden below 980px (T3). */}
        <div className="mt-5 hidden flex-wrap justify-center gap-2 md:flex lg:justify-start">
          <Chip>{track.ext.toUpperCase()}</Chip>
          <Chip>{(track.size / 1024 / 1024).toFixed(1)} MB</Chip>
          {track.trackNo && <Chip>Track {track.trackNo}</Chip>}
          {track.genre && <Chip>{track.genre}</Chip>}
        </div>

        <p className="mt-4 text-[12px] text-slate-400 dark:text-slate-500">
          {cursor >= 0 ? `${cursor + 1} of ${plural(queue.length, 'track')} queued` : ''}
        </p>

        {/* Hidden below 560px (T5) — the first thing to go from the words
            column, because it is the only part of it that is decoration. */}
        <div className="mt-5 hidden sm:block">
          <Visualiser />
        </div>
      </div>
    </div>
    <Queue />
    </>
  )
}

/**
 * The way back to the library, from the deck.
 *
 * ⚠️ Rendered ABOVE the stage and OUTSIDE the ceremony branch, so it is there
 * during the countdown as well as after it. That is the whole point of it: the
 * previous version of this screen had no way home at all, so leaving meant the
 * browser back button or waiting out the animation to find a link — and being
 * held in a 2.3-second animation with no visible exit is exactly the feeling
 * the ceremony is supposed to be the opposite of.
 *
 * ⚠️ It deliberately does NOT `stopPropagation`. `App.tsx` skips the ceremony
 * on any click, and letting this one through is correct: leaving the deck while
 * the arm is still in the air should start the music, not walk away from a
 * record suspended mid-cue.
 */
function BackToLibrary() {
  return (
    <button
      type="button"
      onClick={goHome}
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
      </svg>
      Back to your library
    </button>
  )
}

/**
 * How big the record is.
 *
 * Sized against the VIEWPORT rather than a breakpoint, because this is the one
 * element the whole screen is built around: on a short laptop window the
 * limiting dimension is the height, not the width, and a deck sized only by
 * width scrolls the transport off the bottom.
 */
function clampDeck(): number {
  if (typeof window === 'undefined') return 320
  const byWidth = window.innerWidth * 0.62
  const byHeight = window.innerHeight * 0.46
  return Math.round(Math.max(180, Math.min(420, byWidth, byHeight)))
}

function BlurredGround({ albumId, cover }: { albumId: string; cover: Blob }) {
  const url = coverUrl(albumId, cover)
  if (!url) return null
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <img
        src={url}
        alt=""
        className="h-full w-full scale-125 object-cover opacity-[0.13] blur-3xl dark:opacity-20"
      />
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
      {children}
    </span>
  )
}
