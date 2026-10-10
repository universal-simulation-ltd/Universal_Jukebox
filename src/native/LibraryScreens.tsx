// LibraryScreens.tsx — the phone app's three library tabs: Artists, Albums and
// Tracks. Each has the search box at its top, a Shuffle that plays what the
// tab is showing, and the list options behind the sliders button beside it:
// A–Z / Random / Genre, the jukebox shelf, and the tab's filter (Full albums,
// Min. 3). They are the website's own settings (`libraryOrder`,
// `libraryColumns`, `fullAlbumsOnly`, `artistsMin3`, `genresMin3`), so the two
// agree, and the website's own components draw the shelf and the genre list —
// on Albums the shelf is square covers in their sleeves, records only peeking
// out (James, 2026-10-10). The plain A–Z / Random list is the phone's own.

import { useMemo, useState, type ReactNode } from 'react'
import AlbumGrid from '../components/AlbumGrid'
import ArtistList from '../components/ArtistList'
import Cover from '../components/Cover'
import GenreIndex from '../components/GenreIndex'
import TrackList from '../components/TrackList'
import { compareBase } from '../lib/collate'
import { plural } from '../lib/format'
import { GENRE_MIN, libraryInGenre } from '../lib/genres'
import { ARTIST_MIN, albumsOfBigArtists, isFullAlbum, nextOrder, seededOrder, type LibraryOrder } from '../lib/libraryView'
import { navigate } from '../lib/route'
import { matchAlbums, matchArtistNames, matchTracks } from '../lib/search'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { DEFAULTS, useSettingsStore, type ListTab } from '../stores/settingsStore'
import { IconBack, IconOptions, IconSearch, IconShuffle } from './icons'

/** Rows drawn before "Show more": a phone lays out a few hundred rows instantly, not ten thousand. */
const PAGE = 300

export interface ListProps {
  query: string
  setQuery(query: string): void
  /** This tab's order — held by NativeApp so Random keeps its shuffle across tab switches. */
  order: LibraryOrder
  setOrder(order: LibraryOrder): void
  /** A genre opened from the genre list (`#/albums/genre/Blues`). */
  genre?: string
}

