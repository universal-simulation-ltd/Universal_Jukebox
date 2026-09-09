import { coverUrl, fallbackHue } from '../lib/art'
import { navigate } from '../lib/route'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckStyle } from '../stores/settingsStore'
import type { Album } from '../lib/types'
import { SHAPES, type DeckFaceProps, type NotesAnchor } from './decks/face'
import CassetteDeck from './decks/CassetteDeck'
import CdDeck from './decks/CdDeck'
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
  const style = useSettingsStore((s) => s.deck)
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
   * The medium arriving on the deck, or being lifted off it.
   *
   * ⚠️ ONE animation on THE MEDIUM, rather than a cross-dissolve between two
   * covers. That is what lets the album underneath change at the moment the
   * picture is invisible: a record fading out, the cover swapping behind it,
   * and the new record fading in is exactly the sequence asked for, with no
   * face needing to hold two covers at once. Each face decides what its medium
   * is — see `arrival` in `decks/face.ts`, and why it is not the whole face.
   *
   * ⚠️ Ceremonial deck only. The mini player's deck is a 40px picture of the
   * state; a record dropping into it from above would be a twitch in the corner
   * of the screen, which is the opposite of what any of this is for.
   */
  const arrival =
    !ceremonial || reduced || phase === 'idle'
      ? undefined
      : phase === 'arriving'
        ? 'jb-deck-in 700ms cubic-bezier(.22,.9,.3,1) both'
        : 'jb-deck-out 420ms ease-in both'

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
          arrival={arrival}
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
  if (count === null) return null
  return (
    <p
      key={count}
      className="text-6xl font-semibold tracking-tight text-orange-600 tabular-nums dark:text-orange-400"
      style={{ animation: 'jb-count 780ms ease-out' }}
      aria-hidden
    >
      {count}
    </p>
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
