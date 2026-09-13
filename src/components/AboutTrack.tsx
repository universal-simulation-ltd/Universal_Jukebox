import { useEffect, useRef, useState } from 'react'
import { navigate } from '../lib/route'
import { scrollBelowBar } from '../lib/scrollBelowBar'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import type { WikiPage } from '../lib/aboutTrack'
import { useAboutStore } from '../stores/aboutStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'

// "About this track": what Wikipedia says about the song on the deck and about
// whoever is singing it (James, 2026-09-13). The asking is `lib/aboutTrack.ts`;
// when it may ask is `stores/aboutStore.ts`.
//
// ⚠️ Nothing is asked until the panel is OPEN, and nothing at all while the
// lookup is off — the effect below is the gate, exactly as for the lyrics.

export default function AboutTrack() {
  const track = usePlayerStore(currentTrack)
  const open = useAboutStore((s) => s.open)
  const load = useAboutStore((s) => s.load)
  const status = useAboutStore((s) => s.status)

  useEffect(() => {
    if (open && track) load(track)
  }, [open, track, load])

  if (!open || !track) return null
  return (
    <section className="mt-4 text-left">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          About this track
        </h2>
        {status === 'ready' && <p className="text-[12px] text-slate-400 dark:text-slate-500">From Wikipedia</p>}
      </div>
      <Body />
    </section>
  )
}

/**
 * The way in: just an "i", directly under the song's title, artist and album
 * (James, 2026-09-13: "Have just the 'i' symbol and put it directly below the
 * track details"). Its name is said to a screen reader and on hover.
 *
 * Opening it scrolls the page so the "i" sits at the top of the screen, under
 * the navbar, with the panel filling what is below ("When clicked scroll down
 * so that the 'i' is at the top of the screen (below navbar)") — and once more
 * when the answer lands, because until then the page may be too short to
 * scroll that far. The lyrics' "Show lyrics" does the same (`scrollBelowBar`).
 *
 * ⚠️ `NowPlaying` draws the song's details twice (above the deck on a phone,
 * beside it from `lg`), one hidden by CSS, so this and the panel are mounted
 * twice. They share one store, and `load` asks once per track. That is why the
 * scroll goes to THIS button's ref — the one tapped, the one on screen — and
 * never to an `id`, which would find whichever copy came first.
 */
