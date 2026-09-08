import { useMemo } from 'react'
import Cover from './Cover'
import { fold, plural } from '../lib/format'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import type { Album } from '../lib/types'

// Artists, each with their records under them.
//
// Built by grouping the ALBUMS rather than the tracks — an artist is a set of
// records here, not a set of songs, which is what makes the list short enough
// to scan. Grouping tracks would give a page of names on a compilation-heavy
// library and nothing to click.

export default function ArtistList({ query }: { query: string }) {
  const albums = useLibraryStore((s) => s.albums)

  const artists = useMemo(() => {
    const byArtist = new Map<string, Album[]>()
    for (const album of albums) {
      const list = byArtist.get(album.artist)
      if (list) list.push(album)
      else byArtist.set(album.artist, [album])
    }
    const needle = fold(query)
    return [...byArtist.entries()]
      .filter(([name]) => !needle || fold(name).includes(needle))
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

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {artists.map((artist) => (
        <li key={artist.name} className="py-5">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{artist.name}</h2>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
            {plural(artist.albums.length, 'album')}
          </p>
          {/* A horizontal rail rather than a wrapped grid: an artist's records
              read as a shelf, and it keeps a 30-album discography from pushing
              the next artist off the screen. */}
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {artist.albums.map((album) => (
              <li key={album.id} className="w-[116px] shrink-0">
                <button
                  type="button"
                  onClick={() => navigate({ view: 'album', albumId: album.id })}
                  className="group w-full text-left focus:outline-none"
                >
                  <Cover
                    album={album}
                    className="aspect-square w-full shadow-sm ring-1 ring-slate-900/5 transition group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-orange-600 dark:ring-white/10"
                  />
                  <p className="mt-1.5 line-clamp-2 text-[12px] text-slate-700 group-hover:text-orange-700 dark:text-slate-300 dark:group-hover:text-orange-400">
                    {album.title}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
