import { useMemo } from 'react'
import Cover from './Cover'
import { fold } from '../lib/format'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import type { Album } from '../lib/types'

// The front door once there is a library: a grid of covers.
//
// Albums are the front door rather than tracks because artwork is the fastest
// index a person has — you find a record by recognising it, not by reading it.
// That is also what the whole cover-extraction effort was for.

interface AlbumGridProps {
  query: string
}

export default function AlbumGrid({ query }: AlbumGridProps) {
  const albums = useLibraryStore((s) => s.albums)

  const shown = useMemo(() => {
    const sorted = [...albums].sort(byArtistThenYear)
    if (!query.trim()) return sorted
    const needle = fold(query)
    return sorted.filter(
      (a) => fold(a.title).includes(needle) || fold(a.artist).includes(needle),
    )
  }, [albums, query])

  if (shown.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim() ? `Nothing matching “${query}”.` : 'No albums yet.'}
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
 * Artist, then year, then title.
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
