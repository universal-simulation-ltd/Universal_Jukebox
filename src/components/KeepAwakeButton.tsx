import { canKeepAwake } from '../lib/keepAwake'
import { useSettingsStore } from '../stores/settingsStore'
import { ModeButton } from './ModeButton'

// "Keep awake" in the row under the records waiting to go on — the screen stays
// on while Now Playing is open, so the lyrics can be read along to (James,
// 2026-09-16). The hold itself is `useKeepAwake` in `NowPlaying`; this only
// flips the remembered setting.
//
// ⚠️ ABSENT WHERE IT CANNOT WORK, for `OutputButton`'s reason: a lit button over
// a screen that dims anyway is worse than no button.

export default function KeepAwakeButton() {
  const on = useSettingsStore((s) => s.keepAwake)
  const set = useSettingsStore((s) => s.set)
  if (!canKeepAwake()) return null
  return (
    <ModeButton
      label="Keep awake"
      on={on}
      ariaLabel={on ? 'The screen stays on while this page is open — tap to let it lock' : 'Keep the screen on while this page is open'}
      onClick={() => set('keepAwake', !on)}
    >
      <AwakeGlyph />
    </ModeButton>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** A sun — the screen left lit. */
function AwakeGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
    </svg>
  )
}
