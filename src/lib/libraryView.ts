// How the library's three lists are ordered and filtered — the A–Z / Random
// switch and "Full albums only" (James, 2026-09-10).

import type { Album, Track } from './types'
import { COLUMN_CYCLE, type LibraryColumns } from '../stores/settingsStore'
import { ORDER_KINDS, type OrderKind } from './order'

/**
 * A–Z is each list's own alphabetical order (albums by title,
 * artists by name, tracks by title). Random is a shuffle that holds still until
 * it is asked for again — the seed. Genre is not an order at all but a
 * GROUPING: one shelf per genre, A–Z within each (`lib/genres.ts`).
 */
export type LibraryOrder = { kind: 'az' } | { kind: 'random'; seed: number } | { kind: 'genre' }

// The kinds themselves live in `lib/order.ts`, which imports nothing — see the
// note there about the import cycle that costs.
export { ORDER_KINDS, type OrderKind } from './order'

/** The next order the pill moves to — A–Z → Random → Genre → A–Z. */
export function nextOrder(order: LibraryOrder): LibraryOrder {
  const kind = ORDER_KINDS[(ORDER_KINDS.indexOf(order.kind) + 1) % ORDER_KINDS.length]
  // Every visit to Random is a fresh shuffle, as it always was.
  return kind === 'random' ? { kind, seed: newSeed() } : { kind }
}

/** The order a stored preference names — a fresh shuffle each time for Random. */
export function orderFrom(kind: OrderKind): LibraryOrder {
  return kind === 'random' ? { kind, seed: newSeed() } : { kind }
}

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

/**
 * How the jukebox shelf splits (James, 2026-09-11: "limit each row to a max of
 * 10% of items and then have up to 10 rows so you can swipe down. if there were
 * just 20 tracks for instance, don't split them to multiple rows").
 *
 * No shelf shorter than `SHELF_MIN` — so a small library stays on one — and at
 * most `SHELF_MAX_ROWS`, which past 150 albums is a tenth of them on each. The
 * albums are dealt evenly, so the last shelf is never a stub.
 *   20 → 1 shelf · 30 → 2 · 100 → 6 · 150 → 10 of 15 · 2,000 → 10 of 200
 *
 * `maxRows` is the ceiling — ten for the records, `TRACK_SHELF_MAX_ROWS` for
 * the songs. `SHELF_MIN` still comes first, so a small library stays on one
 * shelf whatever the ceiling is: 20 songs → 1 shelf, 300 → 20 of 15.
 */
export const SHELF_MIN = 15
export const SHELF_MAX_ROWS = 10

/**
 * ⚠️ THE SONGS GET TWICE AS MANY SHELVES AS THE RECORDS DO, AND EVERY SONG
 * IS ON ONE (James, 2026-09-18: "on the tracks filter there should be 20
 * shelves with somewhat even distribution of tracks and random starting point
 * (like the rest) that covers all tracks not just the first x amount with show
 * all").
 *
 * There are far more songs than there are albums or artists — ten shelves of a
 * five-thousand-song library would be five hundred records on each, a shelf
 * nobody swipes to the end of. Twenty halves that, and the songs' shelf is the
 * one view that is no longer capped: `TrackList` hands `TrackShelf` the whole
 * matched list. What makes that affordable is that a shelf's records only enter
 * the DOM once the shelf comes near the screen — see `Shelf.tsx`.
 */
export const TRACK_SHELF_MAX_ROWS = 20

/**
 * How far a shelf may be from the even share — half again at most, half at
 * least. `varied` holds the shelves to it; the band itself is the 2026-09-11
 * variety rule, written down as a number so it can be enforced and tested.
 */
export const SHELF_SPREAD = 0.5

/**
 * ⚠️ WITH A `seed`, THE SHELVES ARE NOT ALL ONE LENGTH (James, 2026-09-11: "to
 * introduce some variety can we change the row size everytime … so the library
 * never looks the same and helps you find otherwise missed items"). The number
 * of shelves is the same; each one's length is drawn between about half and
 * one and a half times the even share, and they still add up to the whole list.
 * The same seed gives the same shelves — `Shelf.tsx` takes one per launch, so
 * the library holds still while you browse (and going back finds it as you
 * left it) and is different the next time the app opens.
 */
export function shelfRows<T>(items: readonly T[], seed?: number, maxRows: number = SHELF_MAX_ROWS): T[][] {
  const rows = Math.max(1, Math.min(maxRows, Math.floor(items.length / SHELF_MIN)))
  if (seed !== undefined && rows > 1) return cut(items, varied(items.length, rows, seed))
  // Dealt evenly: the first `extra` shelves take one more, so none is a stub.
  const base = Math.floor(items.length / rows)
  const extra = items.length % rows
  const out: T[][] = []
  let at = 0
  for (let r = 0; r < rows; r++) {
    const size = base + (r < extra ? 1 : 0)
    out.push(items.slice(at, at + size))
    at += size
  }
  return out.filter((row) => row.length > 0)
}

