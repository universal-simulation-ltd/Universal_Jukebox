import { graphUnavailable } from '../lib/audioGraph'
import { goHome } from '../lib/route'
import {
  MAX_BOOST,
  MAX_FADE_SEC,
  useSettingsStore,
  type CeremonyMode,
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

      <Section
        title="Your library"
        note="Where the app takes you, and what it opens on."
      >
        <Choice<HomeTab>
          label="Open my library on"
          value={s.homeTab}
          onChange={(v) => s.set('homeTab', v)}
          options={[
            { value: 'albums', label: 'Albums' },
            { value: 'artists', label: 'Artists' },
            { value: 'tracks', label: 'Tracks' },
          ]}
        />
      </Section>

      <Section
        title="Putting a record on"
        note="The turntable animation, the countdown, and the sound of the needle landing."
      >
        <Choice<CeremonyMode>
          label="Show the record-changing animation"
          value={s.ceremonyMode}
          onChange={(v) => s.set('ceremonyMode', v)}
          options={[
            { value: 'always', label: 'Every time I press play', hint: 'Any play — a track, an album, a search result — goes to the deck and cues the arm.' },
            { value: 'album', label: 'Only on a new album', hint: 'Just when you put a different record on, and never twice for the same one.' },
            { value: 'first', label: 'Once per visit', hint: 'Only the first time you press play after opening the app.' },
            { value: 'off', label: 'Never', hint: 'Music starts immediately, every time — and tracks run into each other with no pause for the needle.' },
          ]}
        />
        <Toggle
          label="Needle-drop sound"
          hint="A low thunk and a second of surface noise as the arm lands — putting a record on, changing track, and previewing one. Rides your volume, and never plays on its own."
          checked={s.needleDrop}
          onChange={(v) => s.set('needleDrop', v)}
        />
      </Section>

      <Section
        title="Sound"
        note="Applied as the music plays. Nothing here changes your files."
      >
        <Slider
          label="Volume boost"
          hint="Extra gain on top of the volume slider, for quietly-mastered albums. Above about 2× a loud record will start to distort — that is the recording clipping, not a fault."
          value={s.volumeBoost}
          min={1}
          max={MAX_BOOST}
          step={0.1}
          disabled={boostBroken}
          disabledHint="This browser wouldn’t give the app the audio graph a boost needs. Everything else still works."
          format={(v) => (v <= 1.001 ? 'Off' : `${v.toFixed(1)}×`)}
          onChange={(v) => s.set('volumeBoost', v)}
        />
        <Slider
          label="Fade in"
          hint="Each track rises from silence when it starts."
          value={s.fadeInSec}
          min={0}
          max={MAX_FADE_SEC}
          step={0.5}
          format={(v) => (v === 0 ? 'Off' : `${v.toFixed(1)}s`)}
          onChange={(v) => s.set('fadeInSec', v)}
        />
        <Slider
          label="Fade out"
          hint="Each track falls away before it ends. This is a fade, not a crossfade — the next track still starts when this one finishes."
          value={s.fadeOutSec}
          min={0}
          max={MAX_FADE_SEC}
          step={0.5}
          format={(v) => (v === 0 ? 'Off' : `${v.toFixed(1)}s`)}
          onChange={(v) => s.set('fadeOutSec', v)}
        />
      </Section>

      <Section title="Appearance">
        <Choice<ThemePref>
          label="Theme"
          value={themePref}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'Match my device' },
          ]}
        />
      </Section>

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

// ── The row kit ──────────────────────────────────────────────────────────────

function Section({
  title, note, children,
}: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h2>
      {note && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{note}</p>}
      <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </section>
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
            <label key={option.value} className="flex cursor-pointer items-start gap-2.5">
              <input
                type="radio"
                name={name}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-600"
              />
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
  label, hint, value, min, max, step, format, onChange, disabled = false, disabledHint,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  format(value: number): string
  onChange(value: number): void
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
          className="jb-scrub mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 disabled:cursor-default dark:bg-slate-700"
        />
      </div>
    </Row>
  )
}
