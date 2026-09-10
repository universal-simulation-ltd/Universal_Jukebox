import { useEffect, useState } from 'react'
import { graphAllowed, graphUnavailable } from '../lib/audioGraph'
import { playTransportCue } from '../lib/crackle'
import { DECKS, deckCopy, resolveDeck, sanitiseEras, type DeckEras } from '../lib/decks'
import { clearLyrics, countLyrics } from '../lib/library'
import { goHome } from '../lib/route'
import { canSetElementVolume } from '../lib/volumeSupport'
import { DeckMiniature } from './Deck'
import { useLyricsStore } from '../stores/lyricsStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import {
  CEREMONY_LADDER,
  DECK_SETTINGS,
  MAX_BOOST,
  MAX_FADE_SEC,
  NEEDLE_STEP_MAX,
  NEEDLE_STEP_MIN,
  levelToStep,
  stepToLevel,
  useSettingsStore,
  type CeremonyMode,
  type DeckSetting,
  type HomeTab,
} from '../stores/settingsStore'
import { useThemeStore, type ThemePref } from '../stores/themeStore'

// The settings page.
//
// Built as a list of SECTIONS of ROWS, with the row components at the bottom,
// so adding a setting is a field in `settingsStore` plus one `<Choice>` /
// `<Slider>` / `<Toggle>` here — not a new piece of layout. That is the whole
// reason it looks like this rather than a hand-laid-out form: there will be
// more of these.
//
// Every control writes straight through to the store, which persists on every
// change. There is deliberately no Save button: nothing here is a form, each
// setting takes effect the moment it is changed, and a Save button on
// preferences is a thing to forget to press.

