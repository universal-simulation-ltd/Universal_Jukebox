// DetailScreens.tsx — one album, one artist. The cover big at the top, Play
// and Shuffle under it, then the songs. Play puts the record on, and the
// player store takes you to the deck (`showTheDeck`), as on the website.

import { useCallback, useMemo, useRef, useState } from 'react'
import Tip from '../components/Tip'
import { markTipSeen } from '../lib/tips'
import { matchTracks } from '../lib/search'
import { PullDrawer } from './PullDrawer'
import Cover from '../components/Cover'
import { VinylRecord } from '../components/decks/VinylRecord'
import { shownName, totalTime } from '../lib/format'
import { useT } from '../i18n'
import { navigate } from '../lib/route'
import type { Track } from '../lib/types'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { currentTrack, showTheDeck, usePlayerStore } from '../stores/playerStore'
import AddToQueue from '../components/AddToQueue'
import AddToShelf from '../components/AddToShelf'
import { AlbumRow } from '../components/Shelf'
import { IconPlay, IconShuffle } from './icons'
import { SearchBox, SongList } from './LibraryScreens'
import { byYearThenTitle } from '../lib/libraryView'
import { useCollectionHold } from './CollectionHold'
import { useHold } from './listDefaults'

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
/**
 * Search inside the page — the website's FindWithin. Folded away like the
 * library's drawer, and opened the same way: pull down from the top. Returns
 * the box, and the tracks that match (all of them while empty).
 */
function useFindWithin(tracks: Track[], label: string) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const shown = open || query.trim() !== ''
  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])
  const typeIntoSearch = useCallback(() => input.current?.focus({ preventScroll: true }), [])
  const found = useMemo(() => matchTracks(tracks, query), [tracks, query])
  const box = (
    <PullDrawer shown={shown} onOpen={openDrawer} onScrolledAway={query.trim() ? undefined : closeDrawer} onPullAgain={typeIntoSearch}>
      <SearchBox
        input={input}
        query={query}
        setQuery={setQuery}
        label={label}
        onClose={() => {
          setQuery('')
          setOpen(false)
          input.current?.blur()
        }}
      />
    </PullDrawer>
  )
  return { box, found, searching: query.trim() !== '' }
}

