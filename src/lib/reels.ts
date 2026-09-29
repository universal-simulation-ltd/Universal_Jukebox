// The arithmetic of open reels — for `ReelToReelDeck` and the small spool in
// the row of records waiting (`UpNextReel`'s `Medium`).
//
// ⚠️ HERE, AND NOT IN THE FACE, because it is the part of that deck worth a
// test and a component file may not export anything but components (eslint's
// `react-refresh/only-export-components`, the same reason `SHAPES` lives in
// `decks/face.ts`). Everything below is plain numbers in, plain numbers out:
// no DOM, no React, callable from a test with literals.

export interface Point {
  x: number
  y: number
}

/**
 * The radius of a tape pack holding `fraction` of the tape, wound on a hub of
 * radius `hub`, where a full reel reaches `full`.
 *
 * ⚠️ THE SQUARE ROOT IS THE POINT, and it is the cassette's `pack()` for the
 * same reason. Tape is a constant thickness, so what grows evenly as it spools
 * is the AREA of the annulus, not its radius: a take-up reel gains radius fast
 * at first and barely moves by the end. Straight interpolation of the radius
 * gives two reels that visibly do not conserve tape — the sort of thing nobody
 * can name and everybody can see. On an open reel it is worse than on a
 * cassette, because the packs are the biggest thing on the machine.
 */
export function packRadius(fraction: number, hub: number, full: number): number {
  const f = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0
  return Math.sqrt(hub * hub + (full * full - hub * hub) * f)
}

/**
 * Seconds for one turn of a reel whose pack is `radius` across, with the tape
 * running at `speed` (in the same units, per second).
 *
 * ⚠️ THE TAPE RUNS AT A CONSTANT SPEED; THE REELS DO NOT. The capstan pulls
 * the tape past the heads at one fixed rate (7½ inches a second, on a home
 * deck), so a reel's turning rate is that speed over its circumference: the
 * full supply reel at the start of a track turns slowly, and speeds up as it
 * empties, while the take-up reel does the opposite. That the two reels are
 * visibly NOT turning together is the single most reel-to-reel thing about a
 * reel-to-reel, and the reason this deck does what the cassette's reels chose
 * not to (see `Reel` in `CassetteDeck.tsx`, and `useTurnRate` in the face).
 */
export function revolutionSeconds(radius: number, speed: number): number {
  if (!(radius > 0) || !(speed > 0)) return Infinity
  return (2 * Math.PI * radius) / speed
}

/**
 * Where a straight run of tape touches two round things it wraps — a pack and
 * a guide roller — with the tape on the SAME side of both (`left` or `right`
 * of the line from the first centre to the second, looking along it).
 *
 * The outer tangent: the tape leaves one circle and meets the other without
 * crossing between them, which is how tape is threaded round a guide. Returns
 * the point on each circle, in the order the circles were given.
 *
 * ⚠️ Worked out rather than drawn by eye because one end of it MOVES: the pack
 * grows and shrinks with the track, and a tape end pinned to a fixed point
 * either floats off the pack or dives into it by the end of every song. The
 * cassette gets away with a vertical line off the side of each pack because its
 * tape runs straight down; this one runs diagonally out to the guides.
 *
 * Circles that overlap have no outer tangent that clears both; this returns
 * the two nearest points on the line of centres then, rather than NaN — a NaN
 * coordinate takes a whole SVG path off the screen.
 */
export function outerTangent(
  a: Point,
  ra: number,
  b: Point,
  rb: number,
  side: 'left' | 'right',
): [Point, Point] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy)
  if (!(d > Math.abs(ra - rb))) {
    const ux = d > 0 ? dx / d : 1
    const uy = d > 0 ? dy / d : 0
    return [
      { x: a.x + ux * ra, y: a.y + uy * ra },
      { x: b.x - ux * rb, y: b.y - uy * rb },
    ]
  }
  // The unit normal from the tangent line towards both centres makes the same
  // angle with the line of centres on either side; `side` picks which.
  const ux = dx / d
  const uy = dy / d
  const cos = (rb - ra) / d
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos))
  // "Left of the direction of travel" in screen coordinates (y down) is the
  // perpendicular (uy, −ux); the tape is on that side when the normal points
  // the other way, back into the circles.
  const s = side === 'left' ? 1 : -1
  const nx = cos * ux - s * sin * uy
  const ny = cos * uy + s * sin * ux
  return [
    { x: a.x - ra * nx, y: a.y - ra * ny },
    { x: b.x - rb * nx, y: b.y - rb * ny },
  ]
}

/**
 * One window in a reel's flange: the ring between `inner` and `outer`, from
 * `from` to `to` degrees (clockwise from 12 o'clock). An SVG path.
 */
export function sectorPath(c: Point, inner: number, outer: number, from: number, to: number): string {
  const at = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${round(c.x + r * Math.cos(rad))} ${round(c.y + r * Math.sin(rad))}`
  }
  const large = to - from > 180 ? 1 : 0
  return [
    `M ${at(outer, from)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${at(outer, to)}`,
    `L ${at(inner, to)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${at(inner, from)}`,
    'Z',
  ].join(' ')
}

const round = (n: number) => Math.round(n * 1000) / 1000
