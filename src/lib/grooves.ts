// The grooves on a record say how long its song is (James, 2026-09-11: "does /
// could the number of lines on a record represent how long the track is?" —
// "yes"). About one ring for every ten seconds: a three-minute song looks as
// every record used to, a seven-minute one is packed tight, a ninety-second
// one sparse. A song whose length is not known yet (the scan does not decode —
// a length is learnt the first time it plays) keeps the old look.

/** How every record looked before — and how one with no known length still does. */
export const DEFAULT_RINGS = 18
const MIN_RINGS = 8
const MAX_RINGS = 45
const SECONDS_PER_RING = 10

/** Rings for a song this long. */
export function grooveRings(durationSec: number | undefined | null): number {
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) return DEFAULT_RINGS
  return Math.max(MIN_RINGS, Math.min(MAX_RINGS, Math.round(durationSec / SECONDS_PER_RING)))
}

/**
 * The grooves as a background: `rings` of them between the label's edge and
 * the rim, in shares of the RADIUS (`closest-side`), so one record looks the
 * same at any size — the deck, a stand-in drawn at the deck's size and scaled,
 * a 45 on a shelf. `labelInset` is the label's inset as a share of the record's
 * width (0.3 for an LP, 0.25 for a 45); a line is a quarter of each groove.
 */
export function grooveGradient(rings: number, labelInset: number): string {
  // The label's edge is at (1 − 2 × inset) of the radius; the grooves are the rest.
  const band = labelInset * 200
  const period = band / Math.max(1, rings)
  const gap = +(period * 0.75).toFixed(3)
  const step = +period.toFixed(3)
  return `repeating-radial-gradient(circle closest-side at 50% 50%, transparent 0 ${gap}%, rgba(255,255,255,.5) ${gap}% ${step}%)`
}
