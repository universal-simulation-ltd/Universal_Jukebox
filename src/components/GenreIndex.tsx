import { useMemo } from 'react'
import { GENRE_MIN, genreIndex, genreMinimum, hiddenByGenre, shownGenre, tallyGenres } from '../lib/genres'
import { fold } from '../lib/format'
import { useT } from '../i18n'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { useSettingsStore, type ListTab } from '../stores/settingsStore'

// Genre mode's front page: the genres themselves, and a tap opens one.
//
// James, 2026-09-30: "In genre view I want it to show the genres e.g. blues,
// rock with default as min 3 in a genre to show it. When clicking the genre
// show the artists / albums / tracks inside it". Before this, Genre filed the
// whole list under a heading per genre, which on a real library is one very
// long page whose first genre is whatever sorts first (screenshot:
// "®O©K +++ © @").
//
// ⚠️ THE SAME LIST ON ALL THREE TABS. A genre is a genre whichever tab you are
// on; the tab only decides what opens — `#/<tab>/genre/<name>`, where the tabs
// then look inside that one genre (`route.genre`, `libraryInGenre`).

export default function GenreIndex({ tab, query }: { tab: ListTab; query: string }) {
  const t = useT()
  const albums = useLibraryStore((s) => s.albums)
  const tracks = useLibraryStore((s) => s.tracks)
  const min3 = useSettingsStore((s) => s.genresMin3)
  const min = genreMinimum(min3)

  const entries = useMemo(() => {
    const all = genreIndex(albums, tracks, min)
    const needle = fold(query)
    // The name as SHOWN, so "No genre" is found by the word on screen.
    return needle ? all.filter((g) => fold(shownGenre(g.name)).includes(needle)) : all
    // `t`: a language switch renames "No genre", so the filter runs again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums, tracks, min, query, t])
  const hidden = useMemo(() => hiddenByGenre(tallyGenres(tracks), min), [tracks, min])

  if (entries.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim()
          ? t('library.no_genre_matching', { query })
          : tracks.length === 0
            ? t('library.no_music_yet')
            : t.plural('library.no_genre_listed', GENRE_MIN)}
      </p>
    )
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((g) => (
          <li key={g.name}>
            <button
              type="button"
              onClick={() => navigate({ view: tab, genre: g.name })}
              className="group flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E05504] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500"
            >
              <span className="line-clamp-2 text-[15px] font-semibold text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400">
                {shownGenre(g.name)}
              </span>
              <span className="mt-1 text-[12px] text-slate-500 tabular-nums dark:text-slate-400">
                {t.plural('common.songs', g.songs)}
              </span>
              <span className="text-[12px] text-slate-500 tabular-nums dark:text-slate-400">
                {t.plural('common.artists', g.artists)} · {t.plural('common.albums', g.albums)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {/* ⚠️ The list must say what it is not showing — see `GenreFootnote`. */}
      {min3 && hidden.songs > 0 && (
        <p className="mt-6 text-center text-[12px] text-slate-500 dark:text-slate-400">
          {hidden.genres === 1
            ? t.plural('library.genre_list_hidden_one_genre', hidden.songs, { min: t.num(GENRE_MIN) })
            : t.plural('library.genre_list_hidden_genres', hidden.songs, { min: t.num(GENRE_MIN), genres: t.num(hidden.genres) })}
        </p>
      )}
    </>
  )
}
