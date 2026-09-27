import { graphUnavailable } from '../lib/audioGraph'
import { TRIM_MAX, TRIM_MIN, formatTrim } from '../lib/volumeTrim'
import { useSettingsStore } from '../stores/settingsStore'

// The "−50 to +50" volume, in the row under the records (James, 2026-09-27) —
// the rules, and why the minus side is in decibels, are `lib/volumeTrim.ts`.
// Where the audio graph can't be used (the iPhone app) the plus side isn't
// offered, and the slider stops at 0.

export default function VolumeTrim() {
  const trim = useSettingsStore((s) => s.volumeTrim)
  const set = useSettingsStore((s) => s.set)
  const max = graphUnavailable() ? 0 : TRIM_MAX
  const shown = Math.min(trim, max)
  const span = max - TRIM_MIN
  /** Where zero sits along the track, for its tick. */
  const zeroAt = ((0 - TRIM_MIN) / span) * 100

  return (
    <div className="mx-auto mt-2 w-full max-w-sm px-4">
      <div className="flex items-center gap-3">
        <span className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">Volume</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={TRIM_MIN}
            max={max}
            step={1}
            value={shown}
            onChange={(e) => set('volumeTrim', Number(e.target.value))}
            aria-label="Volume, from −50 to +50"
            aria-valuetext={formatTrim(shown)}
            className="jb-scrub relative z-10 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700"
          />
          {max > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-400 dark:bg-slate-500"
              style={{ left: `${zeroAt}%` }}
            />
          )}
        </div>
        {/* Tap the number to go back to 0. */}
        <button
          type="button"
          onClick={() => set('volumeTrim', 0)}
          disabled={shown === 0}
          title={shown === 0 ? 'As loud as the song and your device make it' : 'Tap to go back to 0'}
          className={`w-10 shrink-0 rounded-full py-0.5 text-center text-[12.5px] font-semibold tabular-nums ${
            shown === 0 ? 'text-slate-500 dark:text-slate-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
          }`}
        >
          {formatTrim(shown)}
        </button>
      </div>
      {max === 0 && (
        <p className="mt-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Turns it down below your phone’s own lowest step.
        </p>
      )}
    </div>
  )
}
