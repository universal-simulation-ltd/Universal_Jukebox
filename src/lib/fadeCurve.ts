// The shape of a fade — `rampTo` in `audio.ts`.
//
// ⚠️ A CROSSFADE'S TWO HALVES ARE A PAIR, AND THEY WERE NOT (James, 2026-09-11:
// "the crossfade is quite harsh sometimes does the current track completely
// fade out (in case the next track has a slow start)?"). Both decks were
// shaped by √t — right for the track coming IN, wrong for the one going OUT:
// 1 − √t halves the old track a quarter of the way through the blend (0.45s
// into a 1.8s change), so a next track with a quiet start left a hole where
// the music fell away. Equal power is sin for the one rising and cos for the
// one falling: sin² + cos² = 1, so the two together are as loud as one track
// all the way across, and the old one is still at 92% a quarter of the way in.

export type FadeCurve = 'linear' | 'equal-power'

/** The level `t` of the way (0 → 1) through a fade from `from` to `to`. */
export function fadeLevel(from: number, to: number, t: number, curve: FadeCurve): number {
  const p = Math.min(1, Math.max(0, t))
  if (curve === 'linear') return from + (to - from) * p
  const quarter = (p * Math.PI) / 2
  // Rising follows sin, falling follows cos — each over its own span, so a
  // fade that starts part-way (a deck already at 0.4) keeps the same shape.
  return to >= from ? from + (to - from) * Math.sin(quarter) : to + (from - to) * Math.cos(quarter)
}
