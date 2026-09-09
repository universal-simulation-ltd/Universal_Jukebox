import { useEffect, useRef } from 'react'
import { activeLine } from '../lib/lyrics'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useLyricsStore } from '../stores/lyricsStore'
import { useSettingsStore } from '../stores/settingsStore'
import { navigate } from '../lib/route'

// The words, under the deck.
//
// ⚠️ Every "nothing here" state names itself in a sentence. Refusing well is a
// suite convention and this panel is mostly refusals: most files carry no
// lyrics at all, so the empty state is the state a first-time user meets, and
// "Lyrics" over a blank box reads as an app that is broken rather than as a
// file that was never tagged.
//
// ⚠️ The panel is opened from Now Playing and remembers itself across tracks —
// see `showLyrics` in `settingsStore`.

export default function Lyrics() {
  const track = usePlayerStore(currentTrack)
  const show = useSettingsStore((s) => s.showLyrics)
  const load = useLyricsStore((s) => s.load)

  // ⚠️ Nothing is read, and nothing is asked, until the panel is open. The
  // effect is the gate: a closed panel does no file read and — much more
  // importantly — sends no request anywhere.
  useEffect(() => {
    if (show && track) load(track)
  }, [show, track, load])

  if (!show || !track) return null
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Lyrics
        </h2>
        <Provenance />
      </div>
      <Body />
    </section>
  )
}

/** Where these words came from, said plainly, whenever there are any. */
function Provenance() {
  const status = useLyricsStore((s) => s.status)
  const sheet = useLyricsStore((s) => s.sheet)
  if (status !== 'ready' || !sheet) return null
  return (
    <p className="text-[12px] text-slate-400 dark:text-slate-500">
      {sheet.source === 'file' ? 'From this file’s own tags' : 'From lrclib.net'}
      {sheet.synced ? ' · following along' : ''}
    </p>
  )
}

function Body() {
  const status = useLyricsStore((s) => s.status)
  const sheet = useLyricsStore((s) => s.sheet)
  const message = useLyricsStore((s) => s.message)

  if (status === 'loading') return <Note>Looking…</Note>
  if (status === 'ready' && sheet) return sheet.synced ? <Synced /> : <Plain />
  if (status === 'instrumental') {
    return <Note>lrclib.net has this one down as an instrumental — there are no words to show.</Note>
  }
  if (status === 'untagged') {
    return (
      <Note>
        This track has no artist or title in its tags, so there is nothing to look it up by. Naming
        it in the tidy-up would fix that.
      </Note>
    )
  }
  if (status === 'error') return <Retry message={message ?? 'That didn’t work.'} />
  if (status === 'none') return <Nothing />
  return null
}

/**
 * A timed sheet, following the music.
 *
 * ⚠️ Scrolled by setting `scrollTop` on the panel itself rather than by
 * `scrollIntoView`. The latter walks up to the nearest scrollable ancestor and
 * then keeps going — so on a short window it scrolls the PAGE as well, which
 * drags the deck out of view every few seconds while somebody is watching it.
 */
function Synced() {
  const sheet = useLyricsStore((s) => s.sheet)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const seekTo = usePlayerStore((s) => s.seekTo)
  const reduced = usePrefersReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const lines = sheet?.lines ?? []
  const active = activeLine(lines, currentSec)

  useEffect(() => {
    const container = box.current
    if (!container || active < 0) return
    const line = container.children[active] as HTMLElement | undefined
    if (!line) return
    const target = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2
    container.scrollTo({ top: Math.max(0, target), behavior: reduced ? 'auto' : 'smooth' })
  }, [active, reduced])

  return (
    <div
      ref={box}
      className="max-h-[42vh] overflow-y-auto rounded-lg border border-slate-200 bg-white/40 px-4 py-6 dark:border-slate-800 dark:bg-slate-900/30"
    >
      {lines.map((line, i) => (
        <button
          key={`${line.timeSec}-${i}`}
          type="button"
          // A timed line knows where it is in the track, so it may as well be a
          // way of getting there. Free, and it is what anybody tries once they
          // realise the sheet is following the music.
          onClick={() => line.timeSec !== null && seekTo(line.timeSec)}
          className={`block w-full py-1.5 text-left text-[15px] leading-relaxed text-balance transition-colors ${
            i === active
              ? 'font-semibold text-slate-900 dark:text-slate-50'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          {/* An empty timed line is an instrumental gap, and it has to keep its
              height or the highlight jumps a verse ahead during the solo. */}
          {line.text || ' '}
        </button>
      ))}
    </div>
  )
}

/** An untimed sheet: the words, and nothing pretending to follow them. */
function Plain() {
  const sheet = useLyricsStore((s) => s.sheet)
  return (
    <div className="max-h-[42vh] overflow-y-auto rounded-lg border border-slate-200 bg-white/40 px-4 py-6 dark:border-slate-800 dark:bg-slate-900/30">
      {(sheet?.lines ?? []).map((line, i) => (
        <p key={i} className="min-h-[1.4em] text-[15px] leading-relaxed text-balance text-slate-700 dark:text-slate-200">
          {line.text || ' '}
        </p>
      ))}
    </div>
  )
}

/**
 * No words — which is the ordinary case, and the one that has to be handled
 * best.
 *
 * ⚠️ What it offers depends on whether the online lookup is on, and the
 * difference matters: with it off, this is not a dead end but a choice nobody
 * has made yet, and the place to say so is here rather than only on a Settings
 * page the person has never opened.
 */
function Nothing() {
  const online = useSettingsStore((s) => s.lyricsOnline)
  const setSetting = useSettingsStore((s) => s.set)
  const track = usePlayerStore(currentTrack)
  const reload = useLyricsStore((s) => s.reload)

  if (online) {
    return <Note>No lyrics in this file, and lrclib.net doesn’t have this one either.</Note>
  }
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-5 dark:border-slate-800">
      <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
        There are no lyrics saved in this file.
      </p>
      <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">
        Jukebox can look them up on lrclib.net instead. That sends the track’s artist, title, album
        and length — nothing else, and nothing at all unless you turn it on.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setSetting('lyricsOnline', true)
            if (track) reload(track)
          }}
          className="rounded-md bg-orange-700 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-orange-800"
        >
          Look them up online
        </button>
        <button
          type="button"
          onClick={() => navigate({ view: 'settings' })}
          className="text-[12.5px] text-slate-500 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          More about this in Settings
        </button>
      </div>
    </div>
  )
}

function Retry({ message }: { message: string }) {
  const track = usePlayerStore(currentTrack)
  const reload = useLyricsStore((s) => s.reload)
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-5 dark:border-slate-800">
      <p className="text-[13.5px] text-slate-600 dark:text-slate-300">{message}</p>
      <button
        type="button"
        onClick={() => track && reload(track)}
        className="mt-3 text-[12.5px] text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
      >
        Try again
      </button>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-slate-200 px-4 py-5 text-[13.5px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
      {children}
    </p>
  )
}
