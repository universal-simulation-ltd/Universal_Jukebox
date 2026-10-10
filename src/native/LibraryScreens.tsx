// LibraryScreens.tsx — the phone app's three library tabs: Artists, Albums and
// Tracks. Above each, folded away until you pull down from the top (or tap
// the search button by the title): the search box, Shuffle, and the list
// options — A–Z / Random / Genre, the jukebox shelf, and the tab's filter
// (Full albums, Min. 3). They are the website's own settings (`libraryOrder`,
// `libraryColumns`, `fullAlbumsOnly`, `artistsMin3`, `genresMin3`), so the two
// agree, and the website's own components draw the shelf and the genre list —
// on Albums the shelf is square covers in their sleeves, records only peeking
// out (James, 2026-10-10). The plain A–Z / Random list is the phone's own.

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import AlbumGrid from '../components/AlbumGrid'
import ArtistList from '../components/ArtistList'
import Cover from '../components/Cover'
import GenreIndex from '../components/GenreIndex'
import TrackList from '../components/TrackList'
import { compareBase } from '../lib/collate'
import { plural } from '../lib/format'
import { GENRE_MIN, libraryInGenre } from '../lib/genres'
import { ARTIST_MIN, albumsOfBigArtists, columnsLabel, isFullAlbum, nextColumns, nextOrder, seededOrder, type LibraryOrder } from '../lib/libraryView'
import { navigate } from '../lib/route'
import { matchAlbums, matchArtistNames, matchTracks } from '../lib/search'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { DEFAULTS, useSettingsStore, type LibraryColumns, type ListTab } from '../stores/settingsStore'
import { IconBack, IconClose, IconMore, IconSearch, IconShuffle } from './icons'
import TrackOptions from '../components/TrackOptions'
import ResumeCard from '../components/ResumeCard'
import { haptic } from '../lib/haptics'
import { PullDrawer } from './PullDrawer'

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

