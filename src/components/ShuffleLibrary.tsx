import { useMemo } from 'react'
import { ShuffleGlyph } from './AlbumView'
import { shuffleScope } from '../lib/shuffleScope'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type ListTab } from '../stores/settingsStore'

// Shuffle the list on screen, the way the tab you are on reads it (James,
// 2026-09-11: "Is there a shuffle all button e.g. shuffle all artists (plays the
// artist fully before moving on) / albums (plays full album before moving on) /
// tracks"). The same three shuffles as the Home Screen shortcuts
// (`shuffleQueue`): artists in a random order, each in full with their songs
// shuffled; albums in a random order, each whole and in running order; or
// every song.
//
// ⚠️ IT SHUFFLES WHAT THE LIST SHOWS, NOT THE LIBRARY (James, 2026-10-01:
// "shuffle the songs on the current view not just all library songs"). Inside
// a genre that is the genre; during a search, the results; and Albums honours
// "Full albums", Artists "Min. 3" — all worked out by `shuffleScope`, which
// uses the lists' own filters. It is shown during a search for that reason:
// it used to be hidden, because a whole-library shuffle under search results
// would not have been shuffling what was on the screen.

const COPY: Record<ListTab, { all: string; these: string; detail?: string }> = {
  artists: { all: 'Shuffle artists', these: 'Shuffle these artists', detail: 'Each artist in full, their songs shuffled' },
  albums: { all: 'Shuffle albums', these: 'Shuffle these albums', detail: 'Each album in full, in order' },
  tracks: { all: 'Shuffle all songs', these: 'Shuffle these songs' },
}

export default function ShuffleLibrary({ view, query, genre }: { view: ListTab; query: string; genre?: string }) {
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const fullAlbumsOnly = useSettingsStore((s) => s.fullAlbumsOnly)
  const artistsMin3 = useSettingsStore((s) => s.artistsMin3)

  const scope = useMemo(
    () => shuffleScope(view, { albums, tracks }, { query, genre, fullAlbumsOnly, artistsMin3 }),
    [view, albums, tracks, query, genre, fullAlbumsOnly, artistsMin3],
  )
  if (scope.tracks.length === 0) return null
  const copy = COPY[view]

  const start = () => {
    const player = usePlayerStore.getState()
    if (view === 'artists') player.shuffleArtists(scope.albums)
    else if (view === 'albums') player.shuffleAlbums(scope.albums)
    else player.shuffleSongs(scope.tracks)
  }

  // An icon beside the list options (James, 2026-09-11: "instead of the
  // shuffle button just put a button with the shuffle icon next to the
  // settings icon") — its label says which shuffle it is, and whether it is
  // the whole library or the list in front of you.
  const label = scope.narrowed ? copy.these : copy.all
  const says = copy.detail ? `${label} — ${copy.detail.toLowerCase()}` : label
  return (
    <button
      type="button"
      onClick={start}
      aria-label={says}
      title={says}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E05504] dark:text-slate-400 dark:hover:bg-slate-800"
    >
      <ShuffleGlyph />
    </button>
  )
}
