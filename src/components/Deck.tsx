import { useEffect, useRef } from 'react'
import { coverUrl, fallbackHue } from '../lib/art'
import { DECK_ROTATION, resolveDeck } from '../lib/decks'
import { navigate } from '../lib/route'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckSetting, type DeckStyle } from '../stores/settingsStore'
import type { Album } from '../lib/types'
import { SHAPES, type DeckFaceProps, type NotesAnchor } from './decks/face'
import CassetteDeck from './decks/CassetteDeck'
import CdDeck from './decks/CdDeck'
import JukeboxDeck from './decks/JukeboxDeck'
import VinylDeck from './decks/VinylDeck'

// The deck: whatever is turning on Now Playing, with the album's cover on it,
// the pickup engaging when you put something on, and the pickup — or the reels
// — following the track as it plays.
//
// ⚠️ THIS FILE IS THE FRAME, NOT THE PICTURE. It subscribes to the player once,
// derives the handful of numbers every deck needs, and hands them to whichever
// face the user chose in Settings (`settings.deck`). The faces live in `decks/`
// and each is a pure function of those numbers — `decks/face.ts` says why they
// are not allowed to read the stores for themselves.
//
// ⚠️ THIS COMPONENT OWNS NO TIMING. The ceremony's beats (§22.9) live in
// `playerStore`, and this reads `armDown` / `ceremonyCount` off it.
//
// That split is not tidiness. The timeline WAS here, and because the ceremonial
// deck is only mounted on Now Playing, pressing Play from an album set the
// ceremony going with nothing to finish it — and since the ceremony loads the
// audio without playing it, the result was silence that never resolved. A view
// cannot be responsible for something that has to happen whether or not the
// view exists.
//
// The beats, for reference (they are asserted in the store):
//   0.00s  the medium spins up, the pickup parked, 3 · 2 · 1 counts BESIDE it
//   0.78s  "2" — the pickup starts to move
//   1.56s  "1" — it is most of the way there
//   1.83s  it engages: the thunk, then the noise fading under the music
//   2.34s  numerals clear, playback starts, the medium keeps turning
//
// ⚠️ ONE TIMELINE, THREE SKINS. A CD player really is quicker off the mark than
// a turntable, and a cassette slower, so giving each deck its own beats is the
// obvious next move. Don't: the store's asserted beats and `ceremony.test.ts`
// cover ONE timeline, and three would put two thirds of the ceremony beyond
// them for a difference nobody has asked for.
//
// ⚠️ And it FREEZES on pause rather than resetting — the platter, whose
// `animation-play-state` is paused and never removed, and the pickup, whose
// position comes from `currentSec` and so stays exactly where the music
// stopped. Pressing pause on a record player does not spin the label back to
// the top or throw the needle back to track one.

/**
 * Every deck there is.
 *
 * ⚠️ Keyed by `DeckStyle`, so adding a fourth medium to the union in
 * `settingsStore` fails to compile until there is a face for it — and, over in
 * `decks/face.ts`, a frame for it to sit in. The alternative is a stored
 * setting that renders nothing, which looks exactly like a broken player.
 */
const FACES: Record<DeckStyle, React.ComponentType<DeckFaceProps>> = {
  vinyl: VinylDeck,
  cd: CdDeck,
  cassette: CassetteDeck,
  jukebox: JukeboxDeck,
}

interface DeckProps {
  album: Album | undefined
  /** Big on Now Playing, small in the mini player. */
  size: number
  /** Only the Now Playing deck runs the ceremony. */
  ceremonial?: boolean
}

