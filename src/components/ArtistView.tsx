import { useMemo } from 'react'
import AddToQueue from './AddToQueue'
import AddToShelf from './AddToShelf'
import Cover from './Cover'
import { PlayGlyph, ShuffleGlyph } from './AlbumView'
import { plural, totalTime } from '../lib/format'
import { goHome, navigate } from '../lib/route'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import type { Album, Track } from '../lib/types'

// One artist: every album of theirs, and every song on them to play or shuffle
// (James, 2026-09-10: "Once inside the album though we could add a button to go
// to all albums by this artist and they can then play or shuffle all songs from
// that artist too"). Reached from the album page's "All N albums by …", since
// the Albums tab no longer folds an artist's records together.

export default function ArtistView({ name }: { name: string }) {
  const allAlbums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const shuffle = usePlayerStore((s) => s.shuffle)

  const albums = useMemo(() => allAlbums.filter((a) => a.artist === name).sort(byYearThenTitle), [allAlbums, name])

  /** Every song on their records: album by album as they were made, each in
   *  its running order. */
  const tracks = useMemo(() => {
    const byAlbum = new Map<string, Track[]>()
    for (const track of allTracks) {
      const list = byAlbum.get(track.albumId)
      if (list) list.push(track)
      else byAlbum.set(track.albumId, [track])
    }
    return albums.flatMap((album) => sortAlbumTracks(byAlbum.get(album.id) ?? []))
  }, [albums, allTracks])

  if (albums.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No albums by {name} in the library.</p>
        <button
          type="button"
          onClick={goHome}
          className="mt-3 text-sm font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
        >
          Back to your library
        </button>
      </div>
    )
  }

  /**
   * Shuffle turns shuffle ON and starts somewhere random. Starting on the first
   * song of their first album every time is not what shuffling a whole
   * discography is for.
   */
  const shuffleAll = () => {
    if (!shuffle) toggleShuffle()
    playTracks(tracks, Math.floor(Math.random() * tracks.length))
  }

  return (
    <div>
      <button
        type="button"
        onClick={goHome}
        className="mb-5 hidden items-center gap-1.5 text-[13px] text-slate-600 sm:inline-flex hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        Your library
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">{name}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
        {[plural(albums.length, 'album'), plural(tracks.length, 'song'), totalTime(tracks)].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => playTracks(tracks, 0)}
          disabled={tracks.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:opacity-50"
        >
          <PlayGlyph />
          Play all
        </button>
        <button
          type="button"
          onClick={shuffleAll}
          disabled={tracks.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
        >
          <ShuffleGlyph />
          Shuffle all
        </button>
        <AddToQueue tracks={tracks} />
        <AddToShelf tracks={tracks} variant="pill" />
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {albums.map((album) => (
          <li key={album.id}>
            <button
              type="button"
              onClick={() => navigate({ view: 'album', albumId: album.id })}
              className="group w-full text-left focus:outline-none"
            >
              <Cover
                album={album}
                className="aspect-square w-full shadow-sm ring-1 ring-slate-900/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-orange-600 dark:ring-white/10"
              />
              <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">
                {album.title}
              </p>
              <p className="line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
                {[album.year, plural(album.trackCount, 'track')].filter(Boolean).join(' · ')}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function byYearThenTitle(a: Album, b: Album): number {
  const year = (a.year ?? 9999) - (b.year ?? 9999)
  if (year !== 0) return year
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}
