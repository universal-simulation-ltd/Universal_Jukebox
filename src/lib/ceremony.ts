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
 * ⚠️ CURRENTLY ZERO — THE GATE IS OFF, ON PURPOSE (James, 2026-09-08).
 *
 * It was 90 seconds, picked against two behaviours: shuffling a whole library
 * (nearly every track is a different album) and browsing the grid (every click
 * is a different album). The argument was that without a cooldown the ceremony
 * stops being an arrival and becomes a 2.3-second toll booth.
 *
 * That argument was made without listening to it. James asked for the gate off
 * so he can find the real limit by using the app, so this is the ONE number to
 * change when he does — nothing else in the codebase encodes a rate limit, and
 * `shouldRunCeremony` still honours whatever this says. Put 90_000 back and the
 * old behaviour returns exactly, with the tests below to prove it.
 */
export const CEREMONY_COOLDOWN_MS = 0

export interface CeremonyDecision {
  mode: CeremonyMode
  /** `prefers-reduced-motion`. */
  reducedMotion: boolean
  /** Has a ceremony run at all this session? */
  ceremonyDone: boolean
  /** The album the last ceremony was run for. */
  lastAlbumId: string | null
  /**
   * The artist the last ceremony was run for, folded for comparison.
   *
   * Only `mode: 'artist'` reads it. Kept beside `lastAlbumId` rather than
   * derived from it because an album id does not carry the artist in a form
   * anything can compare — see `changeBetween` in `transition.ts`, which does
   * the same fold for the same reason.
   */
  lastArtist: string | null
  /** When the last ceremony started, epoch ms. 0 = never. */
  lastAt: number
  /** The album about to start. */
  albumId: string
  /** Its artist, folded the same way as `lastArtist`. */
  artist: string
  now: number
  /** Overrides `CEREMONY_COOLDOWN_MS`. Only the tests pass this. */
  cooldownMs?: number
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

  // ⚠️ 'always' is the DEFAULT. Putting a record on is what this app is, so
  // every deliberate play — a track in the list, a search result, an album —
  // goes to the deck and cues the arm. It is still only asked on an explicit
  // start, so a running queue stays silent whatever this says.
  if (d.mode === 'always') return true

  if (d.mode === 'first') return !d.ceremonyDone

  // 'artist' — a different artist from the one the last ceremony was for.
  //
  // ⚠️ No cooldown on this one, deliberately. The cooldown exists to stop a
  // stutter when consecutive plays are different RECORDS (browsing the grid,
  // shuffling a library); consecutive plays being different ARTISTS is already
  // rare enough that a second gate would only ever swallow a ceremony somebody
  // had earned.
  if (d.mode === 'artist') return d.lastArtist === null || d.artist !== d.lastArtist

  // 'album' — a different record from the one the last ceremony was for…
  if (d.lastAlbumId !== null && d.albumId === d.lastAlbumId) return false
  // …and not so soon after the last one that it reads as a stutter.
  return d.now - d.lastAt >= (d.cooldownMs ?? CEREMONY_COOLDOWN_MS)
}
