import { useMemo, useState } from 'react'
import { clock, fold } from '../lib/format'
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

export default function TrackList({ query }: { query: string }) {
  const tracks = useLibraryStore((s) => s.tracks)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const playing = usePlayerStore((s) => s.playing)
  const nowPlaying = usePlayerStore(currentTrack)
  const [showAll, setShowAll] = useState(false)

  const matched = useMemo(() => {
    const needle = fold(query)
    const list = needle
      ? tracks.filter(
          (t) =>
            fold(t.title).includes(needle) ||
            fold(t.artist ?? '').includes(needle) ||
            fold(t.album ?? '').includes(needle),
        )
      : tracks
    return [...list].sort(byTitle)
  }, [tracks, query])

  const shown = showAll ? matched : matched.slice(0, CAP)
  const hidden = matched.length - shown.length

  if (matched.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        {query.trim() ? `Nothing matching “${query}”.` : 'No tracks yet.'}
      </p>
    )
  }

  return (
    <>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {shown.map((track) => {
          const isCurrent = nowPlaying?.id === track.id
          return (
            <li key={track.id}>
              <button
                type="button"
                // Clicking a track in this view queues everything MATCHED, from
                // that track on — so a search for "live" becomes a playlist by
                // pressing play on it. Queuing only the one track would make the
                // list a dead end.
                onClick={() => playTracks(matched, matched.indexOf(track))}
                className="group flex w-full items-center gap-3 py-2.5 text-left focus:outline-none focus-visible:bg-orange-50 dark:focus-visible:bg-orange-950/30"
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
            </li>
          )
        })}
      </ul>

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
    </>
  )
}

function byTitle(a: Track, b: Track): number {
  const title = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  if (title !== 0) return title
  return (a.artist ?? '').localeCompare(b.artist ?? '', undefined, { sensitivity: 'base' })
}
