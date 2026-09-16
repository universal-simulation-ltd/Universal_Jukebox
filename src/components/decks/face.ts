import type { DeckStyle } from '../../stores/settingsStore'
import type { DeckSlide } from './slide'

// What every deck face is handed, and nothing more.
//
// ⚠️ The list is deliberately SHORT and already-derived. A face gets numbers,
// not stores: no `usePlayerStore`, no `useSettingsStore`, no reading the
// ceremony's state for itself. `Deck.tsx` subscribes once and passes the result
// down, so all three faces are pure functions of the same five values and a
// fourth deck cannot quietly invent a rule of its own — which is exactly how
// the vinyl deck once ended up owning the ceremony's timing (see `Deck.tsx`).

export interface DeckFaceProps {
  /**
   * How far through the track, 0 → 1.
   *
   * Already guarded: a track whose duration the browser has not worked out
   * arrives here as 0, never NaN.
   */
  progress: number
  /**
   * Is the pickup on the medium — the arm down, the laser lit, the head against
   * the tape? False during the ceremony's swing and the handover between
   * tracks.
   */
  engaged: boolean
  /** Is the medium moving? True during the ceremony as well as during playback. */
  spinning: boolean
  /** `prefers-reduced-motion`: draw the end state, animate nothing. */
  reduced: boolean
  /** The album art as an object URL, or null when there is none. */
  url: string | null
  /** The per-album fallback hue, for when there is no art. */
  hue: number
  /**
   * A CSS `animation` shorthand for the ALBUM ART on the medium — fading in as
   * a record arrives, out as one leaves — or `undefined`, the usual case.
   *
   * ⚠️ THE ART ONLY; THE MEDIUM STAYS PUT. This was `arrival`, an animation on
   * the whole disc: lowered in from above as the countdown ran. James, having
   * watched it on the phone (2026-09-10): "The record fading upwards transition
   * looks too harsh — just fade the album image on the disc during 2,1". So the
   * record is on the deck the whole time and only its label changes, which is
   * also what makes a change of record read as the SAME machine playing
   * something new.
   *
   * ⚠️ Do NOT merge it into the spin's `animation` — they would share
   * `animation-play-state`, which the spin pauses when the music stops.
   */
  labelFade?: string
  /**
   * The record following a swipe — see `DeckSlide`. Only the vinyl face takes
   * it (its record moves, its tonearm stays); `Deck` moves the others whole.
   */
  slide?: DeckSlide
  /** Grooves on the record — as many as its song is long (`lib/grooves.ts`). */
  grooves?: number
  /**
   * Drawn over the record and UNDER the pickup — the lyrics around the record
   * (James, 2026-09-11: "show them behind the record hand not in front").
   */
  underArm?: import('react').ReactNode
  /**
   * The transport, for a face whose drawing HAS buttons — the pocket player's
   * click wheel (James, 2026-09-16: "allow the user to tap on the controls to
   * pause, forward back a track"). Only the Now Playing deck passes it; the
   * mini player's deck is a picture.
   */
  controls?: DeckControls
}

export interface DeckControls {
  playing: boolean
  toggle(): void
  next(): void
  previous(): void
}

/** Where the drifting notes leave from, per deck: roughly, the pickup. */
export interface NotesAnchor {
  right: string
  top: string
}

/**
 * The shape of the frame a face wants.
 *
 * `ratio` is height ÷ width. `size` from `Deck` is always the WIDTH, so a face
 * that is not square (the cassette) shortens its own frame rather than floating
 * inside a square one.
 */
export interface DeckFrame {
  ratio: number
  radius: string
}

/**
 * The well the disc sits in, in the CD player's body: its sides as a share of
 * the body's WIDTH in from each edge, its top as a share of the HEIGHT down.
 * `CdDeck` draws it from these, and `seat` below says where that puts the disc,
 * for a change of disc that leaves the player where it is.
 */
export const CD_WELL = { side: 0.075, top: 0.045 }

const CD_RATIO = 1.1

