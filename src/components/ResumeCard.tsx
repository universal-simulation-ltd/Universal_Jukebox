import { useEffect, useState } from 'react'
import Cover from './Cover'
import { coverUrl, fallbackHue } from '../lib/art'
import { resolveDeck } from '../lib/decks'
import { clock } from '../lib/format'
import { lockArt } from '../lib/lockArt'
import { hideResume, useResumable } from '../lib/resume'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'

// "Resume listening" (James, 2026-09-11: "have a line above the first albums /
// artists / songs with an image of the device + art with 'Resume listening'
// which is the last track they were playing, have a hide and do not show again
// buttons. if they click the art then immediately start loading the track").
//
// The picture is the lock screen's own — the album ON the machine it plays on
// (`lockArt`) — so the card, Now Playing and the lock screen agree. When it
// shows is `useResumable`, which the lists ask too.

export default function ResumeCard({ wrap }: { wrap?: (card: React.ReactNode) => React.ReactNode } = {}) {
  const setSetting = useSettingsStore((s) => s.set)
  const deckSetting = useSettingsStore((s) => s.deck)
  const eras = useSettingsStore((s) => s.deckEras)
  const resume = usePlayerStore((s) => s.resume)
  const resumable = useResumable()
  const track = resumable?.track
  const album = resumable?.album
  const [art, setArt] = useState<string | null>(null)

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

  if (!resumable || !track) return null
  const { session } = resumable

  // ⚠️ THE TRACK AND ITS ARTIST, not the album (James, 2026-09-11: "in the
  // resume listening art show the track with the artist"). The album is the
  // first tile of the row above (`leadWith` in the lists), so the card names
  // the song. The Hide buttons sit UNDER the words rather than in a column
  // beside them, which on a phone left the title about ten letters.
  const card = (
    <section
      aria-label="Resume listening"
      className="flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
    >
      {/* The art resumes too; the words below are the button a screen reader
          announces, so this one is left out of the tab order. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => resume()}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/10 dark:ring-white/10"
      >
        {art ? <img src={art} alt="" className="h-full w-full object-cover" /> : <Cover album={album} className="h-full w-full" />}
        {/* ▶ in the CORNER, off the label — in the middle it covered the
            album art, which is the one part of the picture that says which
            song this is. */}
        <span className="absolute inset-0 flex items-end justify-end bg-slate-900/0 p-1 transition group-hover:bg-slate-900/25">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-md ring-2 ring-white dark:ring-slate-900">
            <svg viewBox="0 0 20 20" className="ml-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M6.3 3.4A1 1 0 0 0 4.8 4.3v11.4a1 1 0 0 0 1.5.9l9.4-5.7a1 1 0 0 0 0-1.8L6.3 3.4Z" />
            </svg>
          </span>
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => resume()}
          className="block w-full text-left focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          <span className="block text-[11px] font-semibold tracking-wide text-orange-700 uppercase dark:text-orange-400">
            Resume listening{session.sec > 5 ? ` · ${clock(session.sec)}` : ''}
          </span>
          <span className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-medium text-slate-900 dark:text-slate-100">{track.title}</span>
          <span className="block truncate text-[13px] text-slate-600 dark:text-slate-300">
            {track.artist ?? track.albumArtist ?? album?.artist}
          </span>
        </button>
        <div className="-ml-2.5 mt-1 flex flex-wrap">
          <button
            type="button"
            onClick={hideResume}
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={() => setSetting('resumeCard', false)}
            className="rounded-full px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
          >
            Don’t show again
          </button>
        </div>
      </div>
    </section>
  )
  return wrap ? wrap(card) : card
}
