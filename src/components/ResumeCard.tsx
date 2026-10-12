import { useEffect, useState } from 'react'
import Cover from './Cover'
import { coverUrl, fallbackHue } from '../lib/art'
import { resolveDeck } from '../lib/decks'
import { clock, shownName } from '../lib/format'
import { useT } from '../i18n'
import { lockArt } from '../lib/lockArt'
import { hideResume, nextVisit, useResumable, useSuggestion } from '../lib/resume'
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
  const t = useT()
  const setSetting = useSettingsStore((s) => s.set)
  const deckSetting = useSettingsStore((s) => s.deck)
  const eras = useSettingsStore((s) => s.deckEras)
  const resume = usePlayerStore((s) => s.resume)
  const resumable = useResumable()
  // Nothing to resume: a song at random, "Listen to this" (`useSuggestion`).
  // A new song each visit to the page, and another from the card's shuffle.
  const [showing, setShowing] = useState(nextVisit)
  const suggestion = useSuggestion(showing)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const track = resumable?.track ?? suggestion?.track
  const album = resumable ? resumable.album : suggestion?.album
  const play = () => {
    if (resumable) resume()
    else if (suggestion) playTracks(suggestion.albumTracks, Math.max(0, suggestion.albumTracks.findIndex((t) => t.id === suggestion.track.id)))
  }
  // The drawing is kept with the song it shows. ⚠️ A bare URL kept showing the
  // LAST song's record until the new one was drawn (James, 2026-10-12: "it
  // takes a long time to load the new record graphic"): now the new album's
  // cover stands in, and the song "Another" brings next is drawn ahead.
  const [art, setArt] = useState<{ id: string; url: string } | null>(null)
  const upNext = suggestion?.upNext ?? null

  useEffect(() => {
    if (!track) return
    let live = true
    const draw = (t: NonNullable<typeof track>, a: typeof album) => {
      const id = a?.id ?? t.albumId
      return lockArt({
        albumId: id,
        cover: a ? coverUrl(a.id, a.cover) : null,
        hue: fallbackHue(id),
        style: resolveDeck(deckSetting, a ?? t, eras),
      })
    }
    void draw(track, album).then((drawn) => {
      if (live && drawn) setArt({ id: track.id, url: drawn.stillUrl })
      // After this one, so the two don't share the phone's time.
      if (live && upNext) void draw(upNext.track, upNext.album)
    })
    return () => {
      live = false
    }
  }, [track, album, upNext, deckSetting, eras])

  if (!track) return null
  const session = resumable?.session
  const label = resumable ? t('library.resume_listening') : t('library.listen_to_this')

  // ⚠️ THE TRACK AND ITS ARTIST, not the album (James, 2026-09-11: "in the
  // resume listening art show the track with the artist"). The album is the
  // first tile of the row above (`leadWith` in the lists), so the card names
  // the song. The Hide buttons sit UNDER the words rather than in a column
  // beside them, which on a phone left the title about ten letters.
  const card = (
    <section
      aria-label={label}
      className="flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
    >
      {/* The art resumes too; the words below are the button a screen reader
          announces, so this one is left out of the tab order. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={play}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/10 dark:ring-white/10"
      >
        {art && art.id === track.id ? <img src={art.url} alt="" className="h-full w-full object-cover" /> : <Cover album={album} className="h-full w-full" />}
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
          onClick={play}
          className="block w-full text-left focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          <span className="block text-[11px] font-semibold tracking-wide text-orange-700 uppercase dark:text-orange-400">
            {label}{session && session.sec > 5 ? ` · ${clock(session.sec)}` : ''}
          </span>
          <span className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-medium text-slate-900 dark:text-slate-100">{track.title}</span>
          <span className="block truncate text-[13px] text-slate-600 dark:text-slate-300">
            {track.artist ?? track.albumArtist ?? shownName(album?.artist)}
          </span>
        </button>
        <div className="-ml-2.5 mt-1 flex flex-wrap">
          {!resumable && (
            <button
              type="button"
              onClick={() => setShowing(nextVisit())}
              aria-label={t('library.another_song')}
              title={t('library.another_song')}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-orange-700 hover:bg-slate-100 dark:text-orange-400 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h3.5c1.6 0 2.6.8 3.5 2.2l1.2 1.8c.9 1.4 1.9 2.2 3.5 2.2H17M14.5 9.5 17 12l-2.5 2.5M3 14h3.5c1 0 1.7-.3 2.3-.9M11.2 6.9c.6-.6 1.3-.9 2.3-.9H17M14.5 3.5 17 6l-2.5 2.5" />
              </svg>
              {t('library.another')}
            </button>
          )}
          <button
            type="button"
            onClick={hideResume}
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('library.hide')}
          </button>
          <button
            type="button"
            onClick={() => setSetting('resumeCard', false)}
            className="rounded-full px-2.5 py-1 text-[12px] text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
          >
            {t('library.dont_show_again')}
          </button>
        </div>
      </div>
    </section>
  )
  return wrap ? wrap(card) : card
}
