// How the library's three lists are ordered and filtered — the A–Z / Random
// switch and "Full albums only" (James, 2026-09-10).

import type { Album, Track } from './types'
import { COLUMN_CYCLE, type LibraryColumns } from '../stores/settingsStore'

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

export type ShuffleKind = 'songs' | 'albums' | 'artists'

/**
 * The Home Screen's three shuffles (James, 2026-09-11), as queues:
 *   songs    every track, in a random order;
 *   albums   the albums in a random order, each played WHOLE, in running order —
 *            "it would play a whole album before the next one";
 *   artists  the artists in a random order, one after another, each one's songs
 *            shuffled — "a whole artists (shuffling all their songs)".
 *
 * Pure: `runningOrder` puts one album's tracks in order (`sortAlbumTracks`).
 */
export function shuffleQueue(
  kind: ShuffleKind,
  tracks: readonly Track[],
  albums: readonly Album[],
  seed: number,
  runningOrder: (tracks: Track[]) => Track[],
): Track[] {
  if (kind === 'songs') return seededOrder(tracks, (t) => t.id, seed)
  const byAlbum = new Map<string, Track[]>()
  for (const track of tracks) {
    const list = byAlbum.get(track.albumId)
    if (list) list.push(track)
    else byAlbum.set(track.albumId, [track])
  }
  const present = albums.filter((album) => byAlbum.has(album.id))
  if (kind === 'albums') {
    return seededOrder(present, (album) => album.id, seed).flatMap((album) => runningOrder(byAlbum.get(album.id) ?? []))
  }
  const byArtist = new Map<string, Track[]>()
  for (const album of present) {
    const list = byArtist.get(album.artist) ?? []
    list.push(...(byAlbum.get(album.id) ?? []))
    byArtist.set(album.artist, list)
  }
  return seededOrder([...byArtist.keys()], (name) => name, seed).flatMap((name) =>
    seededOrder(byArtist.get(name) ?? [], (t) => t.id, seed + 1),
  )
}

/**
 * The grid for each "per row" setting — the phone's count, and a proportionate
 * step up at each wider breakpoint. Whole class strings, so Tailwind finds them.
 * The shelf is not a grid; where a grid is wanted anyway (the artists) it is 2.
 */
export function gridClass(columns: LibraryColumns): string {
  switch (columns) {
    case 1:
      return 'grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    case 3:
      return 'grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
    case 4:
      return 'grid grid-cols-4 gap-x-2.5 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8'
    default:
      return 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  }
}

/** The next setting the "per row" button moves to. */
export function nextColumns(columns: LibraryColumns): LibraryColumns {
  const i = COLUMN_CYCLE.indexOf(columns)
  return COLUMN_CYCLE[(i + 1) % COLUMN_CYCLE.length]
}

export function columnsLabel(columns: LibraryColumns): string {
  return columns === 'jukebox' ? 'Jukebox shelf' : `${columns} per row`
}
