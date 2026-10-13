// "Remove from Jukebox" (James, 2026-10-13: "Long press on artist, album, or
// track should have an option to remove that item from Jukebox so it's no
// longer seen or playable").
//
// ⚠️ REMOVED FROM JUKEBOX, NOT DELETED. The file stays where it is, the stored
// catalogue keeps it, and a rescan finds it again — it is only never SHOWN.
// That is what makes it safe to offer on a long press: nothing here can lose
// anybody's music, and Tune ▸ Your library ▸ Removed from Jukebox puts each one
// back.
//
// ⚠️ ONE FILTER, AT THE STORE. `useLibraryStore` (`stores/libraryStore.ts`) is
// a filtered VIEW of the real store: every screen, search, shuffle, Up next,
// the shelves and the requests read the library through it, so a removed song
// is gone from all of them at once, and nobody adding a screen later has to
// remember to filter. The store's own code works on the whole catalogue.
//
// ⚠️ KEYS THAT SURVIVE A RESCAN:
//   • a song by its PATH, not its id — the id carries the file's size and
//     modified time, so re-tagging the file would bring it back;
//   • an album by its id (`albumKey`, from the tags);
//   • an artist by name, matching the song's artist OR album artist, so a
//     removed artist's guest spots on someone else's album go too.

import { create } from 'zustand'
import type { Album, Track } from './types'

export interface HiddenSet {
  /** Track paths. */
  tracks: string[]
  /** Album ids. */
  albums: string[]
  /** Artist names, exactly as shown. */
  artists: string[]
}

export type HiddenKind = keyof HiddenSet

export const NOTHING_HIDDEN: HiddenSet = { tracks: [], albums: [], artists: [] }

export function isEmpty(h: HiddenSet): boolean {
  return h.tracks.length === 0 && h.albums.length === 0 && h.artists.length === 0
}

/** A predicate for "is this track removed", built once per hidden set. */
export function trackHider(h: HiddenSet): (t: Track) => boolean {
  const paths = new Set(h.tracks)
  const albums = new Set(h.albums)
  const artists = new Set(h.artists)
  return (t) =>
    paths.has(t.path) ||
    albums.has(t.albumId) ||
    (!!t.artist && artists.has(t.artist)) ||
    (!!t.albumArtist && artists.has(t.albumArtist))
}

/**
 * The library as Jukebox shows it. Albums are recounted from the songs left,
 * and an album with none left goes, so a half-removed album says how many
 * songs it really has and an emptied one doesn't linger as a blank tile.
 *
 * Returns the SAME arrays when nothing is removed, so the view costs nothing
 * and re-renders nothing for everybody who never uses this.
 */
export function visibleLibrary(tracks: Track[], albums: Album[], h: HiddenSet): { tracks: Track[]; albums: Album[] } {
  if (isEmpty(h)) return { tracks, albums }
  const hidden = trackHider(h)
  const shown = tracks.filter((t) => !hidden(t))
  if (shown.length === tracks.length) return { tracks, albums }
  const counts = new Map<string, number>()
  for (const t of shown) counts.set(t.albumId, (counts.get(t.albumId) ?? 0) + 1)
  return {
    tracks: shown,
    albums: albums
      .filter((a) => (counts.get(a.id) ?? 0) > 0)
      .map((a) => (a.trackCount === counts.get(a.id) ? a : { ...a, trackCount: counts.get(a.id)! })),
  }
}

/**
 * A list written back through the VIEW, as the whole list: whatever the view
 * had filtered out is put back after it. Every writer outside the store's own
 * code (a learnt song length, a tidy-up) starts from the view's list, so
 * without this a removed song would drop out of the catalogue for good the
 * first time anybody else wrote to it.
 */
export function withFilteredOut<T extends { id: string }>(written: T[], whole: readonly T[], shown: readonly T[]): T[] {
  if (whole === shown) return written
  const seen = new Set(shown.map((x) => x.id))
  const given = new Set(written.map((x) => x.id))
  const back = whole.filter((x) => !seen.has(x.id) && !given.has(x.id))
  return back.length === 0 ? written : [...written, ...back]
}

/** Whatever was stored, as a hidden set — anything malformed is dropped, not trusted. */
export function parseHidden(raw: unknown): HiddenSet {
  if (!raw || typeof raw !== 'object') return { ...NOTHING_HIDDEN }
  const r = raw as Record<string, unknown>
  const strings = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x !== ''))] : [])
  return { tracks: strings(r.tracks), albums: strings(r.albums), artists: strings(r.artists) }
}

// ── The list, kept on the device ─────────────────────────────────────────────

const KEY = 'jukebox:hidden'

function read(): HiddenSet {
  try {
    return parseHidden(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return { ...NOTHING_HIDDEN }
  }
}

function persist(h: HiddenSet): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(h))
  } catch { /* storage full or off — removed until the app closes */ }
}

interface HiddenState {
  hidden: HiddenSet
  hide(kind: HiddenKind, key: string): void
  /** Put one back. */
  restore(kind: HiddenKind, key: string): void
}

export const useHiddenStore = create<HiddenState>((set, get) => ({
  hidden: read(),
  hide(kind, key) {
    const h = get().hidden
    if (h[kind].includes(key)) return
    const hidden = { ...h, [kind]: [...h[kind], key] }
    set({ hidden })
    persist(hidden)
  },
  restore(kind, key) {
    const h = get().hidden
    if (!h[kind].includes(key)) return
    const hidden = { ...h, [kind]: h[kind].filter((k) => k !== key) }
    set({ hidden })
    persist(hidden)
  },
}))
