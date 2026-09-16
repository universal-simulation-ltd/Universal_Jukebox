import { trackGenres } from '../lib/genres'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Chip, revealExpanded } from '@unisim/sdk'
import { scrollToTop } from '../lib/scrollTop'
import { useLandscapeStage } from '../lib/stageLayout'
import { navBarBottom } from '../lib/scrollBelowBar'
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
import AboutTrack from './AboutTrack'
import { useAboutStore } from '../stores/aboutStore'
import Queue from './Queue'
import ResumeCard from './ResumeCard'
import UpNextReel from './UpNextReel'
import PlayModes from './PlayModes'
import FoldUp from './FoldUp'
import LyricsAround from './LyricsAround'
import Visualiser from './Visualiser'
import { useLyricsStore } from '../stores/lyricsStore'
import { requestLyricsReveal } from '../lib/lyricsReveal'
import { useKeepAwake } from '../lib/keepAwake'

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
//
// ⚠️ AND A THIRD: LYING DOWN. A landscape phone is below `lg` and so would
// stack, but has no height to stack in — the record ends up below the fold on
// the one screen whose job is to show it. There the columns come back, words
// LEFT and record RIGHT (the mirror of `lg`, asked for that way, and the right
// way round for two hands). `lib/stageLayout.ts` owns the rule and the
// reasoning.