export function SearchBox({
  query,
  setQuery,
  label,
  input,
  onClose,
}: {
  query: string
  setQuery(query: string): void
  label: string
  input?: React.Ref<HTMLInputElement>
  /** The ✕: clear the search and fold the drawer away. */
  onClose?: () => void
}) {
  return (
    <label className="jx-search">
      <IconSearch />
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose?.()
        }}
        placeholder={label}
        aria-label={label}
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {onClose && (
        <button
          type="button"
          className="jx-search-close"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          aria-label="Clear and close"
        >
          <IconClose />
        </button>
      )}
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
    columns,
    shelf: columns === 'jukebox',
    genreList: order.kind === 'genre' && !genre,
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
  filter,
  filterNote,
  children,
}: {
  title: string
  count: string
  onShuffle?: () => void
  tab: ListTab
  /** The tab's own filter pill (Full albums, Min. 3), if it has one. */
  filter?: ReactNode
  /** What that filter is set to, when it isn't the default — said under the title while the drawer is shut. */
  filterNote?: string | null
  children: ReactNode
} & ListProps) {
  // The drawer (PullDrawer): open by pulling down or the search button, and
  // kept open while there is a search.
  const [pulled, setPulled] = useState(false)
  const shown = pulled || query.trim() !== ''
  const input = useRef<HTMLInputElement>(null)
  const setSetting = useSettingsStore((s) => s.set)
  const columns = useSettingsStore((s) => s.libraryColumns)
  const genresMin3 = useSettingsStore((s) => s.genresMin3)
  const next = nextOrder(order)
  const orderLabel = (o: LibraryOrder) => (o.kind === 'az' ? 'A–Z' : o.kind === 'random' ? 'Random' : 'Genre')
  // The layout pill. Artists and Albums step through the website's cycle —
  // 2, 3, 4 per row, the jukebox shelf, then 1, which on a phone is a list —
  // and Tracks is the list or the shelf (James, 2026-10-10: "Artist should
  // show the 3 per row view by default (I can't find the option?)").
  const cols = columns[tab]
  const nextCols: LibraryColumns = tab === 'tracks' ? (cols === 'jukebox' ? 2 : 'jukebox') : nextColumns(cols)
  const layoutLabel = (c: LibraryColumns) => (c === 'jukebox' ? 'Jukebox' : tab === 'tracks' || c === 1 ? 'List' : columnsLabel(c))
  // With the drawer shut, what's changed from the usual is said under the
  // title, so a filtered or shuffled list never looks like a broken one.
  const notes = [
    order.kind !== DEFAULTS.libraryOrder[tab] ? orderLabel(order) : null,
    cols !== DEFAULTS.libraryColumns[tab] ? layoutLabel(cols) : null,
    filterNote ?? null,
  ].filter(Boolean)
  const openDrawer = useCallback(() => setPulled(true), [])

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
          <p className="jx-sub">{[count, ...(shown ? [] : notes)].join(' · ')}</p>
        </div>
        {!shown && (
          <button
            type="button"
            className="jx-round"
            onClick={() => {
              setPulled(true)
              // Focus in the same tap, or iOS won't raise the keyboard.
              input.current?.focus({ preventScroll: true })
            }}
            aria-label={`Search, shuffle and list options for ${title.toLowerCase()}`}
            title="Or pull down from the top"
          >
            <IconSearch />
          </button>
        )}
      </div>
      <PullDrawer shown={shown} onOpen={openDrawer}>
        <SearchBox
          input={input}
          query={query}
          setQuery={setQuery}
          label={`Search ${(genre ? `${genre} ` : '') + title.toLowerCase()}`}
          onClose={() => {
            setQuery('')
            setPulled(false)
            input.current?.blur()
          }}
        />
        <div className="jx-chips" role="group" aria-label="Play and list options">
          {onShuffle && (
            <button type="button" className="jx-chip play" onClick={onShuffle}>
              <IconShuffle /> Shuffle
            </button>
          )}
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
            className={`jx-chip${cols !== DEFAULTS.libraryColumns[tab] ? ' on' : ''}`}
            onClick={() => setSetting('libraryColumns', { ...columns, [tab]: nextCols })}
            aria-label={`${layoutLabel(cols)}. Tap for ${layoutLabel(nextCols)}`}
          >
            {layoutLabel(cols)}
          </button>
        </div>
      </PullDrawer>
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
      filterNote={fullOnly !== DEFAULTS.fullAlbumsOnly ? (fullOnly ? 'Full albums' : 'All albums') : null}
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
          {/* "Pick up where you left off" — the website puts it in its lists
              too; it draws nothing when there is nothing to resume. */}
          {!query.trim() && <ResumeCard />}
          <Nothing query={shown.length === 0 ? query : ''} />
          {layout.columns === 1 ? (
            <ul className="jx-list">
              {shown.slice(0, limit).map((album) => (
                <li key={album.id}>
                  <button type="button" className="jx-row" onClick={() => navigate({ view: 'album', albumId: album.id })}>
                    <Cover album={album} className="jx-thumb" />
                    <span>
                      <b>{album.title}</b>
                      <small>{[album.artist, album.year].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={`jx-grid n${layout.columns}`}>
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
          )}
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
      filterNote={min3 !== DEFAULTS.artistsMin3 ? (min3 ? `Min. ${ARTIST_MIN}` : 'All artists') : null}
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
          {!query.trim() && <ResumeCard />}
          <Nothing query={names.length === 0 ? query : ''} />
          <ul className={layout.columns === 1 ? 'jx-list' : `jx-grid n${layout.columns} artists`}>
            {names.slice(0, limit).map((name) => {
              const theirs = byArtist.get(name) ?? []
              const face = theirs.find((a) => a.cover) ?? theirs[0]
              return (
                <li key={name}>
                  {layout.columns === 1 ? (
                    <button type="button" className="jx-row" onClick={() => navigate({ view: 'artist', artist: name })}>
                      <Cover album={face} className="jx-thumb round" />
                      <span>
                        <b>{name}</b>
                        <small>{plural(theirs.length, 'album')}</small>
                      </span>
                    </button>
                  ) : (
                    <button type="button" className="jx-tile" onClick={() => navigate({ view: 'artist', artist: name })}>
                      <Cover album={face} className="jx-cover round" />
                      <b>{name}</b>
                      <small>{plural(theirs.length, 'album')}</small>
                    </button>
                  )}
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
    >
      {layout.genreList ? (
        <GenreIndex tab="tracks" query={query} />
      ) : layout.shelf || genre ? (
        <div className="jx-web"><TrackList query={query} order={layout.effective} genre={genre} /></div>
      ) : (
        <>
          {!query.trim() && <ResumeCard />}
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
 *
 * ⋯ at the end of a row, or holding the row, opens the website's own options
 * sheet (`TrackOptions`): play now, play next, add to the queue, add to a
 * shelf, go to the album.
 */
export function SongList({
  tracks,
  albums,
  onPlay,
  showAlbum = false,
  numbered = false,
  subtitle,
}: {
  tracks: Track[]
  albums: Album[]
  onPlay(index: number): void
  showAlbum?: boolean
  numbered?: boolean
  /** The row's second line, when it isn't the artist (and album). */
  subtitle?: (track: Track) => string
}) {
  const playingId = usePlayerStore((s) => currentTrack(s)?.id)
  const albumOf = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums])
  const [options, setOptions] = useState<number | null>(null)
  const hold = useRef<{ timer: number; fired: boolean } | null>(null)
  const startHold = (i: number) => {
    cancelHold()
    const h = { timer: 0, fired: false }
    h.timer = window.setTimeout(() => {
      h.fired = true
      haptic('tap')
      setOptions(i)
    }, HOLD_MS)
    hold.current = h
  }
  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer)
  }
  return (
    <>
      {options !== null && tracks[options] && (
        <TrackOptions track={tracks[options]} onPlay={() => onPlay(options)} onClose={() => setOptions(null)} />
      )}
      <ul className="jx-list">
        {tracks.map((track, i) => (
          <li key={track.id} className="jx-song">
            <button
              type="button"
              className={`jx-row${track.id === playingId ? ' on' : ''}`}
              onClick={() => {
                // A hold that opened the sheet is not also a tap.
                if (hold.current?.fired) return void (hold.current = null)
                onPlay(i)
              }}
              onPointerDown={(e) => { if (e.pointerType !== 'mouse') startHold(i) }}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => { e.preventDefault(); setOptions(i) }}
              aria-current={track.id === playingId ? 'true' : undefined}
            >
              {numbered ? (
                <span className="jx-no">{track.trackNo ?? i + 1}</span>
              ) : (
                <Cover album={albumOf.get(track.albumId)} className="jx-thumb" />
              )}
              <span>
                <b>{track.title}</b>
                <small>
                  {subtitle
                    ? subtitle(track)
                    : [track.artist ?? track.albumArtist, showAlbum ? track.album : null].filter(Boolean).join(' · ')}
                </small>
              </span>
            </button>
            <button type="button" className="jx-more" onClick={() => setOptions(i)} aria-label={`Options for ${track.title}`}>
              <IconMore />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/** How long a press is held before it opens a song's options, as on the Tracks shelf. */
const HOLD_MS = 450

function More({ left, onMore }: { left: number; onMore(): void }) {
  if (left <= 0) return null
  return (
    <button type="button" className="jx-btn" onClick={onMore}>
      Show {Math.min(left, PAGE).toLocaleString()} more
    </button>
  )
}
