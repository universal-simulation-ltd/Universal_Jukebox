import type { CeremonyMode } from '../stores/settingsStore'
import type { Track } from './types'

// What happens BETWEEN two tracks — the other half of `ceremony.ts`.
//
// `ceremony.ts` answers "you pressed play on something: does the full
// record-changing animation run?". This answers "the queue moved on by itself:
// what should that sound and look like?", and the two are deliberately
// different questions with different answers. Nobody puts a record on between
// tracks four and five of the same album.
//
// The rule James asked for (2026-09-09), in his words:
//
//   Track changes, same album      crossfade the tracks, and have the needle
//                                  move into the start position as it's
//                                  beginning, with the player noise.
//   Track changes, different album fade out, fade in, an animation of one
//   or different artist            record lifting out and fading away with the
//                                  new one fading in, and the needle resetting.
//
// ⚠️ AND SINCE 2026-09-11 A CHANGE OF RECORD CROSSFADES TOO, BY DEFAULT (James:
// "crossfade with crackle by default — in the animation we could see it moving
// from one device sliding left to the other one sliding in from the right to
// show they're both playing until it's 100% new track … allow to change in
// settings"). `recordCrossfade` is that setting; off, a record change is the
// fade out / fade in sequence above.
//
// ⚠️ THE CROSSFADE IS NOT PART OF THE ANIMATION SETTING, and that separation is
// the one judgement call in this file. "How often should the animation appear"
// is about the picture and the noise it makes; whether two tracks of the same
// record butt together or blend is about the AUDIO, and somebody who turned the
// animation off asked for music that runs on without ceremony — which is
// exactly what a crossfade sounds like. Turning the animation off therefore
// leaves the blend alone. (Both fades still ride the user's own Fade in / Fade
// out settings, which are the controls for "I want a gap".)

/** What is different about the track that is arriving. */
export type Change =
  /** Another track from the record already on the deck. */
  | 'track'
  /** A different record by the same artist. */
  | 'album'
  /** A different artist entirely. */
  | 'artist'

/**
 * What changed between the outgoing track and the incoming one.
 *
 * ⚠️ Compares the ALBUM ARTIST first and falls back to the track artist, in
 * that order, because the alternative gets a compilation exactly backwards: on
 * a various-artists record every track has a different `artist` and the answer
 * "the artist changed, lift the record out" would be true eleven times in a
 * row, on one record that never left the deck. `albumArtist` is what the record
 * is filed under, which is what "a different artist" means here.
 *
 * With no outgoing track at all — the first thing played this session — the
 * answer is `artist`: everything about it is new.
 */
export function changeBetween(from: Track | null | undefined, to: Track): Change {
  if (!from) return 'artist'
  if (from.albumId === to.albumId) return 'track'
  return artistKey(from) === artistKey(to) ? 'album' : 'artist'
}

/**
 * Who a track is filed under.
 *
 * Exported because `ceremonyMode: 'artist'` compares artists on an EXPLICIT
 * play too (`playerStore` remembers the last one the ceremony ran for), and two
 * different folds would give the two paths different ideas of what a change of
 * artist is.
 *
 * Case- and space-insensitive, because "The Beatles" and "the beatles " are one
 * artist to a person and two to a `===`. Untagged files fall through to the
 * empty string, which makes a folder of them one artist rather than a
 * change-over on every track.
 */
export function artistKey(track: Track): string {
  return (track.albumArtist ?? track.artist ?? '').trim().toLowerCase()
}

export interface HandoverDecision {
  mode: CeremonyMode
  /** `prefers-reduced-motion`. */
  reducedMotion: boolean
  change: Change
  /** Settings → "Crossfade between records". Absent means off. */
  recordCrossfade?: boolean
}

/** What to actually do, as four independent switches. */
export interface Handover {
  /**
   * The two tracks genuinely overlap — the incoming one starts under the
   * outgoing one and they cross.
   *
   * Within an album always; between records only with "Crossfade between
   * records" on — off, a record change is "fade out, fade in", a sequence.
   */
  crossfade: boolean
  /** The pickup lifts, goes back to the start, and lands again. */
  needle: boolean
  /** The start-up cue — the thunk, the whirr, the play key — plays. */
  cue: boolean
  /** The record itself is changed: the old one lifts away, the new one fades in. */
  swap: boolean
}

/** Nothing happens: a straight cut, which is what the app did before all this. */
const CUT: Handover = { crossfade: false, needle: false, cue: false, swap: false }

/**
 * Decide the change-over.
 *
 * ⚠️ `first` behaves exactly like `off` here, and that is not an oversight.
 * "Once per visit" is a statement about the FIRST PLAY — the arrival — and a
 * queue moving on by itself is never that. Treating it as "animate every track
 * until one has been animated" would give the setting a completely different
 * meaning between the two files that read it.
 */
export function planHandover(d: HandoverDecision): Handover {
  // ⚠️ The blend is decided BEFORE the animation switches, because it does not
  // depend on them — see the note at the top of this file.
  const crossfade = d.change === 'track' || d.recordCrossfade === true

  if (d.reducedMotion || d.mode === 'off' || d.mode === 'first') return { ...CUT, crossfade }
  if (!animates(d.mode, d.change)) return { ...CUT, crossfade }

  return {
    crossfade,
    needle: true,
    cue: true,
    // Within an album the record does not change — only the needle moves. A
    // record lifting out and back in for track five of the same album is the
    // single most obviously wrong thing this feature could do.
    swap: d.change !== 'track',
  }
}

