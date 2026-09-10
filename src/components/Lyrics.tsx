import { useEffect, useMemo, useRef, useState } from 'react'
import { revealExpanded } from '@unisim/sdk'
import SingingMic from './SingingMic'
import { activeLine } from '../lib/lyrics'
import { takeLyricsReveal } from '../lib/lyricsReveal'
import { hasNativeImporter, pickTextWithNativePicker } from '../lib/nativeImport'
import { micPhase, nextSungLine } from '../lib/singing'
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
// ⚠️ Closed by default on every visit to Now Playing, and opened from its
// "Show lyrics" button — see `shownFor` in `stores/lyricsStore.ts`.

export default function Lyrics() {
  const track = usePlayerStore(currentTrack)
  const shownFor = useLyricsStore((s) => s.shownFor)
  // Open for this VISIT to Now Playing — see `shownFor`.
  const show = !!track && shownFor !== null
  const load = useLyricsStore((s) => s.load)

  // ⚠️ Nothing is read, and nothing is asked, until the panel is open. The
  // effect is the gate: a closed panel does no file read and — much more
  // importantly — sends no request anywhere.
  useEffect(() => {
    if (show && track) load(track)
  }, [show, track, load])

  // Opened with "Show lyrics": scroll down until the WHOLE box is on screen
  // (James, 2026-09-10) — `lib/lyricsReveal.ts` for why only then.
  //
  // ⚠️ TWICE, AND THE SECOND ONE IS THE ONE THAT MATTERS. The panel opens as a
  // one-line "Looking…" and grows to its full height only when the words
  // arrive — a file read, or lrclib, which can take seconds. One reveal at the
  // moment of opening scrolled to the small box and was over long before the
  // big one existed, leaving most of it below the fold. So it reveals on
  // opening, and again whenever the lookup's status moves, until the lookup is
  // done. The SDK still stands down the instant the person scrolls themselves.
  const section = useRef<HTMLElement>(null)
  const status = useLyricsStore((s) => s.status)
  const revealing = useRef(false)
  useEffect(() => {
    if (!show || !section.current) return
    if (takeLyricsReveal()) revealing.current = true
    if (!revealing.current) return
    revealExpanded(section.current, null, { settleMs: 1200 })
    if (status !== 'idle' && status !== 'loading') revealing.current = false
  }, [show, status])

  if (!show || !track) return null
  return (
    <section ref={section} className="mt-10">
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
      {sheet.source === 'file' ? 'From this file’s own tags' : sheet.source === 'upload' ? 'From your lyrics file' : 'From lrclib.net'}
      {sheet.synced ? ' · following along' : ''}
    </p>
  )
}

