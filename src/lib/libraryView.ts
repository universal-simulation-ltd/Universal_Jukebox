// How the library's three lists are ordered and filtered — the A–Z / Random
// switch and "Full albums only" (James, 2026-09-10).

import type { Album } from './types'

/**
 * A–Z is each list's own alphabetical order (albums by artist then year,
 * artists by name, tracks by title). Random is a shuffle that holds still until
 * it is asked for again — the seed.
 */
export type LibraryOrder = { kind: 'az' } | { kind: 'random'; seed: number }

/**
 * A shuffle that holds still.
 *
 * ⚠️ Keyed, not `Math.random()` at render time: the lists re-render on every
 * tick of the player, and a random sort there would reshuffle the page under
 * your finger. Each item's place comes from its key and the seed, so the same
 * seed gives the same order — and an album a scan adds drops into place without
 * moving the rest.
 */
export function seededOrder<T>(items: readonly T[], key: (item: T) => string, seed: number): T[] {
  const rank = new Map<T, number>()
  for (const item of items) rank.set(item, hash(`${seed}:${key(item)}`))
  return [...items].sort((a, b) => rank.get(a)! - rank.get(b)!)
}

/** FNV-1a, 32-bit — spreads similar keys ("track 1", "track 2") far apart. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

/** "Full albums only": three tracks or more — past a single and its B-side. */
export const FULL_ALBUM_MIN = 3

export function isFullAlbum(album: Album): boolean {
  return album.trackCount >= FULL_ALBUM_MIN
}
