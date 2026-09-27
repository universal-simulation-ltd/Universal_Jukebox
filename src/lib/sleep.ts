// The sleep timer, as rules (James, 2026-09-27: "a Sleep function when tapping
// cycle 15,30,45,60 and if active turn off music after that time (fade out
// music for last minute of it). If tap and hold then have a selector popup so
// user can choose e.g. 2h15"). The clock and the fade are `stores/sleepStore`.

/** What a tap steps through, in minutes; one past the last is off. */
export const SLEEP_PRESETS = [15, 30, 45, 60] as const
/** The music fades over the last of this. */
export const SLEEP_FADE_SEC = 60
/** The longest the picker offers. */
export const SLEEP_MAX_MIN = 12 * 60

/**
 * The next tap's minutes, or null for off. From off, the first preset; from a
 * preset, the next one; from the last preset — or a time from the picker,
 * which no tap can land back on — off.
 */
export function nextSleep(current: number | null): number | null {
  if (current === null) return SLEEP_PRESETS[0]
  const i = (SLEEP_PRESETS as readonly number[]).indexOf(current)
  return i >= 0 && i < SLEEP_PRESETS.length - 1 ? SLEEP_PRESETS[i + 1] : null
}

/**
 * How loud the music is let be with `leftSec` to go: full until the last
 * minute, then down to nothing. Curved, because volume heard is not volume
 * set — a straight line sounds like it holds, then drops off a cliff.
 */
export function sleepGain(leftSec: number): number {
  if (leftSec >= SLEEP_FADE_SEC) return 1
  if (leftSec <= 0) return 0
  return (leftSec / SLEEP_FADE_SEC) ** 2
}

/** "14 min", "1h 05" — what is left, for the word under the button. */
export function sleepLeft(leftSec: number): string {
  const min = Math.max(0, Math.ceil(leftSec / 60))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}`
}