export default function Settings() {
  const s = useSettingsStore()
  const themePref = useThemeStore((t) => t.pref)
  const setTheme = useThemeStore((t) => t.setPref)

  // The boost is the one setting that can be genuinely unavailable: it needs a
  // Web Audio graph, and a browser can refuse us one. Saying so is better than
  // a slider that does nothing.
  const boostBroken = graphUnavailable()
  // Where the engine will not let an app set `element.volume`, a fade is a
  // slider that moves and changes nothing you can hear. The suite's rule for a
  // capability gap is to say so rather than to fail at the moment of use — the
  // boost slider right above already does exactly this.
  // ⚠️ Asked of the ENGINE, not of the platform: iOS was expected to be the case
  // that needed this and measured not to be, so on a current iPhone these
  // sliders stay live. See the header of `lib/volumeSupport.ts`.
  const fadesBroken = !canSetElementVolume()
  const FADE_HINT =
    'This device doesn’t let an app set the playback volume — that belongs to the ' +
    'hardware buttons — so a fade can’t be heard. Tracks change over cleanly instead.'

  // Every string below that would otherwise say "record" at a cassette owner.
  const deck = deckCopy(s.deck)

  // Hoisted out of the `<Ladder>` below so the fold's summary reads the SAME
  // label the handle shows — a second copy of "Every track" is a copy that can
  // drift.
  const ladderCopy: Record<CeremonyMode, { label: string; hint: string }> = {
    always: {
      label: 'Every track',
      hint: `Any play — a track, an album, a search result — goes to the deck and ${deck.verb}, and every track change gets the ${deck.pickup} put back.`,
    },
    album: {
      label: 'When the album changes',
      hint: `Only when a different ${deck.noun} goes on. Tracks within one album blend into each other quietly.`,
    },
    artist: {
      label: 'When the artist changes',
      hint: 'Only when somebody new comes on — a whole discography plays through without interruption.',
    },
    first: {
      label: 'Once per visit',
      hint: 'Only the first time you press play after opening the app.',
    },
    off: {
      label: 'Never',
      hint: 'Music starts immediately, every time. Tracks on one album still run into each other with no gap — that is the crossfade, not the animation.',
    },
  }

  // ⚠️ What each SHUT fold says it is set to. One hand-written line per
  // section, but every value in it comes from the store through the same
  // labels and formatters the controls themselves display — so a fold can never
  // say "1.5s" over a slider reading 2.0s.
  const summaries = {
    library: `Opens on ${labelOf(HOME_OPTIONS, s.homeTab)}`,
    deck: DECKS[s.deck].label,
    start: `${ladderCopy[s.ceremonyMode].label}, ${deck.soundLabel.toLowerCase()} ${
      !s.needleDrop ? 'off' : levelToStep(s.needleDropLevel) === 0 ? 'on' : `at ${formatStep(levelToStep(s.needleDropLevel))}`
    }`,
    sound: sentence([
      boostBroken ? 'no boost on this device' : `boost ${formatBoost(s.volumeBoost).toLowerCase()}`,
      fadesBroken ? 'no fades on this device' : describeFades(s.fadeInSec, s.fadeOutSec),
    ]),
    lyrics: s.lyricsOnline ? 'Your files, then lrclib.net' : 'Your files only',
    appearance: labelOf(THEME_OPTIONS, themePref),
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={goHome}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        Back to your library
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        Settings
      </h1>
      <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
        Everything here is kept on this device only, like the rest of the app.
      </p>

      {/* The six folds, as a stack. Adjacent cards with a small gap
          rather than the old headings-and-panels run: shut, they read as
          a list of what Settings CONTAINS. */}
      <div className="mt-8 space-y-3">
        <Section
          title="Your library"
          note="Where the app takes you, and what it opens on."
          summary={summaries.library}
        >
          <Choice<HomeTab>
            label="Open my library on"
            value={s.homeTab}
            onChange={(v) => s.set('homeTab', v)}
            options={HOME_OPTIONS}
          />
        </Section>

        {/* ⚠️ ABOVE the animation section, not inside it, and that order is the
            argument for the whole feature: what you are playing ON comes before
            how theatrically it starts. It also means the section below is already
            talking about the right machine by the time you read it. */}
        <Section
          title="What you’re playing on"
          note="The deck on Now Playing. It changes the picture and the sound it makes starting up — never the music."
          summary={summaries.deck}
        >
          <Choice<DeckSetting>
            label="Deck"
            value={s.deck}
            onChange={(v) => s.set('deck', v)}
            // ⚠️ `DECK_SETTINGS` rather than `Object.keys(DECKS)`. Both hold the
            // same five values, but only one of them has a defined ORDER — object
            // key order is an implementation detail, and this list has `automatic`
            // deliberately last, after the four real machines.
            options={DECK_SETTINGS.map((value) => ({
              value,
              label: DECKS[value].label,
              hint: DECKS[value].hint,
              // The machine itself, still — the sentence beside it says what
              // it does; this says what it LOOKS like, which is the question.
              picture: <DeckMiniature setting={value} box={64} />,
            }))}
          />
          {/* Automatic only: the years each machine takes over (James,
              2026-09-10: "you can choose some years that correspond"). */}
          {s.deck === 'automatic' && (
            <EraYears eras={s.deckEras} onChange={(eras) => s.set('deckEras', eras)} />
          )}
        </Section>

        <Section title={deck.startTitle} note={deck.startNote} summary={summaries.start}>
          {/* ⚠️ A SLIDER, not the radios this used to be (James asked for one,
              2026-09-09). The five settings are a frequency ladder — every track,
              every record, every artist, once a visit, never — and a ladder is
              what a slider is for: you can see where you are on it and which
              direction is "more". The radios' one advantage was that every
              option's sentence was visible at once; `<Ladder>` keeps that by
              showing the sentence for wherever the handle is. */}
          <Ladder
            label={`Show the ${deck.noun}-changing animation`}
            hint={`Also how often you hear the ${deck.soundLabel.toLowerCase()} — the two are the same event.`}
            value={s.ceremonyMode}
            onChange={(v) => s.set('ceremonyMode', v)}
            copy={ladderCopy}
          />
          <Toggle
            label={deck.soundLabel}
            hint={deck.soundHint}
            checked={s.needleDrop}
            onChange={(v) => s.set('needleDrop', v)}
          />
          {/* ⚠️ `onCommit` plays it. A loudness control you cannot hear while you
              set it is a control you set once, wrongly, and never touch again —
              and this one is for an effect that lasts under a second and happens
              when you are looking somewhere else. Firing on release rather than
              on every input event is what keeps dragging the slider from becoming
              a stack of forty overlapping thunks.

              ⚠️ The slider speaks STEPS (-5…+5) and the store speaks multipliers;
              `stepToLevel` is the only crossing point. See `settingsStore`. */}
          <Slider
            label={`${deck.soundLabel} volume`}
            hint="0 is the level it has always been. Drag it to hear it — it still rides your main volume, so turning the music down turns this down with it."
            value={levelToStep(s.needleDropLevel)}
            min={NEEDLE_STEP_MIN}
            max={NEEDLE_STEP_MAX}
            step={1}
            disabled={!s.needleDrop}
            disabledHint={`Turn the ${deck.soundLabel.toLowerCase()} on to set how loud it is.`}
            format={formatStep}
            onChange={(v) => s.set('needleDropLevel', stepToLevel(v))}
            // ⚠️ Resolved against the album on the deck, so under Automatic the
            // demonstration is the machine currently playing. `playTransportCue` takes a `DeckStyle` and this store
            // holds a `DeckSetting`, so the compiler insists on the crossing.
            onCommit={(v) => {
              const player = usePlayerStore.getState()
              const track = currentTrack(player)
              const album = track ? useLibraryStore.getState().albums.find((a) => a.id === track.albumId) : undefined
              playTransportCue(resolveDeck(s.deck, album ?? track, s.deckEras), player.volume, stepToLevel(v))
            }}
          />
        </Section>

        <Section
          title="Sound"
          note="Applied as the music plays. Nothing here changes your files."
          summary={summaries.sound}
        >
          <Slider
            label="Volume boost"
            hint="Extra gain on top of the volume slider, for quietly-mastered albums. Above about 2× a loud record will start to distort — that is the recording clipping, not a fault."
            value={s.volumeBoost}
            min={1}
            max={MAX_BOOST}
            step={0.1}
            disabled={boostBroken}
            disabledHint={
              graphAllowed()
                ? 'This browser wouldn’t give the app the audio graph a boost needs. Everything else still works.'
                : 'Not in the iPhone app — the boost would stop your music playing when the app is in the background.'
            }
            format={formatBoost}
            onChange={(v) => s.set('volumeBoost', v)}
          />
          <Slider
            label="Fade in"
            hint="Each track rises from silence when it starts."
            value={s.fadeInSec}
            min={0}
            max={MAX_FADE_SEC}
            step={0.5}
            disabled={fadesBroken}
            disabledHint={FADE_HINT}
            format={formatFade}
            onChange={(v) => s.set('fadeInSec', v)}
          />
          <Slider
            label="Fade out"
            hint="Each track falls away before it ends — including the last one of an album. Two tracks of the SAME record already blend into each other; this is for the ends of things."
            value={s.fadeOutSec}
            min={0}
            max={MAX_FADE_SEC}
            step={0.5}
            disabled={fadesBroken}
            disabledHint={FADE_HINT}
            format={formatFade}
            onChange={(v) => s.set('fadeOutSec', v)}
          />
        </Section>

        <Section
          title="Lyrics"
          note="Jukebox reads the lyrics your files were tagged with. Most files have none."
          summary={summaries.lyrics}
        >
          <Toggle
            label="Look up missing lyrics online"
            hint="When a track has no lyrics of its own, ask lrclib.net for them. This sends that track’s artist, title, album and length — nothing else, and nothing at all while this is off. Answers are kept on this device so each track is only ever asked about once."
            checked={s.lyricsOnline}
            onChange={(v) => s.set('lyricsOnline', v)}
          />
          <DownloadedLyrics />
        </Section>

        <Section title="Appearance" summary={summaries.appearance}>
          <Choice<ThemePref>
            label="Theme"
            value={themePref}
            onChange={setTheme}
            options={THEME_OPTIONS}
          />
        </Section>
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <button
          type="button"
          onClick={() => s.reset()}
          className="text-[13px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          Reset these settings
        </button>
        <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          Puts everything on this page back to its default. Your library and your theme are left alone.
        </p>
      </div>
    </div>
  )
}