/**
 * Does the animation cover a change of this size?
 *
 * The modes are a FREQUENCY LADDER, most often to least: every track, then only
 * when the record changes, then only when the artist changes. Each rung
 * includes everything below it, because every artist change is also an album
 * change — which is why the two comparisons below are `>=` in spirit and not
 * equality.
 */
function animates(mode: CeremonyMode, change: Change): boolean {
  switch (mode) {
    case 'always':
      return true
    case 'album':
      return change === 'album' || change === 'artist'
    case 'artist':
      return change === 'artist'
    default:
      return false
  }
}

/**
 * How long `DeckSwiper` should slide the machines for — or null for "don't".
 *
 * ⚠️ THE SLIDE IS AN EVENT, AND IT WAS BEING READ AS A STATE (James,
 * 2026-09-15: "when choosing a track out of the library it shows the correct
 * disc with lyrics but then animates the same track coming in from the right").
 * `DeckSwiper` starts the slide from an effect keyed on the store's `blend`,
 * and an effect runs on MOUNT as well as on change. `blend` used to be set by
 * `startBlend` and never unset, so after the first record change of a session
 * every later mount replayed the slide — against whatever was current by then.
 * The cursor has long since moved to the arriving track, so what it drew was
 * the record already on the deck sliding out to the left while an identical one
 * arrived from the right. Playing from the library is the easiest way to see
 * it, because that opens Now Playing and so mounts a fresh swiper every time.
 *
 * The store now nulls `blend` the moment a blend ends, which is the real fix.
 * This is the other half, and it earns its place on a swiper that mounts PART
 * WAY through a genuine blend: slide over what is LEFT of it, not over its
 * whole length — and not at all when too little is left to read as a movement,
 * since a record flicking in from the edge is worse than no slide at all.
 */
export function blendSlideMs(
  blend: { ms: number; at: number } | null,
  now: number,
  /** The shortest slide worth running — `SETTLE_MS` at the call site. */
  leastMs: number,
): number | null {
  if (!blend) return null
  const left = blend.ms - (now - blend.at)
  return left >= leastMs ? Math.min(left, blend.ms) : null
}

/**
 * How many records one swipe crosses — the long-swipe rule (James, 2026-09-15:
 * "it would be good if the user could do a long swipe to move a few records
 * ahead in one motion").
 *
 * The FIRST record costs a whole travel — the distance from the deck's record
 * to the peek beside it, which is what a swipe has always cost and what the
 * hand already knows. Every record after that costs `extra` of one, because a
 * long swipe that charged full price per record would need three screen widths
 * of finger to reach five, and nobody has that much phone.
 *
 * This is the LANDING: `swipeReach` rounded to the nearest record, and never
 * less than one. A swipe lands on the record nearest the middle as the finger
 * lifts, which is the record the row is showing there.
 */
export function swipeSteps(pixels: number, travelPx: number, room: number, extra: number): number {
  if (room <= 0 || travelPx <= 0) return 0
  if (pixels <= travelPx || extra <= 0) return Math.min(1, room)
  return Math.max(1, Math.min(room, 1 + Math.round((pixels - travelPx) / (travelPx * extra))))
}

/**
 * How far along the row a drag has carried the records, in records — the
 * continuous half of `swipeSteps`, for drawing the drag rather than landing it.
 *
 * ⚠️ THE ROW MOVES, NOT JUST THE PEEK (James, 2026-09-15: "Could you queue up
 * another 1 or 2 records for the swipe to advance, so the user could do a
 * continuous swipe and go 2 records later"). Until then a long swipe moved the
 * records one place and changed the ART in the peek as the finger went on. Now
 * the records queued beyond each peek come in behind it, and the whole row is
 * this many places along. The prices are `swipeSteps`' — a whole travel for
 * the first record, `extra` of one for each after — so past the first record
 * the row runs ahead of the finger, which is what fits five on a phone.
 */
export function swipeReach(pixels: number, travelPx: number, room: number, extra: number): number {
  if (room <= 0 || travelPx <= 0 || pixels <= 0) return 0
  if (pixels <= travelPx || extra <= 0) return Math.min(1, pixels / travelPx)
  return Math.min(room, 1 + (pixels - travelPx) / (travelPx * extra))
}

/** How one record in the row around the deck is drawn — see `rowPose`. */
export interface RowPose {
  /** Pixels below the deck's level. */
  y: number
  /** Against the deck's own size. */
  scale: number
  opacity: number
}

/**
 * How a record in the row is drawn, by its place in it: `slot` 0 is the deck,
 * ±1 the peeks either side, ±2 the record queued beyond a peek, and anything
 * in between is part way through a move.
 *
 * ⚠️ ONE CURVE FOR EVERY RECORD. The deck's record leaving and the peek
 * arriving used to have a formula each — sinking on `progress²`, rising on
 * `1 − (1 − progress)²` — and those are one parabola seen from its two ends.
 * Written once, by place rather than by role, a record queued two places back
 * can come all the way on to the deck and out the other side on the same arc
 * the neighbours always used.
 *
 *   - `y`: the wheel's sag, all of it by a peek's place.
 *   - `scale`: the deck's size at 0, a peek's by ±1, and no smaller beyond.
 *   - `opacity`: 1 on the deck, a peek's 0.6 at ±1, and gone by ±2 — so a
 *     queued record fades in from the edge as it comes up to a peek's place,
 *     and never shows at rest, even where the screen has room beyond a peek.
 */
export function rowPose(slot: number, sag: number, peekScale: number): RowPose {
  const far = Math.abs(slot)
  const near = Math.min(1, far)
  return {
    y: sag * near * near,
    scale: 1 - (1 - peekScale) * near,
    opacity: far <= 1 ? 1 - 0.4 * far : Math.max(0, 0.6 * (2 - far)),
  }
}
