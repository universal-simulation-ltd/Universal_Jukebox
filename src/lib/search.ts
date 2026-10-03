import { fold } from './format'
import type { Album, Track } from './types'

// What the search box matches, in ONE place.
//
// ⚠️ This file exists because the tab counts and the lists they count have to
// agree. `Tracks (2)` beside a list showing three rows is worse than no count
// at all: the number is the only reason to trust the tab you are NOT looking
// at. Each view used to hold its own inline `filter`, which meant the counts
// would have been a fourth copy of three subtly different rules — and drift
// between them is invisible until somebody notices the number is wrong.
//
// Everything folds through `format.fold` (lower-cased, accent-stripped,
// punctuation flattened), so "Bjork" finds "Björk" and "dont" finds "Don't".

// ── Folded text, once per object ─────────────────────────────────────────────
//
// Every keystroke used to fold (NFD + two regexes) three fields of every track
// — about 15,000 normalisations on a 5,000-song library — and twice over,
// once for the tab counts and once for the list. Tracks and albums are
// immutable (an edit replaces the object), so the folded text is cached per
// object and dies with it.
//
// Fields are joined with "\n", which `fold` can never produce (it only emits
// a–z, 0–9 and spaces), so a needle can match inside one field but never
// across two: the result is exactly the per-field `includes` it replaces.
const foldedTracks = new WeakMap<Track, string>()
const foldedAlbums = new WeakMap<Album, string>()
const foldedArtists = new WeakMap<Album, string>()

function trackText(t: Track): string {
  let text = foldedTracks.get(t)
  if (text === undefined) {
    text = `${fold(t.title)}\n${fold(t.artist ?? '')}\n${fold(t.album ?? '')}`
    foldedTracks.set(t, text)
  }
  return text
}

function albumText(a: Album): string {
  let text = foldedAlbums.get(a)
  if (text === undefined) {
    text = `${fold(a.title)}\n${artistText(a)}`
    foldedAlbums.set(a, text)
  }
  return text
}

function artistText(a: Album): string {
  let text = foldedArtists.get(a)
  if (text === undefined) {
    text = fold(a.artist)
    foldedArtists.set(a, text)
  }
  return text
}

/** Albums whose title or artist matches. Input order is preserved. */
export function matchAlbums(albums: Album[], query: string): Album[] {
  const needle = fold(query)
  if (!needle) return albums
  return albums.filter((a) => albumText(a).includes(needle))
}

/**
 * Tracks whose title, artist or album matches.
 *
 * ⚠️ The album is matched too, which is what makes searching an album name in
 * the Tracks tab give you its tracks rather than nothing.
 */
export function matchTracks(tracks: Track[], query: string): Track[] {
  const needle = fold(query)
  if (!needle) return tracks
  return tracks.filter((t) => trackText(t).includes(needle))
}

/**
 * The distinct artist NAMES matching, taken from the albums.
 *
 * An artist is a set of records here, not a set of songs — the same decision
 * `ArtistList` is built on, and the reason this counts albums rather than
 * tracks. Counting tracks would say "Artists (14)" over a list of two.
 */
export function matchArtistNames(albums: Album[], query: string): string[] {
  const needle = fold(query)
  const names = new Set<string>()
  for (const album of albums) {
    if (!needle || artistText(album).includes(needle)) names.add(album.artist)
  }
  return [...names]
}

export interface TabCounts {
  albums: number
  artists: number
  tracks: number
}

/** How many results each library tab holds for this query. */
export function tabCounts(albums: Album[], tracks: Track[], query: string): TabCounts {
  return {
    albums: matchAlbums(albums, query).length,
    artists: matchArtistNames(albums, query).length,
    tracks: matchTracks(tracks, query).length,
  }
}
