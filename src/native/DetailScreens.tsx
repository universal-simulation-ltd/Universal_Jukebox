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
import { currentTrack, showTheDeck, usePlayerStore } from '../stores/playerStore'
import AddToQueue from '../components/AddToQueue'
import AddToShelf from '../components/AddToShelf'
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

/** Play and Shuffle, then the website's own "add all of these" buttons: to a
 *  shelf, and to the queue (that one only once something is playing). */
function Actions({ tracks, onPlay, onShuffle }: { tracks: Parameters<typeof AddToShelf>[0]['tracks']; onPlay(): void; onShuffle(): void }) {
  return (
    <div className="jx-actions-wrap">
      <div className="jx-actions">
        <button type="button" className="jx-btn primary" onClick={onPlay}>
          <IconPlay /> Play
        </button>
        <button type="button" className="jx-btn" onClick={onShuffle}>
          <IconShuffle /> Shuffle
        </button>
      </div>
      <div className="jx-actions-more">
        <AddToShelf tracks={tracks} variant="pill" />
        <AddToQueue tracks={tracks} variant="pill" />
      </div>
    </div>
  )
}

export function AlbumScreen({ albumId }: { albumId: string }) {
  const albums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const album = albums.find((a) => a.id === albumId)
  const tracks = useMemo(() => sortAlbumTracks(allTracks.filter((t) => t.albumId === albumId)), [allTracks, albumId])
  const { playTracks, shuffleThese } = usePlayShuffle()
  const onTheDeck = usePlayerStore((s) => currentTrack(s)?.albumId === albumId)

  if (!album) return <p className="jx-empty">This album isn’t in your library any more.</p>

  return (
    <div className="jx-page">
      <div className="jx-hero">
        {/* The cover opens the jukebox: puts the record on, or — when it is
            already turning — just goes to it (AlbumView's rule: never lose
            your place by tapping the picture of what is playing). */}
        <button
          type="button"
          className="jx-hero-open"
          onClick={() => (onTheDeck ? showTheDeck() : playTracks(tracks, 0))}
          aria-label={onTheDeck ? 'Go to the record' : `Play ${album.title} on the jukebox`}
        >
          <Cover album={album} className="jx-hero-cover" />
        </button>
        <h1 className="jx-h1">{album.title}</h1>
        <button type="button" className="jx-link" onClick={() => navigate({ view: 'artist', artist: album.artist })}>
          {album.artist}
        </button>
        <p className="jx-sub">{[album.year, plural(tracks.length, 'track'), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      <Actions tracks={tracks} onPlay={() => playTracks(tracks, 0)} onShuffle={() => shuffleThese(tracks)} />
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
  const albumYear = useMemo(() => new Map(albums.map((a) => [a.id, a.year])), [albums])

  if (albums.length === 0) return <p className="jx-empty">This artist isn’t in your library any more.</p>

  return (
    <div className="jx-page">
      <div className="jx-hero">
        <h1 className="jx-h1">{name}</h1>
        <p className="jx-sub">{[plural(albums.length, 'album'), plural(tracks.length, 'track'), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      <Actions tracks={tracks} onPlay={() => playTracks(tracks, 0)} onShuffle={() => shuffleThese(tracks)} />
      <ul className="jx-grid">
        {albums.map((album) => (
          <li key={album.id}>
            <button type="button" className="jx-tile" onClick={() => navigate({ view: 'album', albumId: album.id })}>
              <Cover album={album} className="jx-cover" />
              <b>{album.title}</b>
              <small>{[album.year, plural(album.trackCount, 'track')].filter(Boolean).join(' · ')}</small>
            </button>
          </li>
        ))}
      </ul>
      {/* Every song of theirs, album by album — the website's "All songs by …"
          page, here under their albums. Playing one plays on from it through
          the rest. */}
      <p className="jx-label">All tracks</p>
      <SongList
        tracks={tracks}
        albums={allAlbums}
        onPlay={(i) => playTracks(tracks, i)}
        subtitle={(t) => [t.album, albumYear.get(t.albumId)].filter(Boolean).join(' · ')}
      />
    </div>
  )
}

function byYearThenTitle(a: Album, b: Album): number {
  const year = (a.year ?? 9999) - (b.year ?? 9999)
  return year !== 0 ? year : compareBase(a.title, b.title)
}
