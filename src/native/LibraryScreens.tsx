// LibraryScreens.tsx — the phone app's three library tabs: Albums (a grid of
// covers), Artists and Songs (lists). Each has the search box at its top, and a
// Shuffle that plays what the tab is showing.
//
// They read the same stores as the website's AlbumGrid / ArtistList /
// TrackList, and filter with the same `lib/search`, so a search finds the same
// songs on both; only the layout is the phone's own.

import { useMemo, useState } from 'react'
import Cover from '../components/Cover'
import { compareBase } from '../lib/collate'
import { plural } from '../lib/format'
import { navigate } from '../lib/route'
import { matchAlbums, matchArtistNames, matchTracks } from '../lib/search'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { IconSearch, IconShuffle } from './icons'

/** Rows drawn before "Show more": a phone lays out a few hundred rows instantly, not ten thousand. */
const PAGE = 300

interface SearchProps {
  query: string
  setQuery(query: string): void
}

export function SearchBox({ query, setQuery, label }: SearchProps & { label: string }) {
  return (
    <label className="jx-search">
      <IconSearch />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={label}
        aria-label={label}
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </label>
  )
}

function Heading({ title, count, onShuffle }: { title: string; count: string; onShuffle?: () => void }) {
  return (
    <div className="jx-heading">
      <div>
        <h1 className="jx-h1">{title}</h1>
        <p className="jx-sub">{count}</p>
      </div>
      {onShuffle && (
        <button type="button" className="jx-round" onClick={onShuffle} aria-label={`Shuffle ${title.toLowerCase()}`}>
          <IconShuffle />
        </button>
      )}
    </div>
  )
}

function Nothing({ query }: { query: string }) {
  return <p className="jx-empty">Nothing in your library matches “{query.trim()}”.</p>
}

export function AlbumsScreen({ query, setQuery }: SearchProps) {
  const albums = useLibraryStore((s) => s.albums)
  const shuffleAlbums = usePlayerStore((s) => s.shuffleAlbums)
  const sorted = useMemo(
    () => [...albums].sort((a, b) => compareBase(a.title, b.title)),
    [albums],
  )
  const shown = useMemo(() => matchAlbums(sorted, query), [sorted, query])
  const [limit, setLimit] = useState(PAGE)

  return (
    <div className="jx-page">
      <Heading title="Albums" count={plural(shown.length, 'album')} onShuffle={shown.length ? () => shuffleAlbums(shown) : undefined} />
      <SearchBox query={query} setQuery={setQuery} label="Search albums" />
      {shown.length === 0 && query.trim() ? <Nothing query={query} /> : null}
      <ul className="jx-grid">
        {shown.slice(0, limit).map((album) => (
          <li key={album.id}>
            <button type="button" className="jx-tile" onClick={() => navigate({ view: 'album', albumId: album.id })}>
              <Cover album={album} className="jx-cover" />
              <b>{album.title}</b>
              <small>{album.artist}</small>
            </button>
          </li>
        ))}
      </ul>
      <More left={shown.length - limit} onMore={() => setLimit((n) => n + PAGE)} />
    </div>
  )
}

export function ArtistsScreen({ query, setQuery }: SearchProps) {
  const albums = useLibraryStore((s) => s.albums)
  const shuffleArtists = usePlayerStore((s) => s.shuffleArtists)
  /** Each artist's albums, so a row can show a cover and a count. */
  const byArtist = useMemo(() => {
    const map = new Map<string, Album[]>()
    for (const album of albums) {
      const list = map.get(album.artist)
      if (list) list.push(album)
      else map.set(album.artist, [album])
    }
    return map
  }, [albums])
  const names = useMemo(
    () => matchArtistNames(albums, query).sort(compareBase),
    [albums, query],
  )
  const [limit, setLimit] = useState(PAGE)

  return (
    <div className="jx-page">
      <Heading
        title="Artists"
        count={plural(names.length, 'artist')}
        onShuffle={names.length ? () => shuffleArtists(names.flatMap((n) => byArtist.get(n) ?? [])) : undefined}
      />
      <SearchBox query={query} setQuery={setQuery} label="Search artists" />
      {names.length === 0 && query.trim() ? <Nothing query={query} /> : null}
      <ul className="jx-list">
        {names.slice(0, limit).map((name) => {
          const theirs = byArtist.get(name) ?? []
          return (
            <li key={name}>
              <button type="button" className="jx-row" onClick={() => navigate({ view: 'artist', artist: name })}>
                <Cover album={theirs.find((a) => a.cover) ?? theirs[0]} className="jx-thumb round" />
                <span>
                  <b>{name}</b>
                  <small>{plural(theirs.length, 'album')}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <More left={names.length - limit} onMore={() => setLimit((n) => n + PAGE)} />
    </div>
  )
}

export function SongsScreen({ query, setQuery }: SearchProps) {
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const shuffleSongs = usePlayerStore((s) => s.shuffleSongs)
  const sorted = useMemo(() => [...tracks].sort((a, b) => compareBase(a.title, b.title)), [tracks])
  const shown = useMemo(() => matchTracks(sorted, query), [sorted, query])
  const [limit, setLimit] = useState(PAGE)

  return (
    <div className="jx-page">
      <Heading title="Songs" count={plural(shown.length, 'song')} onShuffle={shown.length ? () => shuffleSongs(shown) : undefined} />
      <SearchBox query={query} setQuery={setQuery} label="Search songs" />
      {shown.length === 0 && query.trim() ? <Nothing query={query} /> : null}
      <SongList tracks={shown.slice(0, limit)} albums={albums} onPlay={(i) => playTracks(shown, i)} showAlbum />
      <More left={shown.length - limit} onMore={() => setLimit((n) => n + PAGE)} />
    </div>
  )
}

/**
 * Rows of songs. `onPlay` gets the row's index, and the caller decides what
 * the queue is — the whole search on Songs, the album on an album.
 */
export function SongList({
  tracks,
  albums,
  onPlay,
  showAlbum = false,
  numbered = false,
}: {
  tracks: Track[]
  albums: Album[]
  onPlay(index: number): void
  showAlbum?: boolean
  numbered?: boolean
}) {
  const playingId = usePlayerStore((s) => currentTrack(s)?.id)
  const albumOf = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums])
  return (
    <ul className="jx-list">
      {tracks.map((track, i) => (
        <li key={track.id}>
          <button
            type="button"
            className={`jx-row${track.id === playingId ? ' on' : ''}`}
            onClick={() => onPlay(i)}
            aria-current={track.id === playingId ? 'true' : undefined}
          >
            {numbered ? (
              <span className="jx-no">{track.trackNo ?? i + 1}</span>
            ) : (
              <Cover album={albumOf.get(track.albumId)} className="jx-thumb" />
            )}
            <span>
              <b>{track.title}</b>
              <small>{[track.artist ?? track.albumArtist, showAlbum ? track.album : null].filter(Boolean).join(' · ')}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function More({ left, onMore }: { left: number; onMore(): void }) {
  if (left <= 0) return null
  return (
    <button type="button" className="jx-btn" onClick={onMore}>
      Show {Math.min(left, PAGE).toLocaleString()} more
    </button>
  )
}
