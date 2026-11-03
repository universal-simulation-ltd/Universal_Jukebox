import type { Album, Track } from './types'

// The shuffles' orders, with no store and no i18n behind them — so Siri's
// planner (`src/siri/planner.ts`), run by JavaScriptCore on a locked iPhone,
// is built from exactly this code and cannot shuffle differently from the page.
// `lib/libraryView.ts` re-exports all of it.

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
export function hash(text: string): number {
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
