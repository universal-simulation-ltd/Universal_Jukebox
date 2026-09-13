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

//
// ⚠️ …AND THEN THE PAIR WAS TOO EVEN (James, 2026-09-13: "it should be further
// along e.g. first track goes more quiet until the second track kicks in so
// it's less harsh"). Equal power keeps BOTH tracks at 71% at the half-way
// point — two songs, loud together, which is the clash. `staggered` moves them
// apart: the song arriving stays silent for the first `STAGGER` of the blend
// and rises over the rest; the song leaving falls over the first 1 − `STAGGER`
// and is gone by then. Half-way, each is at 50%. The earlier complaint — a hole
// when the next song starts quietly — is answered separately and still is: the
// intro hold (`lib/intro.ts`) keeps the song ending at full through a quiet
// start, and the blend only begins when the new song's music does.

export type FadeCurve = 'linear' | 'equal-power' | 'staggered'

/** The share of a staggered blend before the arriving song is heard at all. */
export const STAGGER = 0.25

/** The level `t` of the way (0 → 1) through a fade from `from` to `to`. */
export function fadeLevel(from: number, to: number, t: number, curve: FadeCurve): number {
  const p = Math.min(1, Math.max(0, t))
  if (curve === 'linear') return from + (to - from) * p
  if (curve === 'staggered') {
    // Rising: silent, then sin over the rest. Falling: cos, done early.
    if (to >= from) return from + (to - from) * Math.sin((Math.max(0, (p - STAGGER) / (1 - STAGGER)) * Math.PI) / 2)
    return to + (from - to) * Math.cos((Math.min(1, p / (1 - STAGGER)) * Math.PI) / 2)
  }
  const quarter = (p * Math.PI) / 2
  // Rising follows sin, falling follows cos — each over its own span, so a
  // fade that starts part-way (a deck already at 0.4) keeps the same shape.
  return to >= from ? from + (to - from) * Math.sin(quarter) : to + (from - to) * Math.cos(quarter)
}
