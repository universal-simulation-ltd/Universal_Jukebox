import { useEffect, useMemo, useState, type ReactNode } from 'react'
import PreviewButton from './PreviewButton'
import { withResumeRow } from './resumeRow'
import { TrackShelf } from './Shelf'
import AddToShelf from './AddToShelf'
import { useSettingsStore } from '../stores/settingsStore'
import { leadWith, useResumable } from '../lib/resume'
import { clock } from '../lib/format'
import { matchTracks } from '../lib/search'
import { seededOrder, type LibraryOrder } from '../lib/libraryView'
import { GENRE_MIN, groupByGenre, hiddenByGenre, shownGenres, tallyGenres, trackGenres } from '../lib/genres'
import GenreHeading, { GenreFootnote } from './GenreHeading'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import type { Track } from '../lib/types'

// Every track, in one list.
//
// ⚠️ CAPPED, and the cap is visible. A library of five thousand tracks rendered
// as five thousand DOM rows is a page that takes seconds to lay out and janks
// on every scroll. The honest fixes are windowing (a dependency and a scroll
// container that fights the page) or a cap that says so — and for a view whose
// job is "find one track", a search box over the whole library plus the first
// few hundred rows does the job that windowing would, at no cost.
//
// The search filters the WHOLE library, not the visible page. That is the part
// that makes the cap acceptable rather than a lie.
const CAP = 400

type Row = { heading: string; count: number }

/**
 * The rows of the list: the songs, with a genre heading before each run when
 * the list is grouped.
 *
 * ⚠️ THE RESUME ROW IS NOT INSERTED WHILE GROUPED. Its slot is the second row,
 * which in a grouped list is the first song of the first genre — a card
 * dropped under a heading that then describes the wrong thing. Ungrouped, it
 * goes exactly where it always did.
 */
function withRows(
  groups: { genre: string; items: Track[] }[] | null,
  songs: Track[],
  render: (row: Track | Row) => ReactNode,
): ReactNode[] {
  const rows = rowsOf(groups, songs).map(render)
  return groups ? rows : withResumeRow(rows, 1, 'row')
}

function rowsOf(groups: { genre: string; items: Track[] }[] | null, songs: Track[]): (Track | Row)[] {
  if (!groups) return songs
  return groups.flatMap((group) => [{ heading: group.genre, count: group.items.length }, ...group.items])
}

/** Whether the list was opened past its first few hundred — see `showAll`. */
let shownAll = false