export default function Deck({ album, size, ceremonial = false }: DeckProps) {
  const playing = usePlayerStore((s) => s.playing)
  const ceremony = usePlayerStore((s) => s.ceremony)
  const armDownState = usePlayerStore((s) => s.armDown)
  const phase = usePlayerStore((s) => s.deckPhase)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const durationSec = usePlayerStore((s) => s.durationSec)
  const setting = useSettingsStore((s) => s.deck)
  // ⚠️ The machine comes from the CURSOR, not from a counter kept in here.
  // Under `deck: 'random'` it is a pure function of where the track sits in the
  // queue (`resolveDeck`), which is what lets this deck, the start-up sound in
  // `playerStore`, the Settings page's demonstration of it and the row of
  // records waiting to go on all arrive at the same answer without any of them
  // telling the others. A counter incremented on each load would have to be
  // persisted, and would disagree with the reel the moment somebody jumped down
  // the queue — which is exactly the gesture the reel exists to offer.
  const cursor = usePlayerStore((s) => s.cursor)
  const style = resolveDeck(setting, cursor)
  const reduced = usePrefersReducedMotion()

  // The `??`s are not dead code: a settings blob edited by hand, or written by
  // a future version and then opened in this one, can carry a style this build
  // has never heard of. Falling back to the record beats rendering nothing.
  const Face = FACES[style] ?? FACES.vinyl
  const { frame, notes } = SHAPES[style] ?? SHAPES.vinyl

  const active = ceremonial && ceremony
  // A non-ceremonial deck (the mini player) always shows the pickup engaged
  // while something is playing — it is a picture of the state, not of the
  // ceremony.
  const engaged = ceremonial ? armDownState : playing

  /**
   * How far through the track we are, 0 → 1, and so how far the pickup has
   * travelled — or, on the cassette, how full the reels are.
   *
   * ⚠️ Guarded on a KNOWN duration. A track whose length the browser has not
   * worked out yet reports NaN or Infinity; dividing by either gives a rotation
   * of `NaNdeg`, which CSS drops on the floor — the arm would simply stop
   * following the music, with nothing anywhere raising an error. The other two
   * faces put the same number into SVG geometry, where it is worse still: a
   * NaN coordinate takes the whole path off the screen.
   */
  const progress =
    Number.isFinite(durationSec) && durationSec > 0
      ? Math.max(0, Math.min(1, currentSec / durationSec))
      : 0

  const url = album ? coverUrl(album.id, album.cover) : null
  const hue = album ? fallbackHue(album.id) : 24
  // ⚠️ Spins during the ceremony TOO. Beat 0.00s of §22.9 is "the platter spins
  // up, the arm is still parked" — a still platter with an arm swinging onto it
  // is a record player that is not running, which is the one thing the whole
  // animation is meant to show. This read `playing && !active`, which was
  // exactly backwards for the two seconds anybody is actually watching.
  const spinning = playing || active

  /**
   * The album art fading in as a record arrives, and out as one leaves.
   *
   * ⚠️ The record itself no longer moves — see `labelFade` in `decks/face.ts`
   * for why. During the countdown the art takes the whole count (the needle
   * lands at 1050ms) to come up; after a change of record it is quicker, since
   * the music is already on its way.
   *
   * ⚠️ Ceremonial deck only. The mini player's deck is a 40px picture of the
   * state, not a stage.
   */
  const labelFade =
    !ceremonial || reduced || phase === 'idle'
      ? undefined
      : phase === 'arriving'
        ? `jb-label-in ${active ? 1000 : 450}ms ease-out both`
        : 'jb-label-out 420ms ease-in both'

  const openAlbum = () => {
    if (album) navigate({ view: 'album', albumId: album.id })
  }

  return (
    <div className="group flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        aria-label={album ? `Open ${album.title}` : 'Open album'}
        onClick={openAlbum}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openAlbum()
          }
        }}
        className="relative cursor-pointer transition-transform duration-200 hover:-translate-y-[3px] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#E05504]"
        // ⚠️ The HEIGHT comes from the face, not from `size`. A cassette is
        // landscape, and a square frame around one puts the focus ring and the
        // hover target a long way from the thing being aimed at. `size` stays
        // the WIDTH for all three, so `clampDeck()` in NowPlaying still owns how
        // big the stage is.
        style={{ width: size, height: Math.round(size * frame.ratio), borderRadius: frame.radius }}
      >
        <Face
          progress={progress}
          engaged={engaged}
          spinning={spinning}
          reduced={reduced}
          url={url}
          hue={hue}
          labelFade={labelFade}
        />

        {/* Drifting notes — pure decoration, and only while something is
            playing. Each face says where its own pickup is, so they leave from
            the headshell, the lens or the tape head rather than from wherever
            the record player happened to put them. */}
        {spinning && !reduced && <Notes at={notes} />}
      </div>

      {/* The affordance, kept quiet: the deck is also the thing you are meant to
          just watch. */}
      <p className="mt-3 text-[11px] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500">
        Open album
      </p>

      {/* ⚠️ There is deliberately NO countdown rendered here. The numerals are
          `CeremonyCount`, which NowPlaying renders into the INFO COLUMN beside
          the deck — never over it. The first design pass put a full-screen
          overlay in front of the deck, which hid the arm coming across, i.e.
          the only reason to run the animation at all. This is the obvious place
          to put it back; don't. */}
    </div>
  )
}

/**
 * The numerals, rendered by the INFO COLUMN so they take the space the track
 * title occupies the rest of the time — nothing moves that wasn't going to.
 */