export function SearchBox({ query, setQuery, label }: { query: string; setQuery(query: string): void; label: string }) {
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

/**
 * What the screen is showing: the phone's own list, the website's shelf, or
 * the website's genre list. Inside a genre, "Genre" has done its job and the
 * genre's records are A–Z (the website's rule).
 */
function useLayout(tab: ListTab, order: LibraryOrder, genre?: string) {
  const columns = useSettingsStore((s) => s.libraryColumns[tab])
  const effective: LibraryOrder = genre && order.kind === 'genre' ? { kind: 'az' } : order
  return {
    effective,
    shelf: columns === 'jukebox',
    genreList: order.kind === 'genre' && !genre,
    /** Anything changed from the app's default — the dot on the options button. */
    changed: order.kind !== DEFAULTS.libraryOrder[tab] || columns !== DEFAULTS.libraryColumns[tab],
  }
}

/** The library (or the genre's part of it) the tab is looking at. */
function useSeen(genre?: string) {
  const albums = useLibraryStore((s) => s.albums)
  const tracks = useLibraryStore((s) => s.tracks)
  return useMemo(() => (genre ? libraryInGenre(albums, tracks, genre) : { albums, tracks }), [albums, tracks, genre])
}

function Screen({
  title,
  count,
  onShuffle,
  query,
  setQuery,
  genre,
  tab,
  order,
  setOrder,
  changed,
  filter,
  children,
}: {
  title: string
  count: string
  onShuffle?: () => void
  tab: ListTab
  changed: boolean
  /** The tab's own filter pill (Full albums, Min. 3), if it has one. */
  filter?: ReactNode
  children: ReactNode
} & ListProps) {
  const [open, setOpen] = useState(false)
  const setSetting = useSettingsStore((s) => s.set)
  const columns = useSettingsStore((s) => s.libraryColumns)
  const genresMin3 = useSettingsStore((s) => s.genresMin3)
  const shelf = columns[tab] === 'jukebox'
  const flat = tab === 'albums' ? 'Grid' : 'List'
  const next = nextOrder(order)
  const orderLabel = (o: LibraryOrder) => (o.kind === 'az' ? 'A–Z' : o.kind === 'random' ? 'Random' : 'Genre')
  /** Off the shelf goes back to the website's own layout for the tab, or a plain grid / list. */
  const unshelved = DEFAULTS.libraryColumns[tab] === 'jukebox' ? 2 : DEFAULTS.libraryColumns[tab]

  return (
    <div className="jx-page">
      {genre && (
        <button type="button" className="jx-back wide jx-genre-back" onClick={() => navigate({ view: tab })}>
          <IconBack />
          <span>Genres</span>
        </button>
      )}
      <div className="jx-heading">
        <div>
          <h1 className="jx-h1">{genre ?? title}</h1>
          <p className="jx-sub">{count}</p>
        </div>
        <div className="jx-heading-buttons">
          <button
            type="button"
            className={`jx-round${open ? ' on' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="List options"
          >
            <IconOptions />
            {changed && !open && <i className="jx-dot" aria-hidden />}
          </button>
          {onShuffle && (
            <button type="button" className="jx-round" onClick={onShuffle} aria-label={`Shuffle ${title.toLowerCase()}`}>
              <IconShuffle />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="jx-chips" role="group" aria-label="List options">
          <button
            type="button"
            className={`jx-chip${order.kind !== DEFAULTS.libraryOrder[tab] ? ' on' : ''}`}
            onClick={() => {
              setOrder(next)
              setSetting('libraryOrder', { ...useSettingsStore.getState().libraryOrder, [tab]: next.kind })
            }}
            aria-label={`${orderLabel(order)}. Tap for ${orderLabel(next)}`}
          >
            {orderLabel(order)}
          </button>
          {order.kind === 'genre' && !genre && (
            <button
              type="button"
              className={`jx-chip${genresMin3 !== DEFAULTS.genresMin3 ? ' on' : ''}`}
              onClick={() => setSetting('genresMin3', !genresMin3)}
            >
              {genresMin3 ? `Min. ${GENRE_MIN}` : 'All genres'}
            </button>
          )}
          {filter}
          <button
            type="button"
            className={`jx-chip${columns[tab] !== DEFAULTS.libraryColumns[tab] ? ' on' : ''}`}
            onClick={() => setSetting('libraryColumns', { ...columns, [tab]: shelf ? unshelved : 'jukebox' })}
            aria-label={shelf ? `Jukebox shelf. Tap for the ${flat.toLowerCase()}` : `${flat}. Tap for the jukebox shelf`}
          >
            {shelf ? 'Jukebox' : flat}
          </button>
        </div>
      )}
      <SearchBox query={query} setQuery={setQuery} label={`Search ${(genre ? `${genre} ` : '') + title.toLowerCase()}`} />
      {children}
    </div>
  )
}

function FilterChip({ on, isDefault, label, offLabel, onToggle }: { on: boolean; isDefault: boolean; label: string; offLabel: string; onToggle(): void }) {
  return (
    <button type="button" className={`jx-chip${isDefault ? '' : ' on'}`} onClick={onToggle}>
      {on ? label : offLabel}
    </button>
  )
}

function Nothing({ query }: { query: string }) {
  return query.trim() ? <p className="jx-empty">Nothing in your library matches “{query.trim()}”.</p> : null
}

export function AlbumsScreen(props: ListProps) {
  const { query, order, genre } = props
  const seen = useSeen(genre)
  const fullOnly = useSettingsStore((s) => s.fullAlbumsOnly)
  const setSetting = useSettingsStore((s) => s.set)
  const shuffleAlbums = usePlayerStore((s) => s.shuffleAlbums)
  const layout = useLayout('albums', order, genre)
  const shown = useMemo(() => {
    const pool = fullOnly ? seen.albums.filter(isFullAlbum) : seen.albums
    const ordered = layout.effective.kind === 'random' ? seededOrder(pool, (a) => a.id, layout.effective.seed) : [...pool].sort((a, b) => compareBase(a.title, b.title))
    return matchAlbums(ordered, query)
  }, [seen.albums, fullOnly, layout.effective, query])
  const [limit, setLimit] = useState(PAGE)

  return (
    <Screen
      {...props}
      tab="albums"
      title="Albums"
      count={plural(shown.length, 'album')}
      onShuffle={shown.length ? () => shuffleAlbums(shown) : undefined}
      changed={layout.changed || fullOnly !== DEFAULTS.fullAlbumsOnly}
      filter={
        <FilterChip
          on={fullOnly}
          isDefault={fullOnly === DEFAULTS.fullAlbumsOnly}
          label="Full albums"
          offLabel="All albums"
          onToggle={() => setSetting('fullAlbumsOnly', !fullOnly)}
        />
      }
    >
      {layout.genreList ? (
        <GenreIndex tab="albums" query={query} />
      ) : layout.shelf || genre ? (
        <div className="jx-web"><AlbumGrid query={query} order={layout.effective} genre={genre} /></div>
      ) : (
        <>
          <Nothing query={shown.length === 0 ? query : ''} />
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
        </>
      )}
    </Screen>
  )
}

export function ArtistsScreen(props: ListProps) {
  const { query, order, genre } = props
  const seen = useSeen(genre)
  const min3 = useSettingsStore((s) => s.artistsMin3)
  const setSetting = useSettingsStore((s) => s.set)
  const shuffleArtists = usePlayerStore((s) => s.shuffleArtists)
  const layout = useLayout('artists', order, genre)
  const pool = useMemo(() => (min3 ? albumsOfBigArtists(seen.albums) : seen.albums), [seen.albums, min3])
  /** Each artist's albums, so a row can show a cover and a count. */
  const byArtist = useMemo(() => {
    const map = new Map<string, Album[]>()
    for (const album of pool) {
      const list = map.get(album.artist)
      if (list) list.push(album)
      else map.set(album.artist, [album])
    }
    return map
  }, [pool])
  const names = useMemo(() => {
    const matched = matchArtistNames(pool, query)
    return layout.effective.kind === 'random' ? seededOrder(matched, (n) => n, layout.effective.seed) : matched.sort(compareBase)
  }, [pool, query, layout.effective])
  const [limit, setLimit] = useState(PAGE)

  return (
    <Screen
      {...props}
      tab="artists"
      title="Artists"
      count={plural(names.length, 'artist')}
      onShuffle={names.length ? () => shuffleArtists(names.flatMap((n) => byArtist.get(n) ?? [])) : undefined}
      changed={layout.changed || min3 !== DEFAULTS.artistsMin3}
      filter={
        <FilterChip
          on={min3}
          isDefault={min3 === DEFAULTS.artistsMin3}
          label={`Min. ${ARTIST_MIN}`}
          offLabel="All artists"
          onToggle={() => setSetting('artistsMin3', !min3)}
        />
      }
    >
      {layout.genreList ? (
        <GenreIndex tab="artists" query={query} />
      ) : layout.shelf || genre ? (
        <div className="jx-web"><ArtistList query={query} order={layout.effective} genre={genre} /></div>
      ) : (
        <>
          <Nothing query={names.length === 0 ? query : ''} />
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
        </>
      )}
    </Screen>
  )
}

export function SongsScreen(props: ListProps) {
  const { query, order, genre } = props
  const seen = useSeen(genre)
  const albums = useLibraryStore((s) => s.albums)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const shuffleSongs = usePlayerStore((s) => s.shuffleSongs)
  const layout = useLayout('tracks', order, genre)
  const shown = useMemo(() => {
    const ordered =
      layout.effective.kind === 'random'
        ? seededOrder(seen.tracks, (t) => t.id, layout.effective.seed)
        : [...seen.tracks].sort((a, b) => compareBase(a.title, b.title))
    return matchTracks(ordered, query)
  }, [seen.tracks, layout.effective, query])
  const [limit, setLimit] = useState(PAGE)

  return (
    <Screen
      {...props}
      tab="tracks"
      title="Tracks"
      count={plural(shown.length, 'track')}
      onShuffle={shown.length ? () => shuffleSongs(shown) : undefined}
      changed={layout.changed}
    >
      {layout.genreList ? (
        <GenreIndex tab="tracks" query={query} />
      ) : layout.shelf || genre ? (
        <div className="jx-web"><TrackList query={query} order={layout.effective} genre={genre} /></div>
      ) : (
        <>
          <Nothing query={shown.length === 0 ? query : ''} />
          <SongList tracks={shown.slice(0, limit)} albums={albums} onPlay={(i) => playTracks(shown, i)} showAlbum />
          <More left={shown.length - limit} onMore={() => setLimit((n) => n + PAGE)} />
        </>
      )}
    </Screen>
  )
}

/**
 * Rows of songs. `onPlay` gets the row's index, and the caller decides what
 * the queue is — the whole search on Tracks, the album on an album.
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