export default function NowPlaying() {
  const lyricsAround = useSettingsStore((s) => s.lyricsAround)
  // "Keep awake" (in the folded row, `PlayModes`) holds the screen on for as
  // long as this page is open — and only this page. See `lib/keepAwake.ts`.
  useKeepAwake(useSettingsStore((s) => s.keepAwake))
  /** Wide and short — the words beside the record rather than above it. */
  const landscape = useLandscapeStage()
  /** The stage row, and how much height is left for it — see `useDeckRoom`. */
  const stage = useRef<HTMLDivElement>(null)
  const room = useDeckRoom(stage, landscape)
  const track = usePlayerStore(currentTrack)
  // Every visit to Now Playing starts with the lyrics closed (James, 2026-09-10):
  // leaving closes them. They stay open across songs while you stay — see
  // `shownFor` for why.
  // "About this track" follows the same rule.
  useEffect(
    () => () => {
      useLyricsStore.getState().hideLyrics()
      useAboutStore.getState().setOpen(false)
    },
    [],
  )
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
  /** The row of round buttons, pulled up on a phone — see `FoldUp`. For this visit only. */
  const [optionsShown, setOptionsShown] = useState(false)
  // Its "i" is open, so the row it lives in must be showing.
  const aboutOpen = useAboutStore((s) => s.open)
  const openQueue = () => {
    setQueueOpen(true)
    requestAnimationFrame(() => {
      const list = document.getElementById('jb-up-next')
      if (list) revealExpanded(list, null)
    })
  }

  const album = track ? albums.find((a) => a.id === track.albumId) : undefined
  const onTheDeck = useLeavingAlbum(album, deckPhase === 'leaving')
  // The phone's song details, midway between the navbar and the record — see
  // `useMidway`. Keyed on what can move either edge of the gap.
  const phoneHeading = useRef<HTMLDivElement>(null)
  // ⚠️ Not while lying down: `useMidway` centres the words in the gap ABOVE
  // the record, and lying down there is no such gap — the words are beside it.
  const nudge = useMidway(phoneHeading, `${track?.id}|${onTheDeck?.id}|${lyricsAround}|${ceremony}|${landscape}`)

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
  /** Centred while stacked; hard left in both column layouts. */
  const startAligned = landscape ? 'items-start' : 'items-center lg:items-start'

  const heading = (
    <>
        {/* ⚠️ The numerals REPLACE the title for two seconds; they do not sit on
            top of anything. This is the corrected design — see Deck.tsx. */}
        {ceremony ? (
          <div className={`flex flex-col justify-center ${landscape ? 'min-h-0' : 'min-h-[8rem]'} ${startAligned}`}>
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
          <div className={`flex flex-col justify-center ${landscape ? 'min-h-0' : 'min-h-[8rem]'} ${startAligned}`}>
            <CeremonyCount />
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Changing records…</p>
          </div>
        ) : (
          <div className={`flex flex-col justify-center ${landscape ? 'min-h-0' : 'min-h-[8rem]'} ${startAligned}`}>
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
    <div
      ref={stage}
      className={
        landscape
          ? 'flex flex-row items-center gap-6'
          : 'flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-14'
      }
    >
      {/* The cover, stretched across the whole page as the ground (James,
          2026-09-09: "noticeable but not distracting"). Behind everything, and
          only when there IS a cover. */}
      {album?.cover && <BlurredGround albumId={album.id} cover={album.cover} />}

      {/* The stacked layout's words, above the record. Lying down they move
          into the column beside it instead — the same `heading`, one copy of
          the markup, rendered in one place or the other. */}
      <div
        ref={phoneHeading}
        className={landscape ? 'hidden' : 'relative w-full text-center lg:hidden'}
        style={!landscape && nudge ? { transform: `translateY(${nudge}px)` } : undefined}
      >
        {heading}
      </div>

      {/* The records either side peek in, and the deck swipes — see DeckSwiper. */}
      <DeckSwiper
        size={clampDeck(landscape, room)}
        showing={onTheDeck?.id}
        beside={landscape}
        // Off the screen's own edge — the record's disc stands proud of the
        // sleeve, and hard against the glass it reads as clipped.
        inset={landscape ? 12 : 0}
        // Room above the record for the lyrics' arc, when they are on.
        roomAbove={lyricsAround ? 28 : 0}
      >
        {/* ⚠️ `onTheDeck`, not `album`. While the old record is being lifted
            off, the record on the deck is still the OLD one — see below. */}
        <Deck
          album={onTheDeck}
          size={clampDeck(landscape, room)}
          ceremonial
          // The words around the record (Settings › Lyrics), drawn under its tonearm.
          underArm={lyricsAround ? <LyricsAround size={clampDeck(landscape, room)} /> : undefined}
        />
      </DeckSwiper>

      <div
        className={`relative min-w-0 flex-1 ${
          // ⚠️ `order-first`, not `flex-row-reverse` on the row: the deck's
          // neighbours peek in from both sides (`DeckSwiper`), and reversing
          // the row reverses those too — the record that is coming next would
          // arrive from the left.
          landscape ? 'order-first text-left' : 'text-center lg:text-left'
        }`}
      >
        <div className={landscape ? 'block' : 'hidden lg:block'}>{heading}</div>

        {/* Spec chips — the honest technical facts about the file that is
            playing. Hidden below 980px (T3), and lying down, where the column
            is as tall as the record beside it is allowed to be. */}
        <div className={`mt-5 flex-wrap justify-center gap-2 lg:justify-start ${landscape ? 'hidden' : 'hidden md:flex'}`}>
          <SpecChip>{track.ext.toUpperCase()}</SpecChip>
          <SpecChip>{(track.size / 1024 / 1024).toFixed(1)} MB</SpecChip>
          {track.trackNo && <SpecChip>Track {track.trackNo}</SpecChip>}
          {/* ⚠️ Through `trackGenres`, not raw. A great many MP3s carry the
              genre as ID3v1's NUMBER — `(17)`, or `17` — and iTunes M4As carry
              it in the binary `gnre` atom, which `tags.ts` stores as that same
              number. Printed raw, the chip on those files says "17". One chip
              per genre, for a file tagged with more than one. */}
          {trackGenres(track).map((name) => (
            <SpecChip key={name}>{name}</SpecChip>
          ))}
        </div>

        {!landscape && (
          <p className="mt-4 text-[12px] text-slate-400 dark:text-slate-500">
            {cursor >= 0 ? `${cursor + 1} of ${plural(queue.length, 'track')} queued` : ''}
          </p>
        )}

        <div className={`flex flex-wrap justify-center gap-2 lg:justify-start ${landscape ? 'mt-3' : 'mt-4'}`}>
          <LyricsToggle />
        </div>

        {/* Hidden below 560px (T5) — the first thing to go from the words
            column, because it is the only part of it that is decoration. Gone
            lying down for the same reason: every row here is height the record
            beside it could have had. */}
        {!landscape && (
          <div className="mt-5 hidden sm:block">
            <Visualiser />
          </div>
        )}
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
    {/* Shuffle, the repeats, where the sound comes out, Add to shelf and the
        "i" — see `PlayModes`. On a phone the page stops at the records above,
        and a further swipe up brings this row into view (James, 2026-09-13),
        and scrolling back up folds it away again (2026-09-15) — see `FoldUp`. */}
    <FoldUp
      open={optionsShown || aboutOpen}
      onOpen={() => setOptionsShown(true)}
      // ⚠️ Not while the "i" is open. `open` already survives it (it is an OR),
      // so without this the fold would simply be DEFERRED — scroll through
      // About, close it, and the row underneath would vanish at the same
      // moment for no reason the person could connect to anything.
      onClose={() => { if (!aboutOpen) setOptionsShown(false) }}
    >
      <PlayModes />
    </FoldUp>
    {/* What the "i" in that row opens (James, 2026-09-13: "move (i) and (add
        to shelf) to the line of shuffle, repeat etc to make ui cleaner up top"). */}
    <AboutTrack />
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
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[12.5px] font-medium text-slate-600 hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-700 dark:hover:text-orange-400"
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M4 3h9a1 1 0 0 1 1 1v11.5a.5.5 0 0 1-.79.4L9 13.6l-4.21 2.3A.5.5 0 0 1 4 15.5V4a1 1 0 0 1 1-1Zm2 3a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5H6Zm0 3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5H6Z" />
      </svg>
      {show ? 'Hide lyrics' : 'Show lyrics'}
    </button>
  )
}

/**
 * How far to lower the phone's song details so they sit MIDWAY between the
 * navbar and the record (James, 2026-09-13: "make the track details midway
 * between the header and the record instead of at the top").
 *
 * ⚠️ MEASURED, NOT A FIXED MARGIN. The space under the details is not this
 * page's to know: it is the stage's gap, the swiper's padding, the room kept
 * for the lyrics' arc, and whatever the machine on the deck draws above its
 * record — all of which change with the machine and the settings.
 *
 * ⚠️ A TRANSFORM, NOT A MARGIN. A margin would push the record down by exactly
 * as much, and the gap under the details would never close.
 *
 * ⚠️ OFFSETS, NOT RECTS, for the details and the deck: the record arrives on an
 * animated transform, and a rect read mid-arrival would be wrong until the
 * next measure. The navbar is read only at the top of the page, where a sticky
 * bar is where the page begins.
 */
function useMidway(box: RefObject<HTMLDivElement | null>, key: string): number {
  const [nudge, setNudge] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const deck = () => el.parentElement?.querySelector<HTMLElement>('[role="button"]') ?? null
    const measure = () => {
      // Hidden (the details beside the record, from `lg`), or scrolled: leave it.
      const frame = deck()
      if (el.offsetParent === null || !frame || window.scrollY > 1) return
      const top = pageTop(el)
      const above = top - navBarBottom()
      const below = pageTop(frame) - (top + el.offsetHeight)
      setNudge(Math.max(0, Math.round((below - above) / 2)))
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    const frame = deck()
    if (frame) watch.observe(frame)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      watch.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [box, key])
  return nudge
}

/** An element's distance from the top of the page, transforms ignored. */
function pageTop(node: HTMLElement): number {
  let y = 0
  for (let n: HTMLElement | null = node; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop
  return y
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
function clampDeck(landscape = false, room: number | null = null): number {
  if (typeof window === 'undefined') return 320
  // ⚠️ LYING DOWN, THE HEIGHT IS ALL THERE IS, AND MOST OF IT IS ALREADY SPOKEN
  // FOR. A 390px-tall screen carries the navbar, the way back, the player bar
  // and the progress line before the stage gets a pixel — about 175 of them —
  // and the record is drawn a little larger than the size given here (the disc
  // stands proud of the sleeve). 0.38 of the height is what is genuinely left;
  // measured at 844×390, a fifth of the screen was the deck and the words were
  // squeezed to three wrapped lines beside it before this came down.
  //
  // ⚠️ And the FLOOR goes with it. 180 is right when the record is the whole
  // screen; lying down it is taller than the room there is, and a floor that
  // cannot be met is how the record ended up under the player bar.
  const byWidth = window.innerWidth * (landscape ? 0.34 : 0.62)
  // ⚠️ MEASURED, not a share of the screen, whenever the stage can measure
  // itself. Lying down, what is left for the record is whatever the navbar,
  // the way back, any banner and the player bar have not already taken, and
  // that is not a fixed fraction of anything — the example library's notice
  // alone is 70px of it. Guessed at 0.38 of the screen, the record sat under
  // the player bar on a 390px-tall phone.
  const byHeight = landscape ? (room ?? window.innerHeight * 0.38) : window.innerHeight * 0.46
  const floor = landscape ? 110 : 180
  return Math.round(Math.max(floor, Math.min(420, byWidth, byHeight)))
}

/**
 * How tall the record may be while the stage is lying down.
 *
 * The space between the top of the stage row and the top of the player bar,
 * less what the record's own disc stands proud of its sleeve by (`OVERHANG`).
 * Everything above the row — the navbar, "Back to your library", the example
 * library's notice, a scan banner — has already taken its height by the time
 * this runs, so the answer is what is genuinely left rather than a guess.
 *
 * ⚠️ No feedback loop: the row's top is set by what is ABOVE it and the player
 * bar is fixed to the bottom, so neither moves when the deck's size changes.
 * Measuring the row's own height instead would oscillate.
 */
const OVERHANG = 1.3

function useDeckRoom(stage: RefObject<HTMLDivElement | null>, landscape: boolean): number | null {
  const [room, setRoom] = useState<number | null>(null)
  // ⚠️ AFTER EVERY RENDER, deliberately, and not on a dependency list. What
  // sits above the stage comes and goes on its own schedule — the example
  // library's notice, a scan banner, the update notice, a song with a longer
  // title wrapping to two lines — and each of them moves the row's top without
  // changing anything this component could list. Measured once on mount, the
  // record was sized for a page that no longer existed and ended up under the
  // player bar.
  //
  // ⚠️ It cannot loop: the row's top is set by what is ABOVE it, and the deck's
  // size only changes the row's own height. The 2px threshold stops a
  // sub-pixel measurement ping-ponging anyway — which is exactly what the rule
  // below is warning about, and why it is answered rather than obeyed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!landscape) {
      if (room !== null) setRoom(null)
      return
    }
    const measure = () => {
      const el = stage.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const bar = document.querySelector('[data-jb-playerbar]')?.getBoundingClientRect().top ?? window.innerHeight
      const next = Math.round(Math.max(110, (bar - top - 8) / OVERHANG))
      setRoom((current) => (current === null || Math.abs(current - next) > 2 ? next : current))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  })
  return room
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

/** A spec chip: the suite's Orbit chip at the small size. */
function SpecChip({ children }: { children: React.ReactNode }) {
  return <Chip size="sm">{children}</Chip>
}
