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