/**
 * What has been downloaded, and the way to undo it.
 *
 * ⚠️ The count is the honest part. "Answers are kept on this device" above is a
 * claim, and a claim about stored data that the person cannot check or reverse
 * is worth very little — so the number of them is on screen and there is one
 * button that removes the lot. It counts the "nobody has this one" answers too,
 * because those are stored as well and pretending otherwise would make the
 * number quietly wrong.
 */
function DownloadedLyrics() {
  const [count, setCount] = useState<number | null>(null)
  const forget = useLyricsStore((l) => l.forget)

  useEffect(() => {
    let live = true
    void countLyrics().then((n) => { if (live) setCount(n) })
    return () => { live = false }
  }, [])

  if (count === null || count === 0) return null
  return (
    <div className="px-1 py-3">
      <p className="text-[13px] text-slate-600 dark:text-slate-300">
        {count === 1 ? '1 track has been looked up' : `${count} tracks have been looked up`} on
        lrclib.net.
      </p>
      <button
        type="button"
        onClick={() => {
          void clearLyrics().then(() => {
            setCount(0)
            // The panel may be showing one of the sheets that just went.
            forget()
          })
        }}
        className="mt-1.5 text-[12.5px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
      >
        Forget them
      </button>
    </div>
  )
}

// ── Labels and formats, shared by the controls and the fold summaries ────────

