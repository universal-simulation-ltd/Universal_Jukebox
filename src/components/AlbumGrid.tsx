import { useMemo, useState } from 'react'
import Cover from './Cover'
import CoverFan from './CoverFan'
import { fold, plural } from '../lib/format'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import type { Album } from '../lib/types'

// The front door once there is a library: a grid of covers.
//
// Albums are the front door rather than tracks because artwork is the fastest
// index a person has — you find a record by recognising it, not by reading it.
// That is also what the whole cover-extraction effort was for.

/**
 * How many albums an artist needs before their run collapses into one fan.
 *
 * ⚠️ Three, not two. The problem being solved is one artist swallowing the
 * grid — with two records they are not swallowing anything, and folding them
 * away costs a click to see something that already fitted. At three the run
 * starts to read as "this artist" rather than "these albums", which is the
 * moment a fan says more than the tiles do.
 */
const FAN_MIN = 3

interface AlbumGridProps {
  query: string
}

export default function AlbumGrid({ query }: AlbumGridProps) {
  const albums = useLibraryStore((s) => s.albums)
  /** Artists the user has opened out. Names, because that is what groups them. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const shown = useMemo(() => {
    const sorted = [...albums].sort(byArtistThenYear)
    if (!query.trim()) return sorted
    const needle = fold(query)
    return sorted.filter(
      (a) => fold(a.title).includes(needle) || fold(a.artist).includes(needle),
    )
  }, [albums, query])

  /**
   * The sorted list cut into runs by artist.
   *
   * Safe to do by walking the list rather than grouping into a Map because
   * `byArtistThenYear` already puts an artist's records together — and walking
   * keeps the grid in exactly the order the sort produced, so a fan sits
   * where its albums were rather than jumping to the front.
   */
  const runs = useMemo(() => {
    const out: { artist: string; albums: Album[] }[] = []
    for (const album of shown) {
      const last = out[out.length - 1]
      if (last && last.artist === album.artist) last.albums.push(album)
      else out.push({ artist: album.artist, albums: [album] })
    }
    return out
  }, [shown])

  if (shown.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim() ? `Nothing matching “${query}”.` : 'No albums yet.'}
      </p>
    )
  }

  // ⚠️ Never fan a search. A search is somebody looking for one record, and
  // hiding it behind "and 6 more" is the opposite of answering the question.
  const fanning = !query.trim()

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {runs.map((run) => {
        const isFan = fanning && run.albums.length >= FAN_MIN && !expanded.has(run.artist)
        if (isFan) {
          return (
            <li key={`fan-${run.artist}`}>
              <button
                type="button"
                onClick={() => setExpanded((prev) => new Set(prev).add(run.artist))}
                aria-expanded={false}
                className="group w-full text-left focus:outline-none"
              >
                {/* Breathing room inside the tile's own square, so the cards
                    behind lean into padding rather than into the neighbouring
                    tile. Inside, so every cell stays the same size — a fan that
                    grew its cell would shove the whole row out of alignment. */}
                <div className="aspect-square w-full px-3 pt-3">
                  <CoverFan
                    albums={run.albums}
                    className="h-full w-full transition-transform group-hover:-translate-y-0.5"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">
                  {run.artist}
                </p>
                <p className="line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {plural(run.albums.length, 'album')}
                </p>
              </button>
            </li>
          )
        }

        const wasExpanded = fanning && run.albums.length >= FAN_MIN
        return run.albums.map((album, i) => (
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
            {/* The way back, on the last tile of a run the user opened out. */}
            {wasExpanded && i === run.albums.length - 1 && (
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev)
                    next.delete(run.artist)
                    return next
                  })
                }
                className="mt-1 text-[12px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
              >
                Fold {run.artist} back up
              </button>
            )}
          </li>
        ))
      })}
    </ul>
  )
}

/**
 * Artist, then year, then title.
 *
 * An artist's records in the order they were made is the order people picture
 * them in; alphabetical-by-title scatters a discography and is the default
 * nobody asks for. It is also what puts an artist's albums next to each other,
 * which is what makes the runs above possible without a second pass.
 */
function byArtistThenYear(a: Album, b: Album): number {
  const artist = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' })
  if (artist !== 0) return artist
  const year = (a.year ?? 9999) - (b.year ?? 9999)
  if (year !== 0) return year
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}
