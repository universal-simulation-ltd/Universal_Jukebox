import { useEffect, useRef, useState } from 'react'
import { revealExpanded } from '@unisim/sdk'
import { scrollToTop } from '../lib/scrollTop'
import { coverUrl } from '../lib/art'
import { plural } from '../lib/format'
import { goHome, navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { useSettingsStore } from '../stores/settingsStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import Deck, { CeremonyCount } from './Deck'
import DeckSwiper from './DeckSwiper'
import type { Album } from '../lib/types'
import Lyrics from './Lyrics'
import Queue from './Queue'
import ResumeCard from './ResumeCard'
import UpNextReel from './UpNextReel'
import PlayModes from './PlayModes'
import AddToShelf from './AddToShelf'
import Visualiser from './Visualiser'
import { useLyricsStore } from '../stores/lyricsStore'
import { requestLyricsReveal } from '../lib/lyricsReveal'

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
  // Every visit to Now Playing starts with the lyrics closed (James, 2026-09-10):
  // leaving closes them. They stay open across songs while you stay — see
  // `shownFor` for why.
  useEffect(() => () => useLyricsStore.getState().hideLyrics(), [])
  const ceremony = usePlayerStore((s) => s.ceremony)
  const blendCount = usePlayerStore((s) => s.blendCount)
  const skipCeremony = usePlayerStore((s) => s.skipCeremony)
  const setSetting = useSettingsStore((s) => s.set)
  const queue = usePlayerStore((s) => s.queue)
  const cursor = usePlayerStore((s) => s.cursor)
  const albums = useLibraryStore((s) => s.albums)
  const deckPhase = usePlayerStore((s) => s.deckPhase)
  /** "Up next", opened from the "+N" record — see `Queue`. */
  const [queueOpen, setQueueOpen] = useState(false)
  const openQueue = () => {
    setQueueOpen(true)
    requestAnimationFrame(() => {
      const list = document.getElementById('jb-up-next')
      if (list) revealExpanded(list, null)
    })
  }

  const album = track ? albums.find((a) => a.id === track.albumId) : undefined
  const onTheDeck = useLeavingAlbum(album, deckPhase === 'leaving')

  if (!track) {
    return (
      <div className="py-20 text-center">
        {/* The app reopens on the page it was last on, so "Nothing playing"
            is often the FIRST screen after a relaunch — exactly when the way
            back to where you were is wanted. */}
        <div className="mx-auto mb-8 max-w-md text-left">
          <ResumeCard />
        </div>
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

  // The title, artist and album — or the countdown in their place. Drawn ABOVE
  // the deck on a phone and beside it from `lg` (James, 2026-09-11: "put the
  // discs below the artist, track name to make it easier to reach for swipe"):
  // the records are what a thumb swipes, so they go where a thumb is.
  const heading = (
    <>
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
        ) : blendCount !== null ? (
          // A record crossfade's silent 3, 2, 1 (James, 2026-09-11), in the
          // start's place — without its "don't show this again", which belongs
          // to the start. Crossfading has its own switch in Settings.
          <div className="min-h-[8rem]">
            <CeremonyCount />
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Changing records…</p>
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
    </>
  )

  return (
    <>
    <BackToLibrary />
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-14">
      {/* The cover, stretched across the whole page as the ground (James,
          2026-09-09: "noticeable but not distracting"). Behind everything, and
          only when there IS a cover. */}
      {album?.cover && <BlurredGround albumId={album.id} cover={album.cover} />}

      <div className="relative w-full text-center lg:hidden">{heading}</div>

      {/* The records either side peek in, and the deck swipes — see DeckSwiper. */}
      <DeckSwiper size={clampDeck()} showing={onTheDeck?.id}>
        {/* ⚠️ `onTheDeck`, not `album`. While the old record is being lifted
            off, the record on the deck is still the OLD one — see below. */}
        <Deck album={onTheDeck} size={clampDeck()} ceremonial />
      </DeckSwiper>

      <div className="relative min-w-0 flex-1 text-center lg:text-left">
        <div className="hidden lg:block">{heading}</div>

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

        <LyricsToggle />
        {/* This song, onto a Jukebox shelf. */}
        <div className="mt-3 flex justify-center lg:justify-start">
          <AddToShelf tracks={[track]} variant="pill" />
        </div>

        {/* Hidden below 560px (T5) — the first thing to go from the words
            column, because it is the only part of it that is decoration. */}
        <div className="mt-5 hidden sm:block">
          <Visualiser />
        </div>
      </div>
    </div>
    {/* The words, directly under the deck and above everything about what
        comes NEXT — because they are about the track that is on. */}
    <Lyrics />
    {/* The records waiting their turn, as pictures. Between the stage and the
        list on purpose: it belongs to the deck (it is the same medium, in the
        order it will go on) and it introduces the queue underneath, which is
        the version with names and a way to remove a row. */}
    <UpNextReel onMore={openQueue} />
    <PlayModes />
    {queueOpen && <Queue onHide={() => setQueueOpen(false)} />}
    </>
  )
}

/**
 * The way into the lyrics panel.
 *
 * ⚠️ It says "Lyrics" whether or not this track has any, and that is
 * deliberate: knowing would mean reading every file on the deck before the
 * button could be drawn, which is a range read per track change for a button
 * most people never press. Pressing it and being told there are none is one
 * click; a button that appears and disappears between tracks is a control
 * nobody can learn.
 */
function LyricsToggle() {
  const track = usePlayerStore(currentTrack)
  const shownFor = useLyricsStore((s) => s.shownFor)
  const showFor = useLyricsStore((s) => s.showFor)
  const hideLyrics = useLyricsStore((s) => s.hideLyrics)
  const show = !!track && shownFor !== null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!track) return
        if (show) {
          hideLyrics()
          // Back up to the record (James, 2026-09-11: "When clicking hide
          // lyrics scroll back up to top for animation").
          scrollToTop()
          return
        }
        // Opening them scrolls down to them — see `lib/lyricsReveal.ts`.
        requestLyricsReveal()
        showFor(track.id)
      }}
      id="jb-lyrics-toggle"
      aria-pressed={show}
      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[12.5px] font-medium text-slate-600 hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-700 dark:hover:text-orange-400"
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M4 3h9a1 1 0 0 1 1 1v11.5a.5.5 0 0 1-.79.4L9 13.6l-4.21 2.3A.5.5 0 0 1 4 15.5V4a1 1 0 0 1 1-1Zm2 3a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5H6Zm0 3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5H6Z" />
      </svg>
      {show ? 'Hide lyrics' : 'Show lyrics'}
    </button>
  )
}

