import { useMemo } from 'react'
import { withResumeRow } from './resumeRow'
import { useGridColumns } from '../lib/useGridColumns'
import { leadWith, useResumable } from '../lib/resume'
import Cover from './Cover'
import { matchAlbums } from '../lib/search'
import { navigate } from '../lib/route'
import Shelf from './Shelf'
import { FULL_ALBUM_MIN, gridClass, isFullAlbum, seededOrder, type LibraryOrder } from '../lib/libraryView'
import { GENRE_MIN, albumGenres, groupByGenre, hiddenByGenre, shownGenres, tallyGenres } from '../lib/genres'
import GenreHeading, { GenreFootnote } from './GenreHeading'
import { useLibraryStore } from '../stores/libraryStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { Album } from '../lib/types'

// The front door once there is a library: a grid of covers.
//
// Albums are the front door rather than tracks because artwork is the fastest
// index a person has — you find a record by recognising it, not by reading it.
// That is also what the whole cover-extraction effort was for.
//
// ⚠️ EVERY ALBUM IS ITS OWN TILE. An artist with three or more records used to
// fold into one fan here. James, 2026-09-10: "in albums you don't want to group
// multiple to an artist because you're looking for the album". The artist's
// other records are one tap away instead — the album page's "All N albums by …"
// opens the artist's page, which can play or shuffle all of them.

interface AlbumGridProps {
  query: string
  order: LibraryOrder
}

export default function AlbumGrid({ query, order }: AlbumGridProps) {
  const albums = useLibraryStore((s) => s.albums)
  const tracks = useLibraryStore((s) => s.tracks)
  const fullOnly = useSettingsStore((s) => s.fullAlbumsOnly)
  const columns = useSettingsStore((s) => s.libraryColumns.albums)
  const [grid, across] = useGridColumns(columns)
  const leadId = useResumable()?.album?.id ?? null

  // ⚠️ Ordered first, then filtered through `matchAlbums` — the same function
  // the tab count uses, so the number beside "Albums" and the tiles below it
  // can never disagree.
  const listed = useMemo(() => {
    const pool = fullOnly ? albums.filter(isFullAlbum) : albums
    const ordered = order.kind === 'random' ? seededOrder(pool, (a) => a.id, order.seed) : [...pool].sort(byTitle)
    return matchAlbums(ordered, query)
  }, [albums, fullOnly, order, query])
  // While "Resume listening" shows (the row under the first), its album is
  // the first tile (James, 2026-09-11: "in row 1 have the album for that track
  // as item 1"). On the shelf it joins the FIRST shelf instead, and the shelves
  // stay as they are (`Shelf`'s lead).
  const resumeAlbum = leadId ? listed.find((a) => a.id === leadId) : undefined
  const shown = useMemo(() => leadWith(listed, leadId ? (a) => a.id === leadId : null), [listed, leadId])

  // ⚠️ An album's genres are ITS SONGS' genres — there is no genre on an album,
  // only on the files under it (`lib/genres.ts`). A record whose songs are
  // tagged two ways stands on both shelves.
  const genre = useMemo(() => {
    if (order.kind !== 'genre') return null
    const tally = tallyGenres(tracks)
    const genresOf = albumGenres(tracks)
    return { groups: groupByGenre(listed, genresOf, shownGenres(tally)), hidden: hiddenByGenre(tally) }
  }, [order.kind, tracks, listed])

  if (shown.length === 0 || (genre && genre.groups.length === 0)) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim()
          ? `Nothing matching “${query}”.`
          : genre && albums.length > 0
            ? `No genre here has ${GENRE_MIN} songs or more, so there is nothing to file. Switch back to A–Z.`
            : fullOnly && albums.length > 0
              ? `No full albums — every album here has fewer than ${FULL_ALBUM_MIN} tracks. Turn off “Full albums only” to see them.`
              : 'No albums yet.'}
      </p>
    )
  }

  // Smaller words when the tiles are small. Wanted by both the plain grid and
  // the genre-grouped one, so it is worked out before either.
  const small = columns === 3 || columns === 4
  const tile = (album: Album) => (
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
        {/* `line-clamp-2` and not `truncate`: album titles are long and the
            second line is usually the half that identifies the record. */}
        <p className={`mt-2 line-clamp-2 font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400 ${small ? 'text-[11.5px] leading-snug' : 'text-[13px]'}`}>
          {album.title}
        </p>
        <p className={`line-clamp-1 text-slate-500 dark:text-slate-400 ${small ? 'text-[10.5px]' : 'text-[12px]'}`}>
          {album.artist}
          {album.year && columns !== 4 ? ` · ${album.year}` : ''}
        </p>
      </button>
    </li>
  )

  if (columns === 'jukebox') {
    return (
      <>
        {/* ⚠️ NO `lead` IN GENRE MODE. The resume record is moved to the front
            of the first shelf, and in genre mode the first shelf is a genre it
            probably is not in — which would put a stray record on the Blues
            shelf and quietly make the shelf a lie. */}
        <Shelf albums={listed} lead={genre ? undefined : resumeAlbum} groups={genre?.groups} />
        {genre && <GenreFootnote hidden={genre.hidden} />}
      </>
    )
  }

  // The grid, grouped: one heading and one grid per genre, so the runs read as
  // runs rather than as one long list that happens to be sorted.
  if (genre) {
    return (
      <>
        {genre.groups.map((group) => (
          <section key={group.genre} className="mb-8">
            <GenreHeading genre={group.genre} count={group.items.length} />
            <ul className={gridClass(columns)}>{group.items.map(tile)}</ul>
          </section>
        ))}
        <GenreFootnote hidden={genre.hidden} />
      </>
    )
  }

  return (
    <ul ref={grid} className={gridClass(columns)}>
      {withResumeRow(shown.map(tile), across)}
    </ul>
  )
}

/**
 * A–Z is by the ALBUM's name (James, 2026-09-11: "it seems to organise by
 * artist name instead of album name? In album we shouldn't be grouping albums
 * unless it's a multi-disc album"). Sorted by artist, the grid was an artist
 * index in all but name — every record by one artist in a run. The artist, then
 * the year, only break a tie between two albums of the same name.
 */
function byTitle(a: Album, b: Album): number {
  const title = a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
  if (title !== 0) return title
  const artist = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' })
  if (artist !== 0) return artist
  return (a.year ?? 9999) - (b.year ?? 9999)
}
