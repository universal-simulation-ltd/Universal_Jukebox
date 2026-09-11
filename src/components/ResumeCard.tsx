import { useEffect, useMemo, useState } from 'react'
import Cover from './Cover'
import { coverUrl, fallbackHue } from '../lib/art'
import { resolveDeck } from '../lib/decks'
import { clock } from '../lib/format'
import { lockArt } from '../lib/lockArt'
import { readSession } from '../lib/session'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'

// "Resume listening" (James, 2026-09-11: "have a line above the first albums /
// artists / songs with an image of the device + art with 'Resume listening'
// which is the last track they were playing, have a hide and do not show again
// buttons. if they click the art then immediately start loading the track").
//
// The picture is the lock screen's own — the album ON the machine it plays on
// (`lockArt`) — so the card, Now Playing and the lock screen agree. Shown only
// while nothing is playing: once something is, the player bar is the way back.

/** "Hide" lasts until the app is next opened — held here, across tab switches. */
let hiddenThisVisit = false

export default function ResumeCard() {
  const enabled = useSettingsStore((s) => s.resumeCard)
  const setSetting = useSettingsStore((s) => s.set)
  const deckSetting = useSettingsStore((s) => s.deck)
  const eras = useSettingsStore((s) => s.deckEras)
  const queued = usePlayerStore((s) => s.queue.length)
  const resume = usePlayerStore((s) => s.resume)
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const [hidden, setHidden] = useState(hiddenThisVisit)
  const [art, setArt] = useState<string | null>(null)

  // Read once per visit to the page: the card shows where you WERE.
  const session = useMemo(() => readSession(), [])
  const track = session ? tracks.find((t) => t.id === session.trackId) : undefined
  const album = track ? albums.find((a) => a.id === track.albumId) : undefined

  useEffect(() => {
    if (!track) return
    let live = true
    const id = album?.id ?? track.albumId
    void lockArt({
      albumId: id,
      cover: album ? coverUrl(album.id, album.cover) : null,
      hue: fallbackHue(id),
      style: resolveDeck(deckSetting, album ?? track, eras),
    }).then((drawn) => {
      if (live && drawn) setArt(drawn.stillUrl)
    })
    return () => {
      live = false
    }
  }, [track, album, deckSetting, eras])

  if (!enabled || hidden || queued > 0 || !session || !track) return null

  return (
    <section
      aria-label="Resume listening"
      className="mb-6 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
    >
      <button
        type="button"
        onClick={() => resume()}
        className="group flex min-w-0 flex-1 items-center gap-3.5 text-left focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
      >
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/10 dark:ring-white/10">
          {art ? <img src={art} alt="" className="h-full w-full object-cover" /> : <Cover album={album} className="h-full w-full" />}
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/25">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-md">
              <svg viewBox="0 0 20 20" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" />
              </svg>
            </span>
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-wide text-orange-700 uppercase dark:text-orange-400">
            Resume listening
          </span>
          <span className="mt-0.5 block truncate text-[15px] font-medium text-slate-900 dark:text-slate-100">{track.title}</span>
          <span className="block truncate text-[12.5px] text-slate-500 dark:text-slate-400">
            {[track.artist ?? track.albumArtist, album?.title].filter(Boolean).join(' · ')}
            {session.sec > 5 ? ` · from ${clock(session.sec)}` : ''}
          </span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            hiddenThisVisit = true
            setHidden(true)
          }}
          className="rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Hide
        </button>
        <button
          type="button"
          onClick={() => setSetting('resumeCard', false)}
          className="rounded-full px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
        >
          Don’t show again
        </button>
      </div>
    </section>
  )
}
