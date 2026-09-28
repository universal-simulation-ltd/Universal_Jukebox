import { quietUnavailable } from '../lib/audioGraph'
import { QUIET_STEPS_DB, useSettingsStore } from '../stores/settingsStore'
import { ModeButton } from './ModeButton'

// "Quiet" in the row under the records, beside Output (James, 2026-09-28: add
// Extra quiet "to the options bar at bottom of now playing" — "on click don't
// show slider, instead cycle through a few different options"). Each tap steps
// Off → −10 → −20 → −30 dB → Off. The same setting as Settings ▸ Sound ▸ Extra
// quiet, whose slider moves in the same 5 dB steps; a level set there that is
// between these steps goes to the next quieter one.

/** The step after `db`: the first one quieter than it, else back to off. */
function nextQuiet(db: number): number {
  return QUIET_STEPS_DB.find((step) => step < db - 0.001) ?? 0
}

export default function QuietButton() {
  const quietDb = useSettingsStore((s) => s.quietDb)
  const set = useSettingsStore((s) => s.set)
  if (quietUnavailable()) return null
  const on = quietDb < 0
  const next = nextQuiet(quietDb)

  return (
    <ModeButton
      label={on ? `−${Math.round(-quietDb)} dB` : 'Quiet'}
      on={on}
      ariaLabel={`Extra quiet: ${on ? `${Math.round(-quietDb)} dB down` : 'off'} — tap for ${next < 0 ? `${-next} dB down` : 'off'}`}
      onClick={() => set('quietDb', next)}
    >
      <QuietGlyph />
    </ModeButton>
  )
}

/** A speaker with one small wave. */
function QuietGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8v4h3l4 3.5v-11L6 8z" />
      <path d="M13.5 8.2a2.6 2.6 0 0 1 0 3.6" />
    </svg>
  )
}
