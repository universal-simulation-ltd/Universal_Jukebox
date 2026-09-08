import { useMemo } from 'react'
import Cover from './Cover'
import { clock, plural, totalTime } from '../lib/format'
import { navigate } from '../lib/route'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'

// One album: the cover big, the tracks in running order, and the two buttons
// that matter.

export default function AlbumView({ albumId }: { albumId: string }) {
  const albums = useLibraryStore((s) => s.albums)
  const allTracks = useLibraryStore((s) => s.tracks)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const enqueue = usePlayerStore((s) => s.enqueue)
  const queued = usePlayerStore((s) => s.queue.length)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const playing = usePlayerStore((s) => s.playing)
  const nowPlaying = usePlayerStore(currentTrack)

  const album = albums.find((a) => a.id === albumId)
  const tracks = useMemo(
    () => sortAlbumTracks(allTracks.filter((t) => t.albumId === albumId)),
    [allTracks, albumId],
  )

  if (!album) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">That album isn’t in the library.</p>
        <button
          type="button"
          onClick={() => navigate({ view: 'albums' })}
          className="mt-3 text-sm font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
        >
          Back to albums
        </button>
      </div>
    )
  }

  const total = totalTime(tracks)
  // Multi-disc albums show their disc headings; single-disc ones must not, or
  // every ordinary album grows a spurious "Disc 1" row.
  const discs = new Set(tracks.map((t) => t.discNo ?? 1))
  const showDiscs = discs.size > 1

  /**
   * Shuffle from the album view turns shuffle ON and starts — rather than
   * toggling it. A "Shuffle" button that sometimes un-shuffles is a button
   * whose label is wrong half the time.
   */
  const shuffleAlbum = () => {
    if (!shuffle) toggleShuffle()
    playTracks(tracks, 0)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate({ view: 'albums' })}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        All albums
      </button>

      {/* Stacks to one column below 980px (tier T3): deck above, words below. */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <Cover
          album={album}
          className="aspect-square w-full max-w-[260px] shadow-md ring-1 ring-slate-900/5 md:w-[260px] dark:ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
            {album.title}
          </h1>
          <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-300">{album.artist}</p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            {[album.year, plural(tracks.length, 'track'), total].filter(Boolean).join(' · ')}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => playTracks(tracks, 0)}
              disabled={tracks.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:opacity-50"
            >
              <PlayGlyph />
              Play
            </button>
            <button
              type="button"
              onClick={shuffleAlbum}
              disabled={tracks.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
            >
              <ShuffleGlyph />
              Shuffle
            </button>
            {/* Only offered once something is already playing — "add to queue"
                with an empty queue is just "play", and two buttons that do the
                same thing is worse than one. */}
            {queued > 0 && (
              <button
                type="button"
                onClick={() => enqueue(tracks, 'end')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
              >
                Add to queue
              </button>
            )}
          </div>
        </div>
      </div>

      <ol className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
        {tracks.map((track, index) => {
          const isCurrent = nowPlaying?.id === track.id
          const first = showDiscs && (index === 0 || (tracks[index - 1].discNo ?? 1) !== (track.discNo ?? 1))
          return (
            <li key={track.id}>
              {first && (
                <p className="pt-5 pb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  Disc {track.discNo ?? 1}
                </p>
              )}
              <button
                type="button"
                onClick={() => playTracks(tracks, index)}
                className="group flex w-full items-center gap-3 py-2.5 text-left focus:outline-none focus-visible:bg-orange-50 dark:focus-visible:bg-orange-950/30"
              >
                <span
                  className={`w-7 shrink-0 text-right text-[13px] tabular-nums ${
                    isCurrent ? 'text-orange-700 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {/* The bars replace the number for the track that is on, so
                      the row that is playing is findable without reading it. */}
                  {isCurrent && playing ? <Bars /> : (track.trackNo ?? index + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[14px] ${
                      isCurrent
                        ? 'font-medium text-orange-700 dark:text-orange-400'
                        : 'text-slate-900 group-hover:text-orange-700 dark:text-slate-100 dark:group-hover:text-orange-400'
                    }`}
                  >
                    {track.title}
                  </span>
                  {/* Only when it differs from the album artist — printing
                      "Radiohead" under all ten tracks of a Radiohead album is
                      noise, but on a compilation this line is the point. */}
                  {track.artist && track.artist !== album.artist && (
                    <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                      {track.artist}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                  {clock(track.durationSec)}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" />
    </svg>
  )
}

function ShuffleGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h3.2c1 0 2 .5 2.5 1.4l3.6 6.2c.5.9 1.5 1.4 2.5 1.4H17M3 15h3.2c1 0 2-.5 2.5-1.4l.9-1.5M12.3 7l.9-1.6c.5-.9 1.5-1.4 2.5-1.4H17" />
      <path d="m15 2 2 2-2 2M15 12l2 2-2 2" />
    </svg>
  )
}

/** Three bars, animated while a track plays. Still under reduced motion. */
function Bars() {
  return (
    <span className="inline-flex h-3.5 items-end gap-[2px] align-middle" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-current motion-safe:animate-[bars_900ms_ease-in-out_infinite] motion-reduce:h-2"
          style={{ animationDelay: `${i * 140}ms`, height: '55%' }}
        />
      ))}
    </span>
  )
}