function Actions({ tracks, onPlay, onShuffle }: { tracks: Parameters<typeof AddToShelf>[0]['tracks']; onPlay(): void; onShuffle(): void }) {
  const t = useT()
  return (
    <div className="jx-actions-wrap">
      <div className="jx-actions">
        <button type="button" className="jx-btn primary" onClick={onPlay}>
          <IconPlay /> {t('common.play')}
        </button>
        <button type="button" className="jx-btn" onClick={onShuffle}>
          <IconShuffle /> {t('common.shuffle')}
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
  const t = useT()
  const albums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const album = albums.find((a) => a.id === albumId)
  const tracks = useMemo(() => sortAlbumTracks(allTracks.filter((t) => t.albumId === albumId)), [allTracks, albumId])
  const { playTracks, shuffleThese } = usePlayShuffle()
  const onTheDeck = usePlayerStore((s) => currentTrack(s)?.albumId === albumId)
  const find = useFindWithin(tracks, album ? t('native.search_named', { name: shownName(album.title) }) : t('native.search_this_album'))
  // Hold the sleeve: the record slides back in and out again (James,
  // 2026-10-12). A new key restarts the animation on every hold.
  const sleeveHold = useHold()
  const [slides, setSlides] = useState(0)

  if (!album) return <p className="jx-empty">{t('native.album_gone')}</p>

  return (
    <div className="jx-page">
      {find.box}
      {/* While searching, the cover and buttons step aside so the matches sit
          right under the box. */}
      {!find.searching && (
      <>
      <div className="jx-hero">
        {/* The cover opens the jukebox: puts the record on, or — when it is
            already turning — just goes to it (AlbumView's rule: never lose
            your place by tapping the picture of what is playing). */}
        <button
          type="button"
          className="jx-hero-open jx-sleeve"
          {...sleeveHold.bind(() => setSlides((n) => n + 1))}
          onClick={() => {
            if (sleeveHold.consumed()) return
            markTipSeen('cover')
            if (onTheDeck) showTheDeck()
            else playTracks(tracks, 0)
          }}
          aria-label={onTheDeck ? t('native.go_to_record') : t('native.play_on_jukebox', { title: shownName(album.title) })}
        >
          {/* The sleeve as it is, with its record half out of it behind
              (James, 2026-10-11: "show the album sleeve (as is) with a vinyl
              disc coming out of it"). The two are centred together. */}
          <span key={slides} className={`jx-sleeve-disc${slides > 0 ? ' again' : ''}`} aria-hidden>
            <VinylRecord album={album} />
          </span>
          <span className="jx-sleeve-front">
            <Cover album={album} className="jx-hero-cover" />
            <Tip id="cover" detail={t('app.tip_cover')} />
          </span>
        </button>
        <h1 className="jx-h1">{shownName(album.title)}</h1>
        <button type="button" className="jx-link" onClick={() => navigate({ view: 'artist', artist: album.artist })}>
          {shownName(album.artist)}
        </button>
        <p className="jx-sub">{[album.year, t.plural('common.tracks', tracks.length), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      <Actions tracks={tracks} onPlay={() => playTracks(tracks, 0)} onShuffle={() => shuffleThese(tracks)} />
      </>
      )}
      {find.searching && find.found.length === 0 ? <p className="jx-empty">{t('native.no_album_match')}</p> : null}
      {/* A found track plays the album on from itself, as a tap in the full list would. */}
      <SongList tracks={find.found} albums={albums} onPlay={(i) => playTracks(tracks, tracks.indexOf(find.found[i]))} numbered />
    </div>
  )
}

export function ArtistScreen({ name }: { name: string }) {
  const t = useT()
  const allAlbums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const albums = useMemo(() => allAlbums.filter((a) => a.artist === name).sort(byYearThenTitle), [allAlbums, name])
  // Hold one of their albums for what it offers (`CollectionHold`).
  const held = useCollectionHold()
  /** Every song of theirs, album by album, oldest album first. */
  const tracks = useMemo(() => {
    const byAlbum = new Map(albums.map((a) => [a.id, [] as typeof allTracks]))
    for (const track of allTracks) byAlbum.get(track.albumId)?.push(track)
    return albums.flatMap((a) => sortAlbumTracks(byAlbum.get(a.id) ?? []))
  }, [albums, allTracks])
  const { playTracks, shuffleThese } = usePlayShuffle()
  const albumYear = useMemo(() => new Map(albums.map((a) => [a.id, a.year])), [albums])
  const find = useFindWithin(tracks, t('native.search_named', { name: shownName(name) }))

  if (albums.length === 0) return <p className="jx-empty">{t('native.artist_gone')}</p>

  return (
    <div className="jx-page">
      {find.box}
      {!find.searching && (
      <>
      <div className="jx-hero">
        <h1 className="jx-h1">{shownName(name)}</h1>
        <p className="jx-sub">{[t.plural('common.albums', albums.length), t.plural('common.tracks', tracks.length), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      {held.sheet}
      {/* Their albums as ONE shelf you swipe along, not a grid (James,
          2026-10-11); hold a record for the album's sheet. Play and Shuffle
          sit under it (James, 2026-10-12). */}
      <div className="jx-web"><AlbumRow albums={albums} hold={(album) => held.open({ kind: 'album', album })} /></div>
      <Actions tracks={tracks} onPlay={() => playTracks(tracks, 0)} onShuffle={() => shuffleThese(tracks)} />
      </>
      )}
      {/* Every song of theirs, album by album — the website's "All songs by …"
          page, here under their albums. Playing one plays on from it through
          the rest. */}
      <p className="jx-label">{find.searching ? t('native.matching_tracks') : t('native.all_tracks')}</p>
      {find.searching && find.found.length === 0 ? <p className="jx-empty">{t('native.no_artist_match')}</p> : null}
      <SongList
        tracks={find.found}
        albums={allAlbums}
        onPlay={(i) => playTracks(tracks, tracks.indexOf(find.found[i]))}
        subtitle={(track) => [shownName(track.album), albumYear.get(track.albumId)].filter(Boolean).join(' · ')}
      />
    </div>
  )
}


/**
 * What is playing and what comes after it, opened by tapping the record on
 * Now Playing (James, 2026-10-12: "click the record to go to the queue list
 * page. If it's one album show it as the album view, if there's multiple
 * albums in the queue then show a shelf of the albums and then the queue list
 * of tracks beneath"). It replaces the row of records under the deck.
 *
 * ⚠️ It walks `order`, not `queue`, for `Queue`'s reason: shuffle permutes the
 * order and leaves the queue alone.
 */
export function QueueScreen() {
  const t = useT()
  const albums = useLibraryStore((s) => s.albums)
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  const held = useCollectionHold()
  // The song on now, then the rest in the order they will play.
  const from = Math.max(0, cursor)
  const tracks = useMemo(() => order.slice(from).map((i) => queue[i]).filter((track): track is Track => !!track), [order, queue, from])
  const queued = useMemo(() => {
    const seen = new Set<string>()
    const list: typeof albums = []
    for (const track of tracks) {
      if (seen.has(track.albumId)) continue
      seen.add(track.albumId)
      const album = albums.find((a) => a.id === track.albumId)
      if (album) list.push(album)
    }
    return list
  }, [tracks, albums])

  if (tracks.length === 0) return <p className="jx-empty">{t('player.nothing_after')}</p>
  // One album: its own page, as if opened from the library.
  if (queued.length === 1 && tracks.every((track) => track.albumId === queued[0].id)) return <AlbumScreen albumId={queued[0].id} />

  return (
    <div className="jx-page">
      <div className="jx-hero">
        <h1 className="jx-h1">{t('player.up_next')}</h1>
        <p className="jx-sub">{[t.plural('common.albums', queued.length), t.plural('common.tracks', tracks.length), totalTime(tracks)].filter(Boolean).join(' · ')}</p>
      </div>
      {held.sheet}
      <div className="jx-web"><AlbumRow albums={queued} hold={(album) => held.open({ kind: 'album', album })} /></div>
      <p className="jx-label">
        <button type="button" className="jx-link" onClick={clearQueue}>{t('common.clear')}</button>
      </p>
      {/* A row plays from itself: the same queue, moved along to it. */}
      <SongList tracks={tracks} albums={albums} onPlay={(i) => jumpTo(from + i)} showAlbum />
    </div>
  )
}
