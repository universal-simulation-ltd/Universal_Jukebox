import { useMemo } from 'react'
import Cover from './Cover'
import { matchAlbums } from '../lib/search'
import { navigate } from '../lib/route'
import { FULL_ALBUM_MIN, isFullAlbum, seededOrder, type LibraryOrder } from '../lib/libraryView'
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
  const fullOnly = useSettingsStore((s) => s.fullAlbumsOnly)

  // ⚠️ Ordered first, then filtered through `matchAlbums` — the same function
  // the tab count uses, so the number beside "Albums" and the tiles below it
  // can never disagree.
  const shown = useMemo(() => {
    const pool = fullOnly ? albums.filter(isFullAlbum) : albums
    const ordered = order.kind === 'random' ? seededOrder(pool, (a) => a.id, order.seed) : [...pool].sort(byArtistThenYear)
    return matchAlbums(ordered, query)
  }, [albums, fullOnly, order, query])

  if (shown.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim()
          ? `Nothing matching “${query}”.`
          : fullOnly && albums.length > 0
            ? `No full albums — every album here has fewer than ${FULL_ALBUM_MIN} tracks. Turn off “Full albums only” to see them.`
            : 'No albums yet.'}
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {shown.map((album) => (
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
            <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">
              {album.title}
            </p>
            <p className="line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
              {album.artist}
              {album.year ? ` · ${album.year}` : ''}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Artist, then year, then title — the A–Z order.
 *
 * An artist's records in the order they were made is the order people picture
 * them in; alphabetical-by-title scatters a discography and is the default
 * nobody asks for.
 */
function byArtistThenYear(a: Album, b: Album): number {
  const artist = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' })
  if (artist !== 0) return artist
  const year = (a.year ?? 9999) - (b.year ?? 9999)
  if (year !== 0) return year
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}
