import { useMemo, useState } from 'react'
import Cover from './Cover'
import CoverFan from './CoverFan'
import { plural } from '../lib/format'
import { matchArtistNames } from '../lib/search'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import type { Album } from '../lib/types'

// Artists, each with their records under them.
//
// Built by grouping the ALBUMS rather than the tracks — an artist is a set of
// records here, not a set of songs, which is what makes the list short enough
// to scan. Grouping tracks would give a page of names on a compilation-heavy
// library and nothing to click.
//
// ⚠️ A GRID of cards, not a stack of full-width rows.
//
// Each artist used to be a full-width block: name, count, and a horizontal rail
// of covers. That put a line break between every artist and gave a library with
// forty of them a page you scroll for a minute — most of it whitespace, because
// an artist with one album still took the full width. Artists now flow one
// after another, several to a row, and open out in place.

export default function ArtistList({ query }: { query: string }) {
  const albums = useLibraryStore((s) => s.albums)
  const [openArtist, setOpenArtist] = useState<string | null>(null)

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
    return [...byArtist.entries()]
      .filter(([name]) => matching.has(name))
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([name, list]) => ({
        name,
        albums: [...list].sort((x, y) => (x.year ?? 9999) - (y.year ?? 9999)),
      }))
  }, [albums, query])

  if (artists.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim() ? `No artist matching “${query}”.` : 'No artists yet.'}
      </p>
    )
  }

  const open = artists.find((a) => a.name === openArtist)

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {artists.map((artist) => {
          const many = artist.albums.length > 1
          return (
            <li key={artist.name}>
              <button
                type="button"
                onClick={() =>
                  // One album is not worth opening a drawer for — go straight to
                  // the record, which is the only thing behind the door anyway.
                  many
                    ? setOpenArtist((prev) => (prev === artist.name ? null : artist.name))
                    : navigate({ view: 'album', albumId: artist.albums[0].id })
                }
                aria-expanded={many ? openArtist === artist.name : undefined}
                className="group w-full text-left focus:outline-none"
              >
                {many ? (
                  <div className="aspect-square w-full px-3 pt-3">
                    <CoverFan
                      albums={artist.albums}
                      className="h-full w-full transition-transform group-hover:-translate-y-0.5"
                    />
                  </div>
                ) : (
                  <Cover
                    album={artist.albums[0]}
                    className="aspect-square w-full shadow-sm ring-1 ring-slate-900/5 transition group-hover:-translate-y-0.5 group-hover:shadow-md dark:ring-white/10"
                  />
                )}
                <p
                  className={`mt-2 line-clamp-2 text-[13px] font-medium ${
                    openArtist === artist.name
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400'
                  }`}
                >
                  {artist.name}
                </p>
                <p className="line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {plural(artist.albums.length, 'album')}
                </p>
              </button>
            </li>
          )
        })}
      </ul>

      {/* ⚠️ The opened artist's records go BELOW the grid rather than inside it.
          Splicing a variable number of tiles into a responsive grid pushes every
          artist after them to a new position, so the one you clicked jumps
          somewhere else on the page at the moment you click it. A drawer under
          the grid leaves the grid still. */}
      {open && (
        <section className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              {open.name}
            </h2>
            <button
              type="button"
              onClick={() => setOpenArtist(null)}
              className="shrink-0 text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
            >
              Close
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {open.albums.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  onClick={() => navigate({ view: 'album', albumId: album.id })}
                  className="group w-full text-left focus:outline-none"
                >
                  <Cover
                    album={album}
                    className="aspect-square w-full shadow-sm ring-1 ring-slate-900/5 transition group-hover:-translate-y-0.5 dark:ring-white/10"
                  />
                  <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">
                    {album.title}
                  </p>
                  {album.year && (
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">{album.year}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
