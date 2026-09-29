// The sums behind moving through a song with a machine's moving part — see
// `components/decks/scrub.tsx`, which does the pointer.

/** Maps a finger at (x, y), in client pixels, to where it puts the song, 0 → 1. */
export type ScrubMap = (x: number, y: number) => number | null

/**
 * The share of the song one lap of a wound control moves: thirty seconds,
 * but never more than a third of the song, so a short one still takes a few
 * laps rather than one flick.
 */
export function turnShare(durationSec: number): number {
  return durationSec > 0 ? Math.min(1 / 3, 30 / durationSec) : 0
}

/** Detents in the whole song for a wound control: one every 30° of the lap. */
export function rotaryDetents(durationSec: number): number {
  const share = turnShare(durationSec)
  return share > 0 ? Math.round(12 / share) : 10
}

/**
 * A wound control around (cx, cy): from `from`, clockwise is later. The angle is
 * UNWRAPPED as it goes, so lap after lap keeps adding rather than jumping back
 * at the top of the circle.
 *
 * `onTurn`, if given, hears the total angle turned, in degrees — for a face that
 * turns its part under the finger (the cassette's reels).
 */
export function rotary(
  cx: number,
  cy: number,
  startX: number,
  startY: number,
  from: number,
  share: number,
  onTurn?: (degrees: number) => void,
): ScrubMap {
  let last = Math.atan2(startY - cy, startX - cx)
  let turned = 0
  return (x, y) => {
    // Too near the middle to say which way it is going.
    if (Math.hypot(x - cx, y - cy) < 6) return null
    const angle = Math.atan2(y - cy, x - cx)
    let step = angle - last
    if (step > Math.PI) step -= 2 * Math.PI
    else if (step < -Math.PI) step += 2 * Math.PI
    last = angle
    turned += step
    onTurn?.((turned * 180) / Math.PI)
    return Math.max(0, Math.min(1, from + (turned / (2 * Math.PI)) * share))
  }
}
