// LibraryScreens.tsx — the phone app's three library tabs: Artists, Albums and
// Tracks. Above each, folded away until you pull down from the top or tap the
// tab you're already on (no button for it: the screen stays clean, James
// 2026-10-10 and 2026-10-17): the search box,
// Shuffle, and the list
// options — A–Z / Random / Genre, the jukebox shelf, and the tab's filter
// (Full albums, Min. 3). They are the website's own settings (`libraryOrder`,
// `libraryColumns`, `fullAlbumsOnly`, `artistsMin3`, `genresMin3`), so the two
// agree, and the website's own components draw the shelf and the genre list —
// on Albums the shelf is square covers in their sleeves, records only peeking
// out (James, 2026-10-10). The plain A–Z / Random list is the phone's own.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import AlbumGrid from '../components/AlbumGrid'
import ArtistList from '../components/ArtistList'
import Cover from '../components/Cover'
import GenreIndex from '../components/GenreIndex'
import TrackList from '../components/TrackList'
import { compareName } from '../lib/collate'
import { shownName } from '../lib/format'
import { useT } from '../i18n'
import { GENRE_MIN, libraryInGenre, shownGenre } from '../lib/genres'
import { ARTIST_MIN, albumsOfBigArtists, columnsLabel, isFullAlbum, nextColumns, nextOrder, seededOrder, type LibraryOrder } from '../lib/libraryView'
import { navigate } from '../lib/route'
import { matchAlbums, matchArtistNames, matchTracks } from '../lib/search'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type LibraryColumns, type ListTab } from '../stores/settingsStore'
import { IconBack, IconClose, IconMore, IconPreview, IconSearch, IconShuffle, IconStop } from './icons'
import { PREVIEW_RUN_SEC, PREVIEW_START_SEC } from '../lib/audio'
import TrackOptions from '../components/TrackOptions'
import ResumeCard from '../components/ResumeCard'
import { haptic } from '../lib/haptics'
import { useCollectionHold } from './CollectionHold'
import { PullDrawer } from './PullDrawer'
import { markTipSeen, useHintTurn } from '../lib/tips'
import { makeDefault, useHold, useListDefaults } from './listDefaults'

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
  /** While searching, how many each library tab has (the tab bar's counts, held by NativeApp). */
  counts?: Record<ListTab, number> | null
}

const FOUND_TABS: { tab: ListTab; label: 'native.tab_artists' | 'native.tab_albums' | 'native.tab_tracks' }[] = [
  { tab: 'artists', label: 'native.tab_artists' },
  { tab: 'albums', label: 'native.tab_albums' },
  { tab: 'tracks', label: 'native.tab_tracks' },
]

/**
 * While searching: Artists 3 · Albums 5 · Tracks 12, right under the box. The
 * same counts are on the tab bar, but the keyboard covers that (James,
 * 2026-10-11: "it's covered by the keyboard. What can we do?"). A tap goes to
 * that tab with the same search.
 */
function FoundIn({ tab, counts, genre }: { tab: ListTab; counts: Record<ListTab, number>; genre?: string }) {
  const t = useT()
  return (
    <div className="jx-found" role="group" aria-label={t('native.found_in')}>
      {FOUND_TABS.map(({ tab: target, label }) => (
        <button
          key={target}
          type="button"
          className={`jx-found-tab${target === tab ? ' on' : ''}${counts[target] === 0 ? ' none' : ''}`}
          aria-current={target === tab ? 'page' : undefined}
          aria-label={`${t(label)}, ${t.plural('native.tab_count_found', counts[target])}`}
          onClick={() => { if (target !== tab) navigate(genre ? { view: target, genre } : { view: target }) }}
        >
          <span>{t(label)}</span>
          <b>{t.num(counts[target])}</b>
        </button>
      ))}
    </div>
  )
}

