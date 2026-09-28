import { quietUnavailable } from '../lib/audioGraph'
import { LOUD_STEPS_DB, QUIET_STEPS_DB, useSettingsStore } from '../stores/settingsStore'
import { ModeButton } from './ModeButton'

// "Quiet" and "Loud" in the row under the records, beside Output (James,
// 2026-09-28: add Extra quiet "to the options bar at bottom of now playing" —
// "on click don't show slider, instead cycle through a few different options",
// then "also add an option for 'loud' with +10, 20, 30 db"). Each tap steps
// Off → ±10 → ±20 → ±30 dB → Off. Both drive the one `levelDb` setting, so
// tapping Loud while Quiet is on starts Loud from +10 and turns Quiet off. The
// Settings ▸ Sound slider moves in 5 dB steps; a level set there between these
// steps goes on to the next step further out.

export default function LevelButton({ kind }: { kind: 'quiet' | 'loud' }) {
  const levelDb = useSettingsStore((s) => s.levelDb)
  const set = useSettingsStore((s) => s.set)
  if (quietUnavailable()) return null
  const sign = kind === 'quiet' ? -1 : 1
  // How far out THIS button is, in positive dB; 0 when off or the other one is on.
  const mine = Math.max(0, sign * levelDb)
  const steps: readonly number[] = kind === 'quiet' ? QUIET_STEPS_DB : LOUD_STEPS_DB
  const next = steps.find((step) => Math.abs(step) > mine + 0.001) ?? 0
  const on = mine > 0
  const word = kind === 'quiet' ? 'Quiet' : 'Loud'
  const shown = `${sign < 0 ? '−' : '+'}${Math.round(mine)} dB`

  return (
    <ModeButton
      label={on ? shown : word}
      on={on}
      ariaLabel={`${word}: ${on ? shown : 'off'} — tap for ${next ? `${Math.abs(next)} dB` : 'off'}`}
      onClick={() => set('levelDb', next)}
    >
      {kind === 'quiet' ? <QuietGlyph /> : <LoudGlyph />}
    </ModeButton>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** A speaker with one small wave. */
function QuietGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M3 8v4h3l4 3.5v-11L6 8z" />
      <path d="M13.5 8.2a2.6 2.6 0 0 1 0 3.6" />
    </svg>
  )
}

/** A speaker with three waves. */
function LoudGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M2.5 8v4h3l4 3.5v-11L5.5 8z" />
      <path d="M12.5 8.2a2.6 2.6 0 0 1 0 3.6M14.7 6.3a5.3 5.3 0 0 1 0 7.4M16.9 4.4a8 8 0 0 1 0 11.2" />
    </svg>
  )
}
