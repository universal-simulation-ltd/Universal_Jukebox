import type { CeremonyMode } from '../stores/settingsStore'

// When the record-changing ceremony runs.
//
// Pure, and in its own file, because this rule is the whole feature and it is
// the part that cannot be checked by clicking: "does it fire on a new album"
// takes two clicks to see, while "does it NOT fire eleven times during a
// shuffle" takes an hour of listening or one test.

/**
 * The shortest gap between two ceremonies, whatever else says yes.
 *
 * ⚠️ This is the limit that makes "on a new album" safe to offer at all.
 * Without it the rule is actively worse than once-per-session: shuffle a whole
 * library and nearly every track is a different album; browse the grid
 * auditioning records and every click is a different album. Either way the
 * ceremony stops being an arrival and becomes a 2.3-second toll booth on
 * everything you do.
 *
 * 90 seconds is picked against those two behaviours — long enough that a burst
 * of clicking yields exactly one, short enough that deliberately putting a
 * second record on always gets it.
 */
export const CEREMONY_COOLDOWN_MS = 90_000

export interface CeremonyDecision {
  mode: CeremonyMode
  /** `prefers-reduced-motion`. */
  reducedMotion: boolean
  /** Has a ceremony run at all this session? */
  ceremonyDone: boolean
  /** The album the last ceremony was run for. */
  lastAlbumId: string | null
  /** When the last ceremony started, epoch ms. 0 = never. */
  lastAt: number
  /** The album about to start. */
  albumId: string
  now: number
}

/**
 * Should starting this track run the ceremony?
 *
 * ⚠️ Only ever asked on an EXPLICIT start — pressing play on an album, a track
 * or a search result. `advance()` (next, previous, and the natural end of a
 * track) never asks, and that separation is what keeps the ceremony off the
 * path between two tracks of the same record. It is also why crossing an album
 * boundary *inside* a queue is silent: you did not put that record on, the
 * queue did, and interrupting a running queue with an animation is the
 * behaviour this whole rule exists to avoid.
 */
export function shouldRunCeremony(d: CeremonyDecision): boolean {
  if (d.mode === 'off') return false

  // The end state must be reachable without the transition — the rule every
  // app mark in the suite follows. Under reduced motion the arm is simply down
  // and the music starts.
  if (d.reducedMotion) return false

  if (d.mode === 'first') return !d.ceremonyDone

  // 'album' — a different record from the one the last ceremony was for…
  if (d.lastAlbumId !== null && d.albumId === d.lastAlbumId) return false
  // …and not so soon after the last one that it reads as a stutter.
  return d.now - d.lastAt >= CEREMONY_COOLDOWN_MS
}