/** Sent by the tab bar (`NativeApp`'s `tapTab`): open the search drawer, or shut it again. */
export const OPEN_SEARCH = 'jukebox:open-search'
export const SHUT_SEARCH = 'jukebox:shut-search'

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
  const t = useT()
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
          aria-label={t('native.clear_and_close')}
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
  searchLabel,
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
  counts,
  children,
}: {
  title: string
  /** The search box's placeholder: "Search albums", "Search Blues albums". */
  searchLabel: string
  count: string
  onShuffle?: () => void
  tab: ListTab
  /** The tab's own filter pill (Full albums, Min. 3), if it has one: handed the hold, so it can be made a default too. */
  filter?: (hold: ReturnType<typeof useHold>, setAsDefault: (label: string, patch: Parameters<typeof makeDefault>[0]) => void) => ReactNode
  /** What that filter is set to, when it isn't the default — said under the title while the drawer is shut. */
  filterNote?: string | null
  children: ReactNode
} & ListProps) {
  const t = useT()
  // The drawer (PullDrawer): opened by pulling down from the top, and kept
  // open while there is a search.
  const [pulled, setPulled] = useState(false)
  const shown = pulled || query.trim() !== ''
  const input = useRef<HTMLInputElement>(null)
  // Tapping the tab you're already on opens it too, keyboard up (James,
  // 2026-10-17: "when tapping the nav bar when on it open the search box").
  // The tab's tap sends the event and the focus happens inside that tap,
  // because iOS only raises the keyboard for a focus made inside a touch.
  const queryNow = useRef(query)
  queryNow.current = query
  useEffect(() => {
    const open = () => {
      setPulled(true)
      markTipSeen('pullDown')
      input.current?.focus({ preventScroll: true })
    }
    // The second tap of a double tap, which makes the tab the default instead.
    const shut = () => {
      if (queryNow.current.trim()) return
      input.current?.blur()
      setPulled(false)
    }
    window.addEventListener(OPEN_SEARCH, open)
    window.addEventListener(SHUT_SEARCH, shut)
    return () => {
      window.removeEventListener(OPEN_SEARCH, open)
      window.removeEventListener(SHUT_SEARCH, shut)
    }
  }, [])
  // Tap an option for now; hold it to make it what the app opens with
  // (`listDefaults.ts`). A chip is lit when it differs from those defaults.
  const defaults = useListDefaults()
  const hold = useHold()
  const [madeDefault, setMadeDefault] = useState<{ label: string; n: number } | null>(null)
  useEffect(() => {
    if (!madeDefault) return
    const timer = window.setTimeout(() => setMadeDefault(null), 2400)
    return () => window.clearTimeout(timer)
  }, [madeDefault])
  const [holdLearnt, setHoldLearnt] = useState(readHoldLearnt)
  const setAsDefault = (label: string, patch: Parameters<typeof makeDefault>[0]) => {
    makeDefault(patch)
    learnHold()
    setHoldLearnt(true)
    setMadeDefault({ label, n: Date.now() })
  }
  const setSetting = useSettingsStore((s) => s.set)
  const columns = useSettingsStore((s) => s.libraryColumns)
  const genresMin3 = useSettingsStore((s) => s.genresMin3)
  const next = nextOrder(order)
  const orderLabel = (o: LibraryOrder) => t(o.kind === 'az' ? 'native.chip_az' : o.kind === 'random' ? 'native.chip_random' : 'native.chip_genre')
  // The layout pill. Artists and Albums step through the website's cycle —
  // 2, 3, 4 per row, the jukebox shelf, then 1, which on a phone is a list —
  // and Tracks is the list or the shelf (James, 2026-10-10: "Artist should
  // show the 3 per row view by default (I can't find the option?)").
  const cols = columns[tab]
  const nextCols: LibraryColumns = tab === 'tracks' ? (cols === 'jukebox' ? 2 : 'jukebox') : nextColumns(cols)
  const layoutLabel = (c: LibraryColumns) => (c === 'jukebox' ? t('native.layout_jukebox') : tab === 'tracks' || c === 1 ? t('native.layout_list') : columnsLabel(c))
  // With the drawer shut, what's changed from the usual is said under the
  // title, so a filtered or shuffled list never looks like a broken one.
  const notes = [
    order.kind !== defaults.libraryOrder[tab] ? orderLabel(order) : null,
    cols !== defaults.libraryColumns[tab] ? layoutLabel(cols) : null,
    filterNote ?? null,
  ].filter(Boolean)
  const openDrawer = useCallback(() => {
    setPulled(true)
    markTipSeen('pullDown')
  }, [])
  const closeDrawer = useCallback(() => setPulled(false), [])
  // A second pull while it's open: straight into the search box, keyboard up.
  const typeIntoSearch = useCallback(() => input.current?.focus({ preventScroll: true }), [])

  return (
    <div className="jx-page">
      {genre && (
        <button type="button" className="jx-back wide jx-genre-back" onClick={() => navigate({ view: tab })}>
          <IconBack />
          <span>{t('native.genres_back')}</span>
        </button>
      )}
      <div className="jx-heading">
        <div>
          <h1 className="jx-h1">{genre ? shownGenre(genre) : title}</h1>
          <p className="jx-sub">{[count, ...(shown ? [] : notes)].join(' · ')}</p>
        </div>
      </div>
      <PullHint drawerShown={shown} onOpen={openDrawer} />
      <PullDrawer shown={shown} onOpen={openDrawer} onScrolledAway={query.trim() ? undefined : closeDrawer} onPullAgain={typeIntoSearch}>
        <SearchBox
          input={input}
          query={query}
          setQuery={setQuery}
          label={searchLabel}
          onClose={() => {
            setQuery('')
            setPulled(false)
            input.current?.blur()
          }}
        />
        {counts && query.trim() !== '' && <FoundIn tab={tab} counts={counts} genre={genre} />}
        <div className="jx-chips" role="group" aria-label={t('native.options_group')}>
          {onShuffle && (
            <button type="button" className="jx-chip play" onClick={onShuffle}>
              <IconShuffle /> {t('common.shuffle')}
            </button>
          )}
          <button
            type="button"
            className={`jx-chip${order.kind !== defaults.libraryOrder[tab] ? ' on' : ''}`}
            {...hold.bind(() => setAsDefault(orderLabel(order), { libraryOrder: { ...defaults.libraryOrder, [tab]: order.kind } }))}
            onClick={() => {
              if (hold.consumed()) return
              setOrder(next)
              setSetting('libraryOrder', { ...useSettingsStore.getState().libraryOrder, [tab]: next.kind })
            }}
            aria-label={t('native.chip_tap_for', { now: orderLabel(order), next: orderLabel(next) })}
          >
            {orderLabel(order)}
          </button>
          {order.kind === 'genre' && !genre && (
            <button
              type="button"
              className={`jx-chip${genresMin3 !== defaults.genresMin3 ? ' on' : ''}`}
              {...hold.bind(() => setAsDefault(genresMin3 ? t('native.chip_min', { n: t.num(GENRE_MIN) }) : t('native.chip_all_genres'), { genresMin3 }))}
              onClick={() => { if (!hold.consumed()) setSetting('genresMin3', !genresMin3) }}
            >
              {genresMin3 ? t('native.chip_min', { n: t.num(GENRE_MIN) }) : t('native.chip_all_genres')}
            </button>
          )}
          {filter?.(hold, setAsDefault)}
          <button
            type="button"
            className={`jx-chip${cols !== defaults.libraryColumns[tab] ? ' on' : ''}`}
            {...hold.bind(() => setAsDefault(layoutLabel(cols), { libraryColumns: { ...defaults.libraryColumns, [tab]: cols } }))}
            onClick={() => { if (!hold.consumed()) setSetting('libraryColumns', { ...columns, [tab]: nextCols }) }}
            aria-label={t('native.chip_tap_for', { now: layoutLabel(cols), next: layoutLabel(nextCols) })}
          >
            {layoutLabel(cols)}
          </button>
        </div>
        {madeDefault ? (
          <p key={madeDefault.n} className="jx-made-default" role="status">{t('native.default_set', { value: madeDefault.label })}</p>
        ) : !holdLearnt ? (
          <p className="jx-hold-hint">{t('native.hold_hint')}</p>
        ) : null}
      </PullDrawer>
      {children}
    </div>
  )
}