/**
 * Where each shelf OPENS — which record of its own it stands in the middle of.
 *
 * ⚠️ Random per shelf, not the brick-stagger it replaces (James, 2026-09-12:
 * "instead of staggering the shelves item 1 then item 2 have them random i.e.
 * top shelf might start on item 6 for aesthetics though always have shelf 1 or
 * 2 start with item one … all the other shelves 3+ should be random starting
 * position of that shelf"). The old rule alternated 1st, 2nd, 1st, 2nd, which
 * broke the vertical column but was itself a visible pattern once there were
 * ten shelves.
 *
 * ⚠️ ONE of the first two shelves always opens on its first record, and which
 * one is the coin flip. That is what keeps the top of the library from being
 * an arbitrary handful of records with no beginning in sight — you can always
 * see where the list starts, in one of the two places you are already looking.
 *
 * ⚠️ `pinFirst` is NOT the same rule, and the resume row is why it exists. When
 * `Shelf.tsx` has a `lead` — the artist or album you were listening to — that
 * item is put at the FRONT of the first shelf, so a first shelf that opened
 * anywhere else would hide the one record it was moved there to show. Then the
 * coin flip is off and shelf 1 takes item one; shelf 2 is random like the rest.
 *
 * Seeded, like everything else here: the same seed gives the same shelves in
 * the same places, so the library holds still while you browse and is laid out
 * afresh the next time the app opens.
 */
export function shelfStarts(lengths: readonly number[], seed: number, pinFirst = false): number[] {
  if (lengths.length === 0) return []
  // The one that shows item one: shelf 1 or shelf 2 — or shelf 1 outright when
  // there is a lead to show, or when it is the only shelf there is.
  const first = pinFirst || lengths.length < 2 ? 0 : hash(`${seed}:shelf-start-pin`) % 2
  return lengths.map((length, i) => {
    if (i === first || length <= 1) return 0
    return hash(`${seed}:shelf-start:${i}:${length}`) % length
  })
}

/**
 * Each shelf's length: its share of `count`, by weights from 0.5 to 1.5.
 *
 * ⚠️ THE WEIGHTS ARE SQUEEZED BACK INSIDE THAT BAND AFTER THE DRAW, and
 * without that the band above is not true. A shelf's share is its weight
 * divided by the weights' OWN MEAN, not by 1 — so a draw that happens to come
 * out low (twenty weights averaging 0.92 is unremarkable) made a 1.5 into a
 * 1.63, and 5,000 songs over twenty shelves put 405 records on one and 115 on
 * another. Three and a half times is not "somewhat even distribution" (James,
 * 2026-09-18), and it was never what this function said it did.
 *
 * So each shelf's distance from the even share is compressed by whatever factor
 * brings the FURTHEST one back to half: the shelves stay different lengths
 * (2026-09-11, and the point of this function), in the same order, and the
 * longest is now never more than half again the shortest's double.
 */
function varied(count: number, rows: number, seed: number): number[] {
  const drawn = Array.from({ length: rows }, (_, r) => 0.5 + (hash(`${seed}:shelf:${r}:${count}`) % 1001) / 1000)
  const mean = drawn.reduce((a, b) => a + b, 0) / rows
  const off = drawn.map((w) => w / mean - 1)
  const worst = Math.max(...off.map(Math.abs))
  const squeeze = worst > SHELF_SPREAD ? SHELF_SPREAD / worst : 1
  // Mean 1 by construction, so a weight IS its multiple of the even share.
  const weights = off.map((d) => 1 + d * squeeze)
  const total = weights.reduce((a, b) => a + b, 0)
  const exact = weights.map((w) => (count * w) / total)
  const sizes = exact.map((x) => Math.max(1, Math.floor(x)))
  // Largest remainders take what rounding down left over (or give back what
  // the floor of one cost), so the shelves hold every item exactly once.
  let left = count - sizes.reduce((a, b) => a + b, 0)
  const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r)
  for (let k = 0; left > 0; k = (k + 1) % rows, left--) sizes[byRemainder[k].i]++
  for (let k = rows - 1; left < 0; k = (k + rows - 1) % rows) {
    const i = byRemainder[k].i
    if (sizes[i] > 1) {
      sizes[i]--
      left++
    }
  }
  return sizes
}

function cut<T>(items: readonly T[], sizes: number[]): T[][] {
  const out: T[][] = []
  let at = 0
  for (const size of sizes) {
    out.push(items.slice(at, at + size))
    at += size
  }
  return out.filter((row) => row.length > 0)
}