export default function TrackList({ query, order }: { query: string; order: LibraryOrder }) {
  const tracks = useLibraryStore((s) => s.tracks)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const playing = usePlayerStore((s) => s.playing)
  const nowPlaying = usePlayerStore(currentTrack)
  const [showAll, setShowAll] = useState(() => shownAll)
  // Kept outside the list, as the scroll is — back from Now Playing, a list you
  // had opened all the way is still open all the way.
  useEffect(() => {
    shownAll = showAll
  }, [showAll])
  const columns = useSettingsStore((s) => s.libraryColumns.tracks)
  const leadId = useResumable()?.track.id ?? null

  // ⚠️ `matchTracks` and not an inline filter: the count in the tab above comes
  // from the same function, and two copies of "what counts as a match" drift
  // without anything failing.
  const listed = useMemo(() => {
    const found = matchTracks(tracks, query)
    const ordered = order.kind === 'random' ? seededOrder(found, (t) => t.id, order.seed) : [...found].sort(byTitle)
    return ordered
  }, [tracks, query, order])
  // The song "Resume listening" names, first — at the top of the list, or at
  // the front of the FIRST shelf, the shelves otherwise as they are.
  const resumeTrack = leadId ? listed.find((t) => t.id === leadId) : undefined
  const matched = useMemo(() => leadWith(listed, leadId ? (t) => t.id === leadId : null), [listed, leadId])

  // Grouped by genre — the songs' own tags, no album or artist in between
  // (`lib/genres.ts`).
  const genre = useMemo(() => {
    if (order.kind !== 'genre') return null
    const tally = tallyGenres(tracks)
    return { groups: groupByGenre(listed, trackGenres, shownGenres(tally)), hidden: hiddenByGenre(tally) }
  }, [order.kind, tracks, listed])

  /**
   * ⚠️ THE CAP STILL APPLIES WHEN GROUPED, and it is spent across the genres in
   * order rather than per genre. `CAP` exists because five thousand rows is a
   * page that janks (see the header); genre mode does not make the DOM cheaper,
   * and a cap of 400 EACH would be ten times the rows on a library with ten
   * genres.
   */
  const genreShown = useMemo(() => {
    if (!genre) return null
    if (showAll) return genre.groups
    const out: typeof genre.groups = []
    let left = CAP
    for (const group of genre.groups) {
      if (left <= 0) break
      out.push({ genre: group.genre, items: group.items.slice(0, left) })
      left -= Math.min(left, group.items.length)
    }
    return out
  }, [genre, showAll])

  const shown = showAll ? matched : matched.slice(0, CAP)
  const inGenres = genre?.groups.reduce((n, g) => n + g.items.length, 0) ?? 0
  const hidden = genre
    ? inGenres - (genreShown ?? []).reduce((n, g) => n + g.items.length, 0)
    : matched.length - shown.length

  if (matched.length === 0 || (genre && genre.groups.length === 0)) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim()
          ? `Nothing matching “${query}”.`
          : genre && tracks.length > 0
            ? `No genre here has ${GENRE_MIN} songs or more, so there is nothing to file. Switch back to A–Z.`
            : 'No tracks yet.'}
      </p>
    )
  }

  return (
    <>
      {/* The shelf view shows the songs as the records themselves (James,
          2026-09-11: "on tracks show the actual records on the shelf, not the
          album + record"); a tap plays the matched list from there, as a row
          in the list does. */}
      {columns === 'jukebox' ? (
        <TrackShelf
          tracks={showAll ? listed : listed.slice(0, CAP)}
          // No lead while grouped: the resume song belongs on its own genre's
          // shelf, not at the front of whichever genre comes first.
          lead={genre ? undefined : resumeTrack}
          groups={genreShown ?? undefined}
          onPlay={(track) => playTracks(listed, listed.indexOf(track))}
        />
      ) : (
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {withRows(genreShown, shown, (track) => {
          if ('heading' in track) {
            return (
              <li key={`genre-${track.heading}`} className="pt-5 pb-1 first:pt-0">
                <GenreHeading genre={track.heading} count={track.count} />
              </li>
            )
          }
          const isCurrent = nowPlaying?.id === track.id
          return (
            <li key={track.id} className="flex items-center gap-2">
              <button
                type="button"
                // Clicking a track in this view queues everything MATCHED, from
                // that track on — so a search for "live" becomes a playlist by
                // pressing play on it. Queuing only the one track would make the
                // list a dead end.
                onClick={() => playTracks(matched, matched.indexOf(track))}
                className="group flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left focus:outline-none focus-visible:bg-orange-50 dark:focus-visible:bg-orange-950/30"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[14px] ${
                      isCurrent
                        ? 'font-medium text-orange-700 dark:text-orange-400'
                        : 'text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400'
                    }`}
                  >
                    {isCurrent && playing ? '▶ ' : ''}
                    {track.title}
                  </span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {[track.artist, track.album].filter(Boolean).join(' — ') || 'Unknown'}
                  </span>
                </span>
                {/* Hidden below 560px (tier T5): the format chip is the first
                    thing that goes when the row has to earn its width. */}
                <span className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase sm:inline dark:border-slate-700 dark:text-slate-400">
                  {track.ext}
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                  {clock(track.durationSec)}
                </span>
              </button>
              {/* ⚠️ OUTSIDE the row button, not inside it: a button cannot be
                  nested in a button, and "hear ten seconds of this" must not
                  also queue the whole list. */}
              <AddToShelf tracks={[track]} variant="icon" />
              <PreviewButton track={track} />
            </li>
          )
        })}
      </ul>
      )}

      {hidden > 0 && (
        <div className="py-6 text-center">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Showing the first {CAP.toLocaleString()} of {matched.length.toLocaleString()}. Search finds any of them.
          </p>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 text-[13px] font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
          >
            Show all {matched.length.toLocaleString()} anyway
          </button>
        </div>
      )}
      {genre && <GenreFootnote hidden={genre.hidden} />}
    </>
  )
}

function byTitle(a: Track, b: Track): number {
  const title = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  if (title !== 0) return title
  return (a.artist ?? '').localeCompare(b.artist ?? '', undefined, { sensitivity: 'base' })
}