/**
 * The album the DECK is showing, which is not always the album playing.
 *
 * ⚠️ The cursor moves the instant a change-over starts — it has to, because the
 * title, the queue and the media session are all about the track that is
 * arriving. But the RECORD is not: for the 420ms of the lift, the thing being
 * lifted off the deck is the record that was on it. Without this the sequence
 * ran "swap the artwork, fade the new record out, fade the same record back
 * in", which is a flicker rather than a record change — and it was doing
 * exactly that until it was watched frame by frame.
 *
 * A ref updated during render, which is the sanctioned shape for "the previous
 * value of a prop": it is idempotent, so a double render under Strict Mode
 * produces the same answer.
 */
function useLeavingAlbum(album: Album | undefined, leaving: boolean): Album | undefined {
  const previous = useRef<Album | undefined>(undefined)
  if (!leaving) previous.current = album
  return leaving ? previous.current : album
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
      className="mb-4 hidden items-center gap-1.5 text-[13px] text-slate-600 sm:inline-flex hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
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

/**
 * The album cover as the page's ground.
 *
 * ⚠️ SOFTENED, NOT DISSOLVED. This was `blur-3xl` at 13%, which is a wash of
 * the record's colours and not the record — you could not tell one album from
 * another, which is most of the point of putting it there. The blur is now
 * light enough to recognise the sleeve and heavy enough that no edge in it
 * competes with a line of text.
 *
 * ⚠️ The mask is the part that makes it safe rather than the opacity. Text sits
 * in the middle band of this page, so the middle band is where the picture is
 * faded out; the image is strongest at the top and bottom edges, where there is
 * nothing to read. Raising the opacity without the mask is what turns a
 * background into a legibility problem.
 */
function BlurredGround({ albumId, cover }: { albumId: string; cover: Blob }) {
  const url = coverUrl(albumId, cover)
  if (!url) return null
  const fade = 'linear-gradient(to bottom, black 0%, rgba(0,0,0,.35) 38%, rgba(0,0,0,.35) 62%, black 100%)'
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <img
        src={url}
        alt=""
        className="h-full w-full scale-110 object-cover opacity-[0.17] blur-[14px] dark:opacity-[0.24]"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
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
