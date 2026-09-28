import type { Album, Track } from './types'

// Sides of a record: an album's first half is side A, the rest side B — so
// when an album played in order crosses from the one to the other, the record
// on the deck is turned over (James, 2026-09-28, from the UX review).
//
// ⚠️ By TRACK NUMBER, not by running time. A real LP splits by minutes, but
// the file tags know the track order and the album's length, not where the
// cutting engineer put the break, and a guess that splits a two-part song
// across the flip is worse than an even count.

/** The fewest songs an album needs before it has two sides worth turning. */
export const SIDED_MIN_TRACKS = 4

/** The first track number of side B, or null for an album too short to have one. */
export function sideBStarts(trackCount: number): number | null {
  if (!Number.isFinite(trackCount) || trackCount < SIDED_MIN_TRACKS) return null
  return Math.floor(trackCount / 2) + 1
}

/**
 * Does going from `previous` to `next` cross from side A to side B of the
 * same record — the last song of the first half straight into the first of
 * the second, as an album played in order does? A jump, a shuffle, or a
 * different album is not a turn.
 */
export function turnsOver(previous: Track | null | undefined, next: Track | null | undefined, album: Album | undefined): boolean {
  if (!previous || !next || !album) return false
  if (previous.albumId !== album.id || next.albumId !== album.id) return false
  const b = sideBStarts(album.trackCount)
  if (b === null || previous.trackNo === undefined || next.trackNo === undefined) return false
  return previous.trackNo === b - 1 && next.trackNo === b
}