/** Where the CD sits in a player `ratio` times as tall as it is wide — see `Seat`. */
function wellSeat(ratio: number) {
  const across = 1 - 2 * CD_WELL.side
  return { y: CD_WELL.top * ratio + across / 2 - ratio / 2, scale: across }
}

/**
 * Each deck's frame, and where its pickup is.
 *
 * ⚠️ Here rather than beside each face because a module that exports a
 * component AND a constant object breaks React Fast Refresh — the same reason
 * `usePrefersReducedMotion` is not in `Deck.tsx`, and eslint's
 * `react-refresh/only-export-components` says so out loud.
 *
 * ⚠️ Keyed by `DeckStyle`, so adding a medium to that union fails to compile
 * until it has a shape here AND a face in `Deck.tsx`'s table. A stored setting
 * that renders nothing looks exactly like a broken player.
 *
 * ⚠️ `radius` IS READ AS WELL AS PAINTED (2026-09-15): the lyrics round the
 * machine follow the outline it describes (`lib/outline.ts`, handed down by
 * `Deck` in `DeckOutlineContext`). Keep it the machine's real outline, and keep
 * to the part of the `border-radius` syntax `cornerRadii` reads — px or %, one
 * to four values, one optional `/`.
 */
export const SHAPES: Record<
  DeckStyle,
  {
    frame: DeckFrame
    notes: NotesAnchor
    /**
     * Where the medium sits when only it changes and the machine stays —
     * its centre's drop below the frame's middle and its size, both as a share
     * of the frame's WIDTH (`Seat` in `lib/transition.ts`). Only a machine you
     * take the medium out of has one; the record IS its deck.
     */
    seat?: { y: number; scale: number }
  }
> = {
  // A record fills its square, and it is round. The notes drift off the
  // headshell, which sits low and right.
  vinyl: { frame: { ratio: 1, radius: '50%' }, notes: { right: '4%', top: '58%' } },
  // ⚠️ A PORTABLE PLAYER, not a bare disc — so a rounded rectangle, slightly
  // taller than wide to leave room for the control strip along the bottom, and
  // NOT the `50%` circle this was until 2026-09-09. The radius here is what the
  // focus ring and the hover target take their shape from, so a circle around a
  // square body would put the ring nowhere near the object being aimed at. Its
  // notes leave the lid, upper right.
  // The disc sits in its well (`CD_WELL`), above the middle of the body.
  cd: { frame: { ratio: CD_RATIO, radius: '16%' }, notes: { right: '10%', top: '58%' }, seat: wellSeat(CD_RATIO) },
  // ⚠️ A shell is LANDSCAPE, so this frame is shorter than the size it is given
  // — the ratio is the frame's, not a margin inside a square one. A square
  // frame with a cassette floating in the middle puts the focus ring and the
  // hover target a long way from the thing you are aiming at, and leaves a hole
  // above and below the deck that nothing fills. Its notes leave the tape head,
  // low and centre.
  cassette: { frame: { ratio: 0.66, radius: '14px' }, notes: { right: '40%', top: '80%' } },
  // ⚠️ A CABINET, so this is the one frame that is TALLER than it is wide, and
  // the radius is an ARCH — two radii per corner, because a jukebox dome is
  // wider than it is tall and the single-value form would give it a circle.
  // The focus ring and the hover target take their shape from this string, so
  // it has to be the cabinet's outline and not an approximation of it.
  //
  // ⚠️ 1.24 is not free choice: the glass window is `aspect-square` at 70% of
  // the WIDTH (see `WINDOW` in `JukeboxDeck.tsx`), which eats 70/124 of the
  // height, and the selection panel and grille below it need the rest. Make the
  // cabinet squarer and the grille slides off the bottom edge.
  jukebox: {
    frame: { ratio: 1.24, radius: '46% 46% 10% 10% / 30% 30% 7% 7%' },
    notes: { right: '12%', top: '44%' },
  },
  // A pocket player is PORTRAIT — the 100 × 140 of `PocketDeck`'s own drawing —
  // and its corners are the body's. Its notes leave the screen, upper right.
  pocket: { frame: { ratio: 1.4, radius: '12% / 8.6%' }, notes: { right: '10%', top: '22%' } },
}
