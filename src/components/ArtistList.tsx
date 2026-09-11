import { Fragment, useId, useMemo, useState } from 'react'
import { withResumeRow } from './resumeRow'
import { ArtistShelf } from './Shelf'
import { useGridColumns } from '../lib/useGridColumns'
import { leadWith, useResumable } from '../lib/resume'
import Cover from './Cover'
import CoverFan from './CoverFan'
import OpenGroup, { GROUP_MEMBER_TINT } from './OpenGroup'
import { plural } from '../lib/format'
import { matchArtistNames } from '../lib/search'
import { navigate } from '../lib/route'
import { gridClass, seededOrder, type LibraryOrder } from '../lib/libraryView'
import { useSettingsStore } from '../stores/settingsStore'
import { useLibraryStore } from '../stores/libraryStore'
import type { Album } from '../lib/types'

// Artists, each with their records under them.
//
// Built by grouping the ALBUMS rather than the tracks — an artist is a set of
// records here, not a set of songs, which is what makes the list short enough
// to scan. Grouping tracks would give a page of names on a compilation-heavy
// library and nothing to click.
//
// ⚠️ AN ARTIST OPENS IN PLACE, AND THEIR RECORDS ARE TINTED (James, 2026-09-11:
// "grouped artists not opening inline and the different bg colour not showing,
// I think there's been a regression"). This is the fan the Albums tab had until
// it stopped grouping (06281a9), moved here: the card becomes the open sleeve in
// the cell it was in, and the artist's albums follow it in the grid, each on the
// orange tint, so an opened run is told apart from the artists either side. It
// replaced a drawer under the WHOLE grid — which on a phone put an artist's
// records a long scroll away from the card that opened them.

export default function ArtistList({ query, order }: { query: string; order: LibraryOrder }) {
  const albums = useLibraryStore((s) => s.albums)
  /** Artists opened out. Names, because that is what groups them. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const baseId = useId()
  const columns = useSettingsStore((s) => s.libraryColumns)
  const [grid, across] = useGridColumns(columns)
  const leadName = useResumable()?.album?.artist ?? null

  const artists = useMemo(() => {
    const byArtist = new Map<string, Album[]>()
    for (const album of albums) {
      const list = byArtist.get(album.artist)
      if (list) list.push(album)
      else byArtist.set(album.artist, [album])
    }
    // ⚠️ The same name test the tab count runs, so "Artists (2)" is always the
    // length of this list.
    const matching = new Set(matchArtistNames(albums, query))
    const entries = [...byArtist.entries()].filter(([name]) => matching.has(name))
    const ordered =
      order.kind === 'random'
        ? seededOrder(entries, ([name]) => name, order.seed)
        : entries.sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
    // The artist "Resume listening" would play first, as the albums lead with its album.
    return leadWith(ordered, leadName ? ([name]) => name === leadName : null).map(([name, list]) => ({
      name,
      albums: [...list].sort((x, y) => (x.year ?? 9999) - (y.year ?? 9999)),
    }))
  }, [albums, query, order, leadName])

  if (artists.length > 0 && columns === 'jukebox') return <ArtistShelf artists={artists} />

  if (artists.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim() ? `No artist matching “${query}”.` : 'No artists yet.'}
      </p>
    )
  }

  return (
    <ul ref={grid} className={gridClass(columns === 'jukebox' ? 2 : columns)}>
      {withResumeRow(artists.map((artist, index) => {
        // One album is not worth opening — go straight to the record, which is
        // the only thing behind the door anyway.
        if (artist.albums.length === 1) {
          const album = artist.albums[0]
          return (
            <li key={artist.name}>
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
                  {artist.name}
                </p>
                <p className="line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">1 album</p>
              </button>
            </li>
          )
        }

        const isOpen = expanded.has(artist.name)
        const toggle = () =>
          setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(artist.name)) next.delete(artist.name)
            else next.add(artist.name)
            return next
          })
        // ⚠️ The run has no box of its own — its tiles are grid cells among
        // everybody else's — so the card's `aria-controls` names the LAST of
        // them. The SDK's reveal-on-expand spans the trigger AND the panel, so
        // "the card you pressed, down to its last record" is what it brings on
        // screen; and the records start right after the card, so none of them
        // is ever a long scroll away. (`aria-controls` may list several ids,
        // but the SDK looks the value up as ONE id.)
        const lastTileId = `${baseId}-artist-${index}-last`

        // ⚠️ ONE button for both states — the fan and the opened sleeve — so the
        // SDK sees `aria-expanded` CHANGE on one element (which is what fires
        // its reveal) and keyboard focus stays on the button that has it. The
        // shared `Fragment` key and the stable `li` key are what keep it one.
        return (
          <Fragment key={artist.name}>
            <li key="group">
              <button
                type="button"
                onClick={toggle}
                aria-expanded={isOpen}
                aria-controls={lastTileId}
                className="group w-full text-left focus:outline-none"
              >
                {isOpen ? (
                  <div className="aspect-square w-full">
                    <OpenGroup albums={artist.albums} className="h-full w-full transition-transform group-hover:-translate-y-0.5" />
                  </div>
                ) : (
                  // Breathing room inside the tile's own square, so the cards
                  // behind lean into padding rather than into the neighbouring
                  // tile — and every cell stays the same size.
                  <div className="aspect-square w-full px-3 pt-3">
                    <CoverFan albums={artist.albums} className="h-full w-full transition-transform group-hover:-translate-y-0.5" />
                  </div>
                )}
                <p
                  className={`mt-2 line-clamp-2 text-[13px] font-medium ${
                    isOpen
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400'
                  }`}
                >
                  {artist.name}
                </p>
                <p className="line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {isOpen
                    ? `Showing ${plural(artist.albums.length, 'album')} — tap to fold up`
                    : plural(artist.albums.length, 'album')}
                </p>
              </button>
            </li>
            {isOpen &&
              artist.albums.map((album, i) => (
                <li key={album.id} id={i === artist.albums.length - 1 ? lastTileId : undefined}>
                  <button
                    type="button"
                    onClick={() => navigate({ view: 'album', albumId: album.id })}
                    // ⚠️ The tint is what answers "which of these tiles are
                    // this artist's?" once a run is open.
                    className={`group w-full text-left focus:outline-none ${GROUP_MEMBER_TINT}`}
                  >
                    <Cover
                      album={album}
                      className="aspect-square w-full shadow-sm ring-1 ring-slate-900/5 transition group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-orange-600 dark:ring-white/10"
                    />
                    <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">
                      {album.title}
                    </p>
                    {album.year && <p className="text-[12px] text-slate-500 dark:text-slate-400">{album.year}</p>}
                  </button>
                </li>
              ))}
          </Fragment>
        )
      }), across)}
    </ul>
  )
}