export function CeremonyCount() {
  const count = usePlayerStore((s) => s.ceremonyCount)
  const reduced = usePrefersReducedMotion()
  // ⚠️ THE NUMBER ON ITS WAY OUT, drawn in the same place as the one coming in
  // (James, 2026-09-10: "When 2,1 starts show a 3 already fading out and then
  // on 1 the 2 fades out and as it starts the 1 fades out"). So the count opens
  // on a 3 that is already leaving — it reads as a countdown in progress rather
  // than as a number that appeared — and the 1 fades itself out as the music
  // begins. The previous value is kept in a ref and read during render: stable
  // under a double render, since the effect is what moves it on.
  const previous = useRef<number | null>(null)
  const outgoing = count === null ? null : (previous.current ?? count + 1)
  useEffect(() => {
    previous.current = count
  }, [count])
  if (count === null) return null
  return (
    <p
      className="inline-grid text-6xl font-semibold tracking-tight text-orange-600 tabular-nums dark:text-orange-400"
      aria-hidden
    >
      {!reduced && outgoing !== null && outgoing !== count && (
        <span key={`out-${outgoing}`} className="[grid-area:1/1]" style={{ animation: 'jb-count-out 420ms ease-in both' }}>
          {outgoing}
        </span>
      )}
      <span
        key={`in-${count}`}
        className="[grid-area:1/1]"
        style={{ animation: reduced ? undefined : count === 1 ? 'jb-count-last 780ms ease-out both' : 'jb-count-in 420ms ease-out both' }}
      >
        {count}
      </span>
    </p>
  )
}

/**
 * A still picture of a deck, for the Settings chooser — so "a Walkman-style
 * shell" is something you can SEE before you pick it.
 *
 * ⚠️ DRAWN AT FULL SIZE AND SCALED DOWN, never drawn small. The faces are
 * mostly proportional, but not all of them: the CD player's hinge lugs and
 * buttons and the jukebox's lamp are fixed pixel sizes, and at 60px across they
 * would be a third of the machine. Rendering the face in a `MINI_BASE` frame and
 * shrinking the whole thing with a transform keeps every part in the proportion
 * the real deck has — the miniature IS the deck, not a sketch of it.
 *
 * ⚠️ `spinning: false` and `reduced: true`, so it is a STILL: nothing turns,
 * nothing transitions, and — the one that matters — the jukebox face's level
 * meter stays off. `useLevels` only builds the Web Audio graph when it is
 * metering, and that graph is a one-way door (`lib/audioGraph.ts`); a Settings
 * page must never be the thing that routes the app's audio through it.
 *
 * `random` is the four machines of the rotation at half size, in its order.
 */
const MINI_BASE = 220

export function DeckMiniature({ setting, box }: { setting: DeckSetting; box: number }) {
  if (setting === 'random') {
    const cell = (box - 4) / 2
    return (
      <span className="grid grid-cols-2 place-items-center gap-1" style={{ width: box, height: box }}>
        {DECK_ROTATION.map((style) => (
          <StillDeck key={style} style={style} box={cell} />
        ))}
      </span>
    )
  }
  return <StillDeck style={setting} box={box} />
}

function StillDeck({ style, box }: { style: DeckStyle; box: number }) {
  const Face = FACES[style] ?? FACES.vinyl
  const { frame } = SHAPES[style] ?? SHAPES.vinyl
  // Fit the frame inside a `box` square, whichever of its sides is longer.
  const width = Math.min(box, box / frame.ratio)
  const scale = width / MINI_BASE
  return (
    <span className="relative block shrink-0" style={{ width, height: width * frame.ratio }}>
      <span
        className="pointer-events-none absolute top-0 left-0 block"
        style={{
          width: MINI_BASE,
          height: MINI_BASE * frame.ratio,
          borderRadius: frame.radius,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* A third of the way through, with the pickup down — the pose that
            shows the most of each machine: the arm on the record, the laser
            out from the hub, the reels unequal. The brand orange stands in for
            album art. */}
        <Face progress={0.3} engaged spinning={false} reduced url={null} hue={24} />
      </span>
    </span>
  )
}

/** Two notes drifting off the pickup. CSS only; stops with the music. */
function Notes({ at }: { at: NotesAnchor }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute text-orange-500/70 dark:text-orange-400/70"
          style={{
            right: at.right,
            top: at.top,
            fontSize: 20,
            animation: `jb-drift 3.4s ease-out ${i * 1.7}s infinite`,
          }}
        >
          ♪
        </span>
      ))}
    </div>
  )
}
