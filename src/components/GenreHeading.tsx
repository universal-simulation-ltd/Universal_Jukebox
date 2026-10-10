import { GENRE_MIN, shownGenre } from '../lib/genres'
import { useT } from '../i18n'

// The genre a run of records belongs to, and the note that owns up to what the
// genre view leaves out.
//
// Both are here rather than in each of the three lists so that Albums, Artists
// and Tracks say the same thing in the same words — the shelf writes its own
// heading (`ShelfRow`'s `heading`), because a full-bleed shelf needs the page's
// side padding put back on that one line.

/** The genre over a run of tiles, with how many are in it. */
export default function GenreHeading({ genre, count }: { genre: string; count: number }) {
  useT() // re-render on a language switch, for `shownGenre`
  return (
    <h3 className="mb-3 flex items-baseline gap-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
      {shownGenre(genre)}
      <span className="text-[12px] font-normal text-slate-500 tabular-nums dark:text-slate-400">{count}</span>
    </h3>
  )
}

/**
 * ⚠️ THE LIBRARY MUST SAY WHAT IT IS NOT SHOWING. Genre mode drops every genre
 * with fewer than `GENRE_MIN` songs behind it (James, 2026-09-12: "if there's
 * less than 3 songs to a genre don't show it") — which is what was asked for,
 * and is also a library quietly losing records. A person who cannot see why
 * their EP has vanished has no way to tell this rule from a bug; one line of
 * plain English is the difference.
 */
export function GenreFootnote({ hidden }: { hidden: { songs: number; genres: number } }) {
  const t = useT()
  if (hidden.songs === 0) return null
  const min = t.num(GENRE_MIN)
  return (
    <p className="mt-6 text-center text-[12px] text-slate-500 dark:text-slate-400">
      {hidden.genres === 1
        ? t.plural('library.genre_footnote_one_genre', hidden.songs, { min })
        : t.plural('library.genre_footnote_genres', hidden.songs, { min, genres: t.num(hidden.genres) })}
    </p>
  )
}
