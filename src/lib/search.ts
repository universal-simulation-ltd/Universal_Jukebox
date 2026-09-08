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

/** Albums whose title or artist matches. Input order is preserved. */
export function matchAlbums(albums: Album[], query: string): Album[] {
  const needle = fold(query)
  if (!needle) return albums
  return albums.filter(
    (a) => fold(a.title).includes(needle) || fold(a.artist).includes(needle),
  )
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
  return tracks.filter(
    (t) =>
      fold(t.title).includes(needle) ||
      fold(t.artist ?? '').includes(needle) ||
      fold(t.album ?? '').includes(needle),
  )
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
    if (!needle || fold(album.artist).includes(needle)) names.add(album.artist)
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