function FilterChip({ on, isDefault, label, offLabel, onToggle, hold, onHold }: {
  on: boolean; isDefault: boolean; label: string; offLabel: string; onToggle(): void
  hold: ReturnType<typeof useHold>; onHold(): void
}) {
  return (
    <button
      type="button"
      className={`jx-chip${isDefault ? '' : ' on'}`}
      {...hold.bind(onHold)}
      onClick={() => { if (!hold.consumed()) onToggle() }}
    >
      {on ? label : offLabel}
    </button>
  )
}

/** Whether the hold has been used once — then the hint under the chips goes. */
const HOLD_KEY = 'jukebox:hold-default-learnt'
/**
 * The first-run hint that the search box, Shuffle and the list options are
 * folded away above the list (James, 2026-10-13: "New users - have a hint to
 * swipe down to reveal the search etc"). Pulling is the only way in
 * (`PullDrawer`), so nothing else on screen says they exist. Goes for good the
 * first time the drawer opens, by the pull or by tapping this; waits its turn
 * behind any other hint (`useHintTurn`).
 */
function PullHint({ drawerShown, onOpen }: { drawerShown: boolean; onOpen(): void }) {
  const t = useT()
  const turn = useHintTurn('pullDown', !drawerShown)
  if (!turn) return null
  return (
    <div className="flex justify-center pb-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white shadow-md motion-safe:animate-[jb-tip-bob_1.6s_ease-in-out_infinite]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 8l5 5 5-5" />
        </svg>
        {t('app.tip_pull_down')}
      </button>
    </div>
  )
}

