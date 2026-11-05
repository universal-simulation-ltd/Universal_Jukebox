// mixMath.ts — the arithmetic of the Mix tab's two turntables, kept pure so it
// can be tested without an AudioContext (`mixMath.test.ts`).

/** A 12-inch LP's 33⅓ turns a minute: one full turn of the platter is this much music. */
export const SEC_PER_REV = 60 / (100 / 3)

/** The speed slider's reach either side of normal: ±25%. */
export const SPEED_RANGE = 0.25

/**
 * Touches further out than this, as a share of the record's radius, are on the
 * EDGE: turning the edge nudges the speed (a DJ's jog wheel) instead of holding
 * the record still under the finger.
 */
export const RIM_FROM = 0.8

/** How hard turning the edge bends the speed, and how far it may go. */
const BEND_GAIN = 0.35
const BEND_MAX = 0.5

/**
 * The two decks' volumes for a crossfader at `x` (-1 = all A, 1 = all B).
 * Equal-power, so the middle is not a dip: both at ~71%, loudness held.
 */
export function crossfadeGains(x: number): [number, number] {
  const t = ((Math.max(-1, Math.min(1, x)) + 1) / 2) * (Math.PI / 2)
  const a = Math.cos(t)
  const b = Math.sin(t)
  // Snap the far ends to exact silence, not 6e-17.
  return [a < 1e-6 ? 0 : a, b < 1e-6 ? 0 : b]
}

/** The angle of a point around a centre, in radians, clockwise from 3 o'clock (screen y runs down). */
export function pointerAngle(cx: number, cy: number, x: number, y: number): number {
  return Math.atan2(y - cy, x - cx)
}

/** The shortest turn from one angle to another, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  let d = to - from
  while (d <= -Math.PI) d += 2 * Math.PI
  while (d > Math.PI) d -= 2 * Math.PI
  return d
}

/** How much music a turn of the record is worth (clockwise = forwards). */
export function turnToSec(radians: number): number {
  return (radians / (2 * Math.PI)) * SEC_PER_REV
}

/** Where the record's label points, in degrees, `sec` into the song. */
export function discAngleDeg(sec: number): number {
  const turns = sec / SEC_PER_REV
  return (turns - Math.floor(turns)) * 360
}

/**
 * A turn of the EDGE as a speed bend: turning it at the record's own speed
 * adds `BEND_GAIN` (35%), against it takes it away, capped at ±50%.
 */
export function bendFromTurn(radians: number, ms: number): number {
  if (!(ms > 0)) return 0
  const omega = radians / (ms / 1000)
  const normal = (2 * Math.PI) / SEC_PER_REV
  return Math.max(-BEND_MAX, Math.min(BEND_MAX, (omega / normal) * BEND_GAIN))
}

/** Is a touch at `r` from the centre on the record's edge? */
export function onRim(r: number, radius: number): boolean {
  return r >= radius * RIM_FROM
}

/** The speed slider's value, kept in range and snapped to normal when close. */
export function clampSpeed(speed: number): number {
  const s = Math.max(1 - SPEED_RANGE, Math.min(1 + SPEED_RANGE, speed))
  return Math.abs(s - 1) < 0.004 ? 1 : s
}

/** A speed as the pitch readout shows it: "+3.2%", "−8.0%", "0.0%". */
export function speedPercent(speed: number): string {
  const p = Math.round((speed - 1) * 1000) / 10
  if (p === 0) return '0.0%'
  return `${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`
}
