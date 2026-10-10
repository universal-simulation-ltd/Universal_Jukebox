import { useEffect, useRef, useState } from 'react'
import { navigate } from '../lib/route'
import { ModeButton } from './ModeButton'
import { scrollBelowBar } from '../lib/scrollBelowBar'
import { scrollToTop } from '../lib/scrollTop'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import type { WikiPage } from '../lib/aboutTrack'
import { useAboutStore } from '../stores/aboutStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useT } from '../i18n'

// "About this track": what Wikipedia says about the song on the deck and about
// whoever is singing it (James, 2026-09-13). The asking is `lib/aboutTrack.ts`;
// when it may ask is `stores/aboutStore.ts`.
//
// ⚠️ Nothing is asked until the panel is OPEN, and nothing at all while the
// lookup is off — the effect below is the gate, exactly as for the lyrics.

export default function AboutTrack() {
  const t = useT()
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
          {t('about.track_heading')}
        </h2>
        {status === 'ready' && <p className="text-[12px] text-slate-400 dark:text-slate-500">{t('about.from_wikipedia')}</p>}
      </div>
      <Body />
    </section>
  )
}

/**
 * The way in: an "i" ("About") in the row of round buttons under the records
 * waiting to go on, beside shuffle, the repeats and Add to shelf (James,
 * 2026-09-13: "move (i) and (add to shelf) to the line of shuffle, repeat etc
 * to make ui cleaner up top"). It sat under the song's title before that.
 *
 * Opening it scrolls the page so the "i" sits at the top of the screen, under
 * the navbar, with the panel filling what is below ("When clicked scroll down
 * so that the 'i' is at the top of the screen (below navbar)") — and once more
 * when the answer lands, because until then the page may be too short to
 * scroll that far. The lyrics' "Show lyrics" does the same (`scrollBelowBar`).
 *
 * The scroll goes to THIS button's ref, not an `id`: it was once drawn twice
 * (the song's details are, one copy hidden by CSS), and a ref always finds the
 * copy that was tapped.
 */
export function AboutToggle() {
  const t = useT()
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

  return (
    <ModeButton
      ref={button}
      label={t('about.toggle_label')}
      on={open}
      ariaLabel={open ? t('about.toggle_hide') : t('about.track_heading')}
      onClick={(e) => {
        // The ceremony is skipped by any click on the page (App.tsx); a button
        // on the deck's screen is not that click.
        e.stopPropagation()
        if (open) {
          setOpen(false)
          // Back up to the record, as "Hide lyrics" does (James, 2026-09-13:
          // "when closing 'i' scroll back to top").
          scrollToTop()
          return
        }
        revealing.current = true
        setOpen(true)
      }}
    >
      <InfoGlyph />
    </ModeButton>
  )
}

function Body() {
  const t = useT()
  const track = usePlayerStore(currentTrack)
  const status = useAboutStore((s) => s.status)
  const song = useAboutStore((s) => s.song)
  const artist = useAboutStore((s) => s.artist)
  const message = useAboutStore((s) => s.message)
  const trackId = useAboutStore((s) => s.trackId)
  const reload = useAboutStore((s) => s.reload)
  if (!track) return null

  if (status === 'idle' || status === 'loading') return <Note>{t('about.looking')}</Note>
  if (status === 'off') return <Offer />
  if (status === 'untagged') {
    return <Note>{t('about.untagged')}</Note>
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
          {t('common.try_again')}
        </button>
      </Card>
    )
  }
  if (status === 'none' || (!song && !artist)) {
    const name = track.artist ?? track.albumArtist
    return <Note>{name !== undefined ? t('about.none_artist', { artist: name }) : t('about.none_unnamed')}</Note>
  }
  return (
    <div className="space-y-4">
      {/* No article about the song: nothing is said about it, the artist is
          simply shown (James, 2026-09-13: "just hide that part don't say it
          doesn't have one"). */}
      {song && <Article key={`${trackId}:song`} label={t('about.song_label')} page={song} />}
      {artist && <Article key={`${trackId}:artist`} label={t('about.artist_label')} page={artist} brief />}
      {/* Wikipedia's text is CC BY-SA: reusing it means saying where it came
          from and under what licence, next to it. Each article links above. */}
      <p className="text-[11.5px] leading-relaxed text-slate-400 dark:text-slate-500">
        {t.rich('about.licence', {
          // The licence's name, which is the same in every language.
          licence: (
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-400"
            >
              CC BY-SA 4.0
            </a>
          ),
        })}
      </p>
    </div>
  )
}

/**
 * One article's opening — two paragraphs for the song, one for the artist,
 * and "More" for the rest of its opening section.
 */
function Article({ label, page, brief = false }: { label: string; page: WikiPage; brief?: boolean }) {
  const t = useT()
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
            {all ? t('about.article_less') : t('about.article_more')}
          </button>
        )}
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          {t('about.read_on_wikipedia')}
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
  const t = useT()
  const track = usePlayerStore(currentTrack)
  const setSetting = useSettingsStore((s) => s.set)
  const reload = useAboutStore((s) => s.reload)
  return (
    <Card>
      <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
        {t('about.offer_what')}
      </p>
      <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">
        {t('about.offer_sends')}
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
          {t('about.look_up')}
        </button>
        <button
          type="button"
          onClick={() => navigate({ view: 'settings' })}
          className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          {t('about.more_in_settings')}
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

/** A plain "i" — the circle is the button's own. */
export function InfoGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <circle cx="10" cy="5.25" r="1.5" />
      <path d="M8 8.25h3.25v6.5H12.5v1.75h-4.75v-1.75H9V10H8V8.25Z" />
    </svg>
  )
}