const HOME_OPTIONS: Option<HomeTab>[] = [
  { value: 'albums', label: 'Albums' },
  { value: 'artists', label: 'Artists' },
  { value: 'tracks', label: 'Tracks' },
]

const THEME_OPTIONS: Option<ThemePref>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match my device' },
]

function labelOf<T extends string>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? String(value)
}

/** The ±5 needle-drop step, as its slider shows it. */
function formatStep(v: number): string {
  return v === 0 ? '0' : v > 0 ? `+${v}` : String(v)
}

/** The boost multiplier, as its slider shows it. */
function formatBoost(v: number): string {
  return v <= 1.001 ? 'Off' : `${v.toFixed(1)}×`
}

/** A fade length, as its slider shows it. */
function formatFade(v: number): string {
  return v === 0 ? 'Off' : `${v.toFixed(1)}s`
}

/** "no fades", "1.5s fades", or the two named separately when they differ. */
function describeFades(fadeIn: number, fadeOut: number): string {
  if (fadeIn === 0 && fadeOut === 0) return 'no fades'
  if (fadeIn === fadeOut) return `${formatFade(fadeIn)} fades`
  return [
    fadeIn > 0 ? `${formatFade(fadeIn)} fade in` : null,
    fadeOut > 0 ? `${formatFade(fadeOut)} fade out` : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/** Comma-joined, with the first letter raised: "Boost off, no fades". */
function sentence(parts: string[]): string {
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ── The row kit ──────────────────────────────────────────────────────────────

/**
 * One category of settings, shut until you open it.
 *
 * ⚠️ Every section starts CLOSED (James, 2026-09-09). Open, the page was six
 * screens of controls to scroll past to reach the one you came for; shut, the
 * whole of Settings is a list of six headings you can see at once. The titles
 * and their notes stay OUTSIDE the fold precisely so that closing them costs
 * nothing to scan — what folds away is the controls, never the sentence telling
 * you what is in there.
 *
 * ⚠️ A real `<details>`, not a div with a click handler. That is the keyboard,
 * the screen reader's "collapsed"/"expanded", and browser find-in-page reaching
 * inside a shut fold, all for free — and it is also what the SDK's suite-wide
 * reveal-on-expand listens for, so opening the last section scrolls it into
 * view without this file knowing anything about it.
 *
 * ⚠️ `summary` is what the section is SET TO, shown on the title line while it
 * is shut — "Sound: Boost off, 1.5s fades" — so the list of six headings is also
 * a list of six answers, and nobody opens a fold just to find out it says what
 * they thought. It hides once the fold is open, where the controls say it
 * themselves. What it does NOT do is remember which folds were open: every
 * section still starts shut on every visit, and that was decided, not missed.
 */
function Section({
  title, note, summary, children,
}: { title: string; note?: string; summary?: string; children: React.ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* `list-none` plus the webkit marker rule: without BOTH, one engine keeps
          its own triangle and the row ends up with two disclosure arrows. */}
      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-600 dark:hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {title}
            </span>
            {summary && (
              <span className="text-[13px] font-medium text-slate-800 group-open:hidden dark:text-slate-200">
                {/* Read as "Sound: boost off…", not as one run-on phrase. */}
                <span className="sr-only">: </span>
                {summary}
              </span>
            )}
          </span>
          {note && (
            <span className="mt-1 block text-[13px] text-slate-500 dark:text-slate-400">{note}</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.58l3.3-3.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.42Z" />
        </svg>
      </summary>
      <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {children}
      </div>
    </details>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-4">{children}</div>
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <>
      <span className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">{text}</span>
      {hint && (
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </>
  )
}

interface Option<T> {
  value: T
  label: string
  hint?: string
  /**
   * A picture of the option, drawn beside its radio — the deck chooser's
   * miniatures. Decoration: it sits inside the `<label>`, so clicking it picks
   * the option, but it is `aria-hidden` and the radio and its text remain the
   * control a keyboard or a screen reader uses.
   */
  picture?: React.ReactNode
}

/**
 * A set of mutually exclusive choices, as real radios.
 *
 * ⚠️ Radios rather than a `<select>` because each option carries a sentence
 * explaining what it does, and a dropdown can only show one of them at a time —
 * which for "how often should this animation appear" is precisely the
 * information needed to choose.
 */
function Choice<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: Option<T>[]; onChange(value: T): void }) {
  const name = `choice-${label.replace(/\W+/g, '-')}`
  return (
    <Row>
      <fieldset>
        <legend className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</legend>
        <div className="mt-2.5 space-y-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-2.5 ${option.picture ? 'items-center' : 'items-start'}`}
            >
              <input
                type="radio"
                name={name}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className={`h-3.5 w-3.5 shrink-0 accent-orange-600 ${option.picture ? '' : 'mt-0.5'}`}
              />
              {option.picture && (
                // A fixed box, so five machines of five different shapes line
                // their text up in one column.
                <span
                  aria-hidden
                  className={`flex h-[72px] w-[80px] shrink-0 items-center justify-center transition-opacity ${
                    value === option.value ? '' : 'opacity-75'
                  }`}
                >
                  {option.picture}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-[13.5px] text-slate-800 dark:text-slate-200">{option.label}</span>
                {option.hint && (
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {option.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Row>
  )
}

/**
 * A slider along an ordered set of named settings.
 *
 * ⚠️ It is a real `<input type="range">` over the ladder's INDICES, not a row
 * of styled buttons pretending to be a slider. That buys the keyboard and the
 * screen reader for free — arrow keys step, Home and End jump, and
 * `aria-valuetext` reads the option's name rather than "3 of 5", which is the
 * one thing a numeric slider gets wrong for a set of named choices.
 *
 * ⚠️ The order comes from `CEREMONY_LADDER` and is not repeated here. A second
 * copy of the order is how a slider ends up running backwards after somebody
 * adds a mode in the middle.
 */
function Ladder({
  label, hint, value, copy, onChange,
}: {
  label: string
  hint?: string
  value: CeremonyMode
  copy: Record<CeremonyMode, { label: string; hint: string }>
  onChange(value: CeremonyMode): void
}) {
  const index = Math.max(0, CEREMONY_LADDER.indexOf(value))
  const here = copy[CEREMONY_LADDER[index]]
  return (
    <Row>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
        <span className="shrink-0 text-[13px] font-medium text-orange-700 dark:text-orange-400">
          {here.label}
        </span>
      </div>
      {hint && (
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      <input
        type="range"
        min={0}
        max={CEREMONY_LADDER.length - 1}
        step={1}
        value={index}
        aria-label={label}
        aria-valuetext={here.label}
        onChange={(e) => onChange(CEREMONY_LADDER[Number(e.target.value)])}
        className="jb-scrub mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700"
      />
      {/* The two ends, named. Without them a slider with no scale is a control
          you have to drag to find out what it does — and the whole reason this
          replaced radios was that the ORDER means something. */}
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>{copy[CEREMONY_LADDER[0]].label}</span>
        <span>{copy[CEREMONY_LADDER[CEREMONY_LADDER.length - 1]].label}</span>
      </div>
      {/* ⚠️ A fixed height, because the sentence under the handle changes as you
          drag and the rows below must not jump about while you are dragging. */}
      <p className="mt-2 min-h-[2.6rem] text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
        {here.hint}
      </p>
    </Row>
  )
}

function Toggle({
  label, hint, checked, onChange, disabled = false, disabledHint,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange(value: boolean): void
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <Row>
      <label className={`flex items-start gap-3 ${disabled ? 'cursor-default opacity-55' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked && !disabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
        />
        <span className="min-w-0 flex-1">
          <Label text={label} hint={disabled ? (disabledHint ?? hint) : hint} />
        </span>
      </label>
    </Row>
  )
}

function Slider({
  label, hint, value, min, max, step, format, onChange, onCommit, disabled = false, disabledHint,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  format(value: number): string
  onChange(value: number): void
  /** Fired when the drag ENDS, for a setting worth demonstrating. */
  onCommit?(value: number): void
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <Row>
      <div className={disabled ? 'opacity-55' : undefined}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
          <span className="shrink-0 text-[13px] tabular-nums text-slate-600 dark:text-slate-300">
            {disabled ? '—' : format(value)}
          </span>
        </div>
        {(disabled ? (disabledHint ?? hint) : hint) && (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {disabled ? (disabledHint ?? hint) : hint}
          </p>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          // Both, because a slider is dragged with a pointer and nudged with the
          // arrow keys, and only handling the first leaves the keyboard user
          // with a control that never demonstrates itself.
          onPointerUp={(e) => onCommit?.(Number(e.currentTarget.value))}
          onKeyUp={(e) => onCommit?.(Number(e.currentTarget.value))}
          className="jb-scrub mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 disabled:cursor-default dark:bg-slate-700"
        />
      </div>
    </Row>
  )
}

/**
 * The years each machine takes over, for Automatic.
 *
 * ⚠️ Committed on BLUR (or Enter), not on every keystroke. The years are kept in
 * order by `sanitiseEras`, and typing "19" on the way to "1991" would otherwise
 * be clamped and re-ordered under the cursor — the field would fight the typing.
 */
function EraYears({ eras, onChange }: { eras: DeckEras; onChange(eras: DeckEras): void }) {
  const rows: { key: keyof DeckEras; label: string }[] = [
    { key: 'vinyl', label: 'Vinyl from' },
    { key: 'cassette', label: 'Cassette from' },
    { key: 'cd', label: 'CD from' },
    { key: 'pocket', label: 'Pocket player from' },
  ]
  return (
    <div className="mt-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
      <p className="text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
        Albums from before {eras.vinyl} go on the jukebox. An album with no year goes on vinyl.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((row) => (
          <label key={row.key} className="flex flex-col gap-1 text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
            {row.label}
            <input
              key={`${row.key}-${eras[row.key]}`}
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={eras[row.key]}
              onBlur={(e) => {
                const year = Number(e.currentTarget.value)
                if (Number.isFinite(year) && year !== eras[row.key]) onChange(sanitiseEras({ ...eras, [row.key]: year }))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] tabular-nums text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
