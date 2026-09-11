import { ShuffleGlyph } from './AlbumView'
import { isFullAlbum } from '../lib/libraryView'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type ListTab } from '../stores/settingsStore'

// Shuffle the whole library, the way the tab you are on reads it (James,
// 2026-09-11: "Is there a shuffle all button e.g. shuffle all artists (plays the
// artist fully before moving on) / albums (plays full album before moving on) /
// tracks"). The same three shuffles as the Home Screen shortcuts
// (`shuffleQueue`): artists in a random order, each in full with their songs
// shuffled; albums in a random order, each whole and in running order; or
// every song.
//
// ⚠️ Albums honours "Full albums only" — it shuffles what the tab lists. The
// button is not shown during a search (App.tsx): a whole-library shuffle under
// a list of search results would not be shuffling what is on the screen.

const COPY: Record<ListTab, { label: string; detail?: string }> = {
  artists: { label: 'Shuffle artists', detail: 'Each artist in full, their songs shuffled' },
  albums: { label: 'Shuffle albums', detail: 'Each album in full, in order' },
  tracks: { label: 'Shuffle all songs' },
}

export default function ShuffleLibrary({ view }: { view: ListTab }) {
  const trackCount = useLibraryStore((s) => s.tracks.length)
  const albums = useLibraryStore((s) => s.albums)
  const fullOnly = useSettingsStore((s) => s.fullAlbumsOnly)

  const onlyFull = view === 'albums' && fullOnly
  if (trackCount === 0 || (onlyFull && !albums.some(isFullAlbum))) return null
  const copy = COPY[view]

  const start = () => {
    const player = usePlayerStore.getState()
    if (view === 'artists') player.shuffleArtists()
    else if (view === 'albums') player.shuffleAlbums(onlyFull ? albums.filter(isFullAlbum) : undefined)
    else player.shuffleSongs()
  }

  // An icon beside the list options (James, 2026-09-11: "instead of the
  // shuffle button just put a button with the shuffle icon next to the
  // settings icon") — its label says which shuffle it is.
  const says = copy.detail ? `${copy.label} — ${copy.detail.toLowerCase()}` : copy.label
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