function readHoldLearnt(): boolean {
  try { return localStorage.getItem(HOLD_KEY) === '1' } catch { return false }
}
function learnHold(): void {
  try { localStorage.setItem(HOLD_KEY, '1') } catch { /* the hint just stays */ }
}

function Nothing({ query }: { query: string }) {
  const t = useT()
  return query.trim() ? <p className="jx-empty">{t('native.nothing_matches', { query: query.trim() })}</p> : null
}

export function AlbumsScreen(props: ListProps) {
  const t = useT()
  const { query, order, genre } = props
  const seen = useSeen(genre)
  const fullOnly = useSettingsStore((s) => s.fullAlbumsOnly)
  const defaults = useListDefaults()
  const setSetting = useSettingsStore((s) => s.set)
  const shuffleAlbums = usePlayerStore((s) => s.shuffleAlbums)
  const layout = useLayout('albums', order, genre)
  // Hold an album for what it offers (`CollectionHold`).
  const held = useCollectionHold()
  const shown = useMemo(() => {
    const pool = fullOnly ? seen.albums.filter(isFullAlbum) : seen.albums
    const ordered = layout.effective.kind === 'random' ? seededOrder(pool, (a) => a.id, layout.effective.seed) : [...pool].sort((a, b) => compareName(a.title, b.title))
    return matchAlbums(ordered, query)
  }, [seen.albums, fullOnly, layout.effective, query])
  const [limit, setLimit] = useState(PAGE)

  return (
    <Screen
      {...props}
      tab="albums"
      title={t('native.heading_albums')}
      searchLabel={genre ? t('native.search_genre_albums', { genre : shownGenre(genre) }) : t('native.search_albums')}
      count={t.plural('common.albums', shown.length)}
      onShuffle={shown.length ? () => shuffleAlbums(shown) : undefined}
      filterNote={fullOnly !== defaults.fullAlbumsOnly ? (fullOnly ? t('native.chip_full_albums') : t('native.chip_all_albums')) : null}
      filter={(hold, setAsDefault) => (
        <FilterChip
          on={fullOnly}
          isDefault={fullOnly === defaults.fullAlbumsOnly}
          label={t('native.chip_full_albums')}
          offLabel={t('native.chip_all_albums')}
          onToggle={() => setSetting('fullAlbumsOnly', !fullOnly)}
          hold={hold}
          onHold={() => setAsDefault(fullOnly ? t('native.chip_full_albums') : t('native.chip_all_albums'), { fullAlbumsOnly: fullOnly })}
        />
      )}
    >
      {layout.genreList ? (
        <GenreIndex tab="albums" query={query} />
      ) : layout.shelf || genre ? (
        <>
          {held.sheet}
          <div className="jx-web"><AlbumGrid query={query} order={layout.effective} genre={genre} hold={(album) => held.open({ kind: 'album', album })} /></div>
        </>
      ) : (
        <>
          {/* "Pick up where you left off" — the website puts it in its lists
              too; it draws nothing when there is nothing to resume. */}
          {held.sheet}
          {!query.trim() && <ResumeCard />}
          <Nothing query={shown.length === 0 ? query : ''} />
          {layout.columns === 1 ? (
            <ul className="jx-list">
              {shown.slice(0, limit).map((album) => (
                <li key={album.id}>
                  <button type="button" className="jx-row" {...held.bind({ kind: 'album', album })} onClick={() => { if (!held.consumed()) navigate({ view: 'album', albumId: album.id }) }}>
                    <Cover album={album} className="jx-thumb" />
                    <span>
                      <b>{shownName(album.title)}</b>
                      <small>{[shownName(album.artist), album.year].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            // ⚠️ KEYED BY THE LAYOUT: a new list on every layout change. The
            // tiles are `content-visibility: auto`, and on the iPhone a tile
            // re-laid from one layout to another stayed unpainted — a blank
            // screen with the grid far below it, right until the page was
            // left and opened again (James, 2026-10-11: "gets to 2 per row and
            // then breaks").
            <ul key={layout.columns} className={`jx-grid n${layout.columns}`}>
              {shown.slice(0, limit).map((album) => (
                <li key={album.id}>
                  <button type="button" className="jx-tile" {...held.bind({ kind: 'album', album })} onClick={() => { if (!held.consumed()) navigate({ view: 'album', albumId: album.id }) }}>
                    <Cover album={album} className="jx-cover" />
                    <b>{shownName(album.title)}</b>
                    <small>{shownName(album.artist)}</small>
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
  const t = useT()
  const { query, order, genre } = props
  const seen = useSeen(genre)
  const min3 = useSettingsStore((s) => s.artistsMin3)
  const defaults = useListDefaults()
  const setSetting = useSettingsStore((s) => s.set)
  const shuffleArtists = usePlayerStore((s) => s.shuffleArtists)
  const layout = useLayout('artists', order, genre)
  // Hold an artist for their albums, all their songs, play or shuffle (`CollectionHold`).
  const held = useCollectionHold()
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
    return layout.effective.kind === 'random' ? seededOrder(matched, (n) => n, layout.effective.seed) : matched.sort(compareName)
  }, [pool, query, layout.effective])
  const [limit, setLimit] = useState(PAGE)

  return (
    <Screen
      {...props}
      tab="artists"
      title={t('native.heading_artists')}
      searchLabel={genre ? t('native.search_genre_artists', { genre : shownGenre(genre) }) : t('native.search_artists')}
      count={t.plural('common.artists', names.length)}
      onShuffle={names.length ? () => shuffleArtists(names.flatMap((n) => byArtist.get(n) ?? [])) : undefined}
      filterNote={min3 !== defaults.artistsMin3 ? (min3 ? t('native.chip_min', { n: t.num(ARTIST_MIN) }) : t('native.chip_all_artists')) : null}
      filter={(hold, setAsDefault) => (
        <FilterChip
          on={min3}
          isDefault={min3 === defaults.artistsMin3}
          label={t('native.chip_min', { n: t.num(ARTIST_MIN) })}
          offLabel={t('native.chip_all_artists')}
          onToggle={() => setSetting('artistsMin3', !min3)}
          hold={hold}
          onHold={() => setAsDefault(min3 ? t('native.chip_min', { n: t.num(ARTIST_MIN) }) : t('native.chip_all_artists'), { artistsMin3: min3 })}
        />
      )}
    >
      {layout.genreList ? (
        <GenreIndex tab="artists" query={query} />
      ) : layout.shelf || genre ? (
        <>
          {held.sheet}
          <div className="jx-web"><ArtistList query={query} order={layout.effective} genre={genre} hold={(name) => held.open({ kind: 'artist', name })} /></div>
        </>
      ) : (
        <>
          {held.sheet}
          {!query.trim() && <ResumeCard />}
          <Nothing query={names.length === 0 ? query : ''} />
          {/* Keyed by the layout, as the albums grid is (see there). */}
          <ul key={layout.columns} className={layout.columns === 1 ? 'jx-list' : `jx-grid n${layout.columns} artists`}>
            {names.slice(0, limit).map((name) => {
              const theirs = byArtist.get(name) ?? []
              const face = theirs.find((a) => a.cover) ?? theirs[0]
              return (
                <li key={name}>
                  {layout.columns === 1 ? (
                    <button type="button" className="jx-row" {...held.bind({ kind: 'artist', name })} onClick={() => { if (!held.consumed()) navigate({ view: 'artist', artist: name }) }}>
                      <Cover album={face} className="jx-thumb round" />
                      <span>
                        <b>{shownName(name)}</b>
                        <small>{t.plural('common.albums', theirs.length)}</small>
                      </span>
                    </button>
                  ) : (
                    <button type="button" className="jx-tile" {...held.bind({ kind: 'artist', name })} onClick={() => { if (!held.consumed()) navigate({ view: 'artist', artist: name }) }}>
                      <Cover album={face} className="jx-cover round" />
                      <b>{shownName(name)}</b>
                      <small>{t.plural('common.albums', theirs.length)}</small>
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
  const t = useT()
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
        : [...seen.tracks].sort((a, b) => compareName(a.title, b.title))
    return matchTracks(ordered, query)
  }, [seen.tracks, layout.effective, query])
  const [limit, setLimit] = useState(PAGE)

  return (
    <Screen
      {...props}
      tab="tracks"
      title={t('native.heading_tracks')}
      searchLabel={genre ? t('native.search_genre_tracks', { genre : shownGenre(genre) }) : t('native.search_tracks')}
      count={t.plural('common.tracks', shown.length)}
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
 * Headphones at the end of a row preview it (`Preview`). ⋯, or holding the
 * row, opens the website's own options
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
  const t = useT()
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
                    : [shownName(track.artist ?? track.albumArtist), showAlbum ? shownName(track.album) : null].filter(Boolean).join(' · ')}
                </small>
              </span>
            </button>
            <Preview track={track} />
            <button type="button" className="jx-more" onClick={() => setOptions(i)} aria-label={t('native.options_for', { title: track.title })}>
              <IconMore />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Hear a few seconds of a song without touching what's playing — the
 * website's preview (`components/PreviewButton.tsx`, the player store's
 * `preview`): from PREVIEW_START_SEC in, for PREVIEW_RUN_SEC. Tap again to stop.
 */
function Preview({ track }: { track: Track }) {
  const running = usePlayerStore((s) => s.previewTrackId === track.id)
  const preview = usePlayerStore((s) => s.preview)
  const t = useT()
  return (
    <button
      type="button"
      className={`jx-more jx-preview${running ? ' on' : ''}`}
      onClick={() => preview(track)}
      aria-pressed={running}
      aria-label={running ? t('native.stop_preview', { title: track.title }) : t('native.preview', { title: track.title, run: t.num(PREVIEW_RUN_SEC), start: t.num(PREVIEW_START_SEC) })}
    >
      {running ? <IconStop /> : <IconPreview />}
    </button>
  )
}

/** How long a press is held before it opens a song's options, as on the Tracks shelf. */
const HOLD_MS = 450

function More({ left, onMore }: { left: number; onMore(): void }) {
  const t = useT()
  if (left <= 0) return null
  return (
    <button type="button" className="jx-btn" onClick={onMore}>
      {t.plural('native.show_more', Math.min(left, PAGE))}
    </button>
  )
}
