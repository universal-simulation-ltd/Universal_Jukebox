// DetailScreens.tsx — one album, one artist. The cover big at the top, Play
// and Shuffle under it, then the songs. Play puts the record on, and the
// player store takes you to the deck (`showTheDeck`), as on the website.

import { useMemo } from 'react'
import Cover from '../components/Cover'
import { compareBase } from '../lib/collate'
import { plural, totalTime } from '../lib/format'
import { navigate } from '../lib/route'
import type { Album } from '../lib/types'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { IconPlay, IconShuffle } from './icons'
import { SongList } from './LibraryScreens'

function usePlayShuffle() {
  const playTracks = usePlayerStore((s) => s.playTracks)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  return {
    playTracks,
    // Shuffle turns shuffle ON and starts, never off — a Shuffle button that
    // sometimes un-shuffles is a button nobody trusts (AlbumView's rule).
    shuffleThese: (tracks: Parameters<typeof playTracks>[0]) => {
      if (!shuffle) toggleShuffle()
      playTracks(tracks, Math.floor(Math.random() * tracks.length))
    },
  }
}

function Actions({ onPlay, onShuffle }: { onPlay(): void; onShuffle(): void }) {
  return (
    <div className="jx-actions">
      <button type="button" className="jx-btn primary" onClick={onPlay}>
        <IconPlay /> Play
      </button>
      <button type="button" className="jx-btn" onClick={onShuffle}>
        <IconShuffle /> Shuffle
      </button>
    </div>
  )
}

export function AlbumScreen({ albumId }: { albumId: string }) {
  const albums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const album = albums.find((a) => a.id === albumId)
  const tracks = useMemo(() => sortAlbumTracks(allTracks.filter((t) => t.albumId === albumId)), [allTracks, albumId])
  const { playTracks, shuffleThese } = usePlayShuffle()

  if (!album) return <p className="jx-empty">This album isn’t in your library any more.</p>

  return (
    <div className="jx-page">
      <div className="jx-hero">
        <Cover album={album} className="jx-hero-cover" />
        <h1 className="jx-h1">{album.title}</h1>
        <button type="button" className="jx-link" onClick={() => navigate({ view: 'artist', artist: album.artist })}>
          {album.artist}
        </button>
        <p className="jx-sub">{[album.year, plural(tracks.length, 'song'), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      <Actions onPlay={() => playTracks(tracks, 0)} onShuffle={() => shuffleThese(tracks)} />
      <SongList tracks={tracks} albums={albums} onPlay={(i) => playTracks(tracks, i)} numbered />
    </div>
  )
}

export function ArtistScreen({ name }: { name: string }) {
  const allAlbums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const albums = useMemo(() => allAlbums.filter((a) => a.artist === name).sort(byYearThenTitle), [allAlbums, name])
  /** Every song of theirs, album by album, oldest album first. */
  const tracks = useMemo(() => {
    const byAlbum = new Map(albums.map((a) => [a.id, [] as typeof allTracks]))
    for (const track of allTracks) byAlbum.get(track.albumId)?.push(track)
    return albums.flatMap((a) => sortAlbumTracks(byAlbum.get(a.id) ?? []))
  }, [albums, allTracks])
  const { playTracks, shuffleThese } = usePlayShuffle()

  if (albums.length === 0) return <p className="jx-empty">This artist isn’t in your library any more.</p>

  return (
    <div className="jx-page">
      <div className="jx-hero">
        <h1 className="jx-h1">{name}</h1>
        <p className="jx-sub">{[plural(albums.length, 'album'), plural(tracks.length, 'song'), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      <Actions onPlay={() => playTracks(tracks, 0)} onShuffle={() => shuffleThese(tracks)} />
      <ul className="jx-grid">
        {albums.map((album) => (
          <li key={album.id}>
            <button type="button" className="jx-tile" onClick={() => navigate({ view: 'album', albumId: album.id })}>
              <Cover album={album} className="jx-cover" />
              <b>{album.title}</b>
              <small>{[album.year, plural(album.trackCount, 'song')].filter(Boolean).join(' · ')}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function byYearThenTitle(a: Album, b: Album): number {
  const year = (a.year ?? 9999) - (b.year ?? 9999)
  return year !== 0 ? year : compareBase(a.title, b.title)
}
