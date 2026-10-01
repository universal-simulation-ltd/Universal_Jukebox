import { libraryInGenre } from './genres'
import { albumsOfBigArtists, isFullAlbum } from './libraryView'
import { matchAlbums, matchArtistNames, matchTracks } from './search'
import type { Album, Track } from './types'
import type { ListTab } from '../stores/settingsStore'

// What the shuffle button beside the list options shuffles: the list ON SCREEN
// (James, 2026-10-01: "make the shuffle button here shuffle the songs on the
// current view not just all library songs" — over a genre's Tracks tab).
//
// ⚠️ THE SAME FILTERS THE LISTS USE, IN THE SAME ORDER — `libraryInGenre`, then
// "Full albums" / "Min. 3", then `matchTracks` / `matchAlbums` /
// `matchArtistNames` — so the shuffle can never hold a song the list doesn't,
// or miss one it does. A private copy of any of these rules would drift from
// the list without anything failing.
//
//   tracks   the songs listed — inside a genre, only the songs in it.
//   albums   the albums listed, each WHOLE (an album is in a genre if any of
//            its songs is, and keeps all of them — the rule the grid shows).
//   artists  the artists listed, each with the albums the list counts for them.

export interface ShuffleScope {
  /** The songs to shuffle — every song of `albums` for the album/artist shuffles. */
  tracks: Track[]
  /** For the album/artist shuffles: which albums, in which artists. */
  albums: Album[]
  /** True when this is less than the whole library — the label says "these". */
  narrowed: boolean
}

export interface ShuffleView {
  query: string
  /** A genre opened from the genre list (`route.genre`). */
  genre?: string
  fullAlbumsOnly: boolean
  artistsMin3: boolean
}

export function shuffleScope(
  tab: ListTab,
  library: { albums: readonly Album[]; tracks: readonly Track[] },
  view: ShuffleView,
): ShuffleScope {
  const seen = view.genre
    ? libraryInGenre(library.albums, library.tracks, view.genre)
    : { albums: [...library.albums], tracks: [...library.tracks] }
  const searching = view.query.trim() !== ''
  const narrowed = Boolean(view.genre) || searching

  if (tab === 'tracks') {
    return { tracks: matchTracks(seen.tracks, view.query), albums: [], narrowed }
  }

  // An album comes whole, so its songs are the LIBRARY's, not just the
  // genre's — the same as opening it from the grid.
  const songsOf = (albums: Album[]) => {
    const ids = new Set(albums.map((a) => a.id))
    return library.tracks.filter((t) => ids.has(t.albumId))
  }

  if (tab === 'albums') {
    const pool = view.fullAlbumsOnly ? seen.albums.filter(isFullAlbum) : seen.albums
    const albums = matchAlbums(pool, view.query)
    return { tracks: songsOf(albums), albums, narrowed: narrowed || view.fullAlbumsOnly }
  }

  const pool = view.artistsMin3 ? albumsOfBigArtists(seen.albums) : seen.albums
  const names = new Set(matchArtistNames(pool, view.query))
  const albums = pool.filter((a) => names.has(a.artist))
  return { tracks: songsOf(albums), albums, narrowed: narrowed || view.artistsMin3 }
}