function Body() {
  const status = useLyricsStore((s) => s.status)
  const sheet = useLyricsStore((s) => s.sheet)
  const message = useLyricsStore((s) => s.message)
  const trackId = useLyricsStore((s) => s.trackId)

  if (status === 'loading') return <Note>Looking…</Note>
  // Keyed by track, so every song's sheet starts LOCKED and following — the
  // default James asked for — rather than inheriting the last song's unlock.
  if (status === 'ready' && sheet) return sheet.synced ? <Synced key={trackId ?? ''} /> : <Plain />
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
 * ⚠️ Scrolled by setting the panel's OWN scroll position rather than by
 * `scrollIntoView`. The latter walks up to the nearest scrollable ancestor and
 * then keeps going — so on a short window it scrolls the PAGE as well, which
 * drags the deck out of view every few seconds while somebody is watching it.
 *
 * ⚠️ AND THE PANEL IS `relative`, WHICH IS WHAT MAKES THE CENTRING TRUE. A
 * line's `offsetTop` is measured from its offset parent; without `relative`
 * here that parent was an ancestor further up the page, so every target was
 * off by however far down the page the panel sat — reported as "the autoscroll
 * doesn't match up to showing the lyrics in that view" (James, 2026-09-10).
 * The half-height padding at each end is what lets the FIRST and LAST lines be
 * centred too, instead of pinned to an edge.
 *
 * ⚠️ LOCKED BY DEFAULT (James, same day). Locked, the current line sits at the
 * middle and the panel cannot be scrolled by hand — a swipe over it scrolls the
 * page instead, which is what a thumb on a phone wants. Unlocked, it scrolls
 * freely and stops following. Locking again goes straight back to the line
 * being sung.
 */
function Synced() {
  const sheet = useLyricsStore((s) => s.sheet)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const playing = usePlayerStore((s) => s.playing)
  const seekTo = usePlayerStore((s) => s.seekTo)
  const reduced = usePrefersReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const [locked, setLocked] = useState(true)
  const lines = useMemo(() => sheet?.lines ?? [], [sheet])
  const active = activeLine(lines, currentSec)
  // The next thing to SING, in black but not bold, so it can be read before it
  // arrives. During the intro that is the first line.
  const next = nextSungLine(lines, active)
  const phase = micPhase(lines, active, currentSec, playing)

  useEffect(() => {
    if (!locked) return
    const container = box.current
    // Before the first line the FIRST line waits at the centre, rather than the
    // top of an empty panel.
    const line = rows.current[Math.max(0, active)]
    if (!container || !line) return
    const target = line.offsetTop - (container.clientHeight - line.offsetHeight) / 2
    container.scrollTo({ top: Math.max(0, target), behavior: reduced ? 'auto' : 'smooth' })
  }, [active, locked, reduced])

  return (
    <div className="rounded-lg border border-slate-200 bg-white/40 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <SingingMic phase={phase} reduced={reduced} />
        <button
          type="button"
          onClick={() => setLocked((was) => !was)}
          aria-pressed={locked}
          title={locked ? 'Following the song — unlock to scroll the lyrics yourself' : 'Scrolling freely — lock to follow the song again'}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
            locked
              ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300'
          }`}
        >
          <LockGlyph locked={locked} />
          {locked ? 'Following' : 'Free scroll'}
        </button>
      </div>
      <div
        ref={box}
        className={`relative h-[42vh] px-4 ${locked ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ paddingTop: 'calc(21vh - 1.25rem)', paddingBottom: 'calc(21vh - 1.25rem)' }}
      >
        {lines.map((line, i) => (
          <button
            key={`${line.timeSec}-${i}`}
            ref={(el) => {
              rows.current[i] = el
            }}
            type="button"
            // A timed line knows where it is in the track, so it may as well be a
            // way of getting there. Free, and it is what anybody tries once they
            // realise the sheet is following the music.
            onClick={() => line.timeSec !== null && seekTo(line.timeSec)}
            className={`block w-full py-1.5 text-left text-[15px] leading-relaxed text-balance transition-colors ${
              i === active
                ? 'font-bold text-slate-900 dark:text-slate-50'
                : i === next
                  ? 'font-normal text-slate-900 dark:text-slate-100'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            {/* An empty timed line is an instrumental gap, and it has to keep its
                height or the highlight jumps a verse ahead during the solo. */}
            {line.text || '\u00a0'}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A padlock, shut or open. */
function LockGlyph({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="9" width="12" height="8.5" rx="2" fill="currentColor" stroke="none" />
      <path d={locked ? 'M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9' : 'M6.5 9V6.5a3.5 3.5 0 0 1 6.6-1.6'} strokeLinecap="round" />
    </svg>
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
    return (
      <div className="rounded-lg border border-slate-200 px-4 py-5 dark:border-slate-800">
        <p className="text-[13.5px] text-slate-600 dark:text-slate-300">
          No lyrics in this file, and lrclib.net doesn’t have this one either.
        </p>
        <AddLyricsFile />
      </div>
    )
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
      <AddLyricsFile />
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
      <AddLyricsFile />
    </div>
  )
}

/**
 * "Add a lyrics file" — for when none could be found, or finding them failed
 * (James, 2026-09-10: "if there's an error finding lyrics we should give the
 * user a choice to upload a lyrics file from their device").
 *
 * An `.lrc` follows along with the song like any timed sheet; plain text shows
 * as the words. Kept for this track from then on, ahead of the file's own tags
 * and lrclib (`adoptLyrics`). On iOS it is the native text picker — the web
 * input's first menu there offers the camera — and an `<input>` everywhere else.
 */
function AddLyricsFile() {
  const track = usePlayerStore(currentTrack)
  const adopt = useLyricsStore((s) => s.adoptLyrics)
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const take = async (text: string) => {
    if (!track) return
    const ok = await adopt(track, text)
    setProblem(ok ? null : 'That doesn’t look like lyrics. A plain text file or an .lrc file is what’s needed.')
  }
  const pick = async () => {
    if (!hasNativeImporter()) {
      input.current?.click()
      return
    }
    try {
      const file = await pickTextWithNativePicker()
      if (file) await take(file.text)
    } catch {
      setProblem('That file could not be read as text.')
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
        Got the words yourself? A timed .lrc file follows along with the song; plain text
        shows as the words.
      </p>
      <button
        type="button"
        onClick={() => void pick()}
        className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-600 dark:text-slate-200 dark:hover:text-orange-400"
      >
        Add a lyrics file
      </button>
      <input
        ref={input}
        type="file"
        accept=".lrc,.txt,text/plain"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) await take(await file.text())
        }}
      />
      {problem && <p className="mt-2 text-[12.5px] text-red-700 dark:text-red-300">{problem}</p>}
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