export function AboutToggle() {
  const open = useAboutStore((s) => s.open)
  const setOpen = useAboutStore((s) => s.setOpen)
  const status = useAboutStore((s) => s.status)
  const reduced = usePrefersReducedMotion()
  const button = useRef<HTMLButtonElement>(null)
  /** Set by a tap on THIS copy; cleared once the answer has landed. */
  const revealing = useRef(false)

  useEffect(() => {
    if (!open || !revealing.current) return
    scrollBelowBar(button.current, reduced)
    if (status !== 'idle' && status !== 'loading') {
      revealing.current = false
      const again = window.setTimeout(() => scrollBelowBar(button.current, reduced), 350)
      return () => window.clearTimeout(again)
    }
  }, [open, status, reduced])

  const label = open ? 'Hide track info' : 'About this track'
  return (
    <button
      ref={button}
      type="button"
      aria-pressed={open}
      aria-label={label}
      title={label}
      onClick={(e) => {
        // The ceremony is skipped by any click on the page (App.tsx); a button
        // on the deck's screen is not that click.
        e.stopPropagation()
        if (!open) revealing.current = true
        setOpen(!open)
      }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
        open
          ? 'border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
          : 'border-slate-300 text-slate-500 hover:border-orange-300 hover:text-orange-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-orange-700 dark:hover:text-orange-400'
      }`}
    >
      {/* A plain "i" — the circle is the button's own border. */}
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
        <circle cx="10" cy="5.25" r="1.5" />
        <path d="M8 8.25h3.25v6.5H12.5v1.75h-4.75v-1.75H9V10H8V8.25Z" />
      </svg>
    </button>
  )
}

function Body() {
  const track = usePlayerStore(currentTrack)
  const status = useAboutStore((s) => s.status)
  const song = useAboutStore((s) => s.song)
  const artist = useAboutStore((s) => s.artist)
  const message = useAboutStore((s) => s.message)
  const trackId = useAboutStore((s) => s.trackId)
  const reload = useAboutStore((s) => s.reload)
  if (!track) return null

  if (status === 'idle' || status === 'loading') return <Note>Looking this song up…</Note>
  if (status === 'off') return <Offer />
  if (status === 'untagged') {
    return <Note>This track has no artist in its tags, so there’s nothing to look it up by.</Note>
  }
  if (status === 'error') {
    return (
      <Card>
        <p className="text-[13.5px] text-slate-600 dark:text-slate-300">{message}</p>
        <button
          type="button"
          onClick={() => reload(track)}
          className="mt-3 text-[13px] font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
        >
          Try again
        </button>
      </Card>
    )
  }
  if (status === 'none' || (!song && !artist)) {
    return (
      <Note>
        Wikipedia doesn’t seem to have an article about this song, or about{' '}
        {track.artist ?? track.albumArtist ?? 'this artist'}.
      </Note>
    )
  }
  return (
    <div className="space-y-4">
      {/* No article about the song: nothing is said about it, the artist is
          simply shown (James, 2026-09-13: "just hide that part don't say it
          doesn't have one"). */}
      {song && <Article key={`${trackId}:song`} label="The song" page={song} />}
      {artist && <Article key={`${trackId}:artist`} label="The artist" page={artist} brief />}
      {/* Wikipedia's text is CC BY-SA: reusing it means saying where it came
          from and under what licence, next to it. Each article links above. */}
      <p className="text-[11.5px] leading-relaxed text-slate-400 dark:text-slate-500">
        Text from Wikipedia, under{' '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-400"
        >
          CC BY-SA 4.0
        </a>
        . Found by the song’s title and artist, so now and then it may be about a different song of the same name.
      </p>
    </div>
  )
}

/**
 * One article's opening — two paragraphs for the song, one for the artist,
 * and "More" for the rest of its opening section.
 */
function Article({ label, page, brief = false }: { label: string; page: WikiPage; brief?: boolean }) {
  const first = brief ? 1 : 2
  const [all, setAll] = useState(false)
  const shown = all ? page.paragraphs : page.paragraphs.slice(0, first)
  return (
    <article className="rounded-lg border border-slate-200 px-4 py-4 dark:border-slate-800">
      {page.thumbnail && (
        // `no-referrer`: the picture comes from Wikimedia, which needs to know
        // nothing about the page asking for it.
        <img
          src={page.thumbnail}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="float-right mb-2 ml-4 h-20 w-20 rounded-lg object-cover"
        />
      )}
      <p className="text-[11.5px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">{label}</p>
      <h3 className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-slate-100">{page.title}</h3>
      <div className="mt-2 space-y-2.5 text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">
        {shown.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      <div className="clear-both mt-3 flex flex-wrap items-center gap-4">
        {page.paragraphs.length > first && (
          <button
            type="button"
            onClick={() => setAll(!all)}
            className="text-[12.5px] font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
          >
            {all ? 'Less' : 'More'}
          </button>
        )}
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          Read it on Wikipedia
        </a>
      </div>
    </article>
  )
}

/**
 * The lookup is off: say what it would do and what it would send, and offer to
 * do it — here, where the question was asked, rather than only on a Settings
 * page (the lyrics panel's rule).
 */
function Offer() {
  const track = usePlayerStore(currentTrack)
  const setSetting = useSettingsStore((s) => s.set)
  const reload = useAboutStore((s) => s.reload)
  return (
    <Card>
      <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
        Jukebox can look this song up on Wikipedia: who wrote it, whose song it was first, how it did in the charts,
        and who’s singing it.
      </p>
      <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">
        That sends the song’s title and the artist’s name to Wikipedia — nothing else, and nothing at all unless you
        turn it on. Each song is only looked up once.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setSetting('aboutOnline', true)
            if (track) reload(track)
          }}
          className="rounded-md bg-orange-700 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-orange-800"
        >
          Look it up on Wikipedia
        </button>
        <button
          type="button"
          onClick={() => navigate({ view: 'settings' })}
          className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          More about this in Settings
        </button>
      </div>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 px-4 py-5 dark:border-slate-800">{children}</div>
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-[13.5px] text-slate-600 dark:text-slate-300">{children}</p>
    </Card>
  )
}
