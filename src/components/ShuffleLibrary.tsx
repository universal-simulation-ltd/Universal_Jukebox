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

  return (
    // Centred on a phone (James, 2026-09-11), beside its line from `sm` up.
    <div className="mb-5 flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left">
      <button
        type="button"
        onClick={start}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
      >
        <ShuffleGlyph />
        {copy.label}
      </button>
      {copy.detail && <span className="text-[12px] text-slate-500 dark:text-slate-400">{copy.detail}</span>}
    </div>
  )
}
