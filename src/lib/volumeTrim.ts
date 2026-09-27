// "Volume −50 to +50", VLC's way (James, 2026-09-27: "can we add volume
// control to -50 and +50 from min max? like vlc does? some of my songs are
// quite loud at one volume above 0").
//
// ⚠️ WHY A PHONE NEEDS THE MINUS SIDE. The iPhone's volume has sixteen steps
// and the first one above silence is already loud for a hot master; the app
// had no volume of its own there (the player bar's slider is desktop-only), so
// there was nothing between "off" and "too loud". The trim goes UNDER the
// phone's own volume: a step-one phone at −25 is a sixth as loud.
//
// ⚠️ IN DECIBELS BELOW ZERO, NOT A STRAIGHT LINE. `element.volume` is
// amplitude, and a straight −50 → ×0.5 would be −6 dB — hardly quieter. So
// the minus side is a decibel scale: every 10 is −6 dB (half the amplitude),
// and −50 is −30 dB. The fine control is where it is needed, at the quiet end.
//
// ⚠️ ABOVE ZERO NEEDS THE AUDIO GRAPH, as "Volume boost" does, because an
// element can't play louder than 1. So +50 is ×1.5 — VLC's 150% — where the
// graph is allowed, and the plus side is not offered in the iPhone app, whose
// music would stop in the background with it (`graphAllowed`).

export const TRIM_MIN = -50
export const TRIM_MAX = 50
/** Decibels per step on the minus side: −10 is −6 dB, half the amplitude. */
const DB_PER_STEP = 0.6

export function clampTrim(trim: number): number {
  return Number.isFinite(trim) ? Math.max(TRIM_MIN, Math.min(TRIM_MAX, Math.round(trim))) : 0
}

/** The factor on the element's own volume: 1 at zero and above, down to −30 dB. */
export function trimAttenuation(trim: number): number {
  const t = clampTrim(trim)
  return t >= 0 ? 1 : 10 ** ((t * DB_PER_STEP) / 20)
}

/** The extra gain above zero, through the graph: ×1 at zero, ×1.5 at +50. */
export function trimBoost(trim: number): number {
  const t = clampTrim(trim)
  return t <= 0 ? 1 : 1 + t / 100
}

/** "0", "−12", "+30" — signed, with a real minus. */
export function formatTrim(trim: number): string {
  const t = clampTrim(trim)
  return t === 0 ? '0' : t > 0 ? `+${t}` : `−${-t}`
}
