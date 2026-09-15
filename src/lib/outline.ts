// The outline of a machine, as a path for the words round it to follow
// (`LyricsAround`).
//
// James, 2026-09-15: "We also need to check how lyrics are handled for the
// other type of players e.g. casette and have them follow an appropiate path".
// Until then every lyrics style was laid out round a CIRCLE centred on the
// deck, which is the record's outline and nobody else's. Round the cassette the
// ring stood well off the shell above and below and cut across its corners;
// round the jukebox and the pocket player, both taller than they are wide, it
// cut straight across the machine.
//
// ⚠️ THE SHAPE COMES FROM THE FRAME'S OWN `border-radius` (`SHAPES` in
// `components/decks/face.ts`): the string the focus ring and the hover target
// already take their shape from, and which that file insists is the machine's
// real outline. Reading it here, rather than keeping a second description of
// each machine, means a machine that changes shape takes its lyrics with it.
//
// Everything is in the FRAME's pixels, measured from its top-left corner.

/** One corner's radii, in pixels: across, then down. */
export interface Corner {
  rx: number
  ry: number
}

export interface Corners {
  tl: Corner
  tr: Corner
  br: Corner
  bl: Corner
}

/** A path, and how long it is in pixels. */
export interface EdgePath {
  d: string
  length: number
}

/**
 * A CSS `border-radius`, resolved against a `width` × `height` box — the part of
 * the syntax the frames use: one to four lengths in px or %, then optionally
 * `/` and one to four more for the vertical radii.
 *
 * As in CSS, a percentage across is of the width and one down is of the
 * height, and radii too big for their side are all scaled down together until
 * they fit — which is how `50%` on a square comes out a circle.
 */
export function cornerRadii(radius: string, width: number, height: number): Corners {
  const [across, down] = radius.split('/').map((part) => part.trim().split(/\s+/).filter(Boolean))
  const h = expand(across).map((value) => length(value, width))
  const v = expand(down ?? across).map((value) => length(value, height))
  const fit = Math.min(
    1,
    width / Math.max(1e-9, h[0] + h[1]),
    width / Math.max(1e-9, h[3] + h[2]),
    height / Math.max(1e-9, v[0] + v[3]),
    height / Math.max(1e-9, v[1] + v[2]),
  )
  const corner = (i: number): Corner => ({ rx: h[i] * fit, ry: v[i] * fit })
  return { tl: corner(0), tr: corner(1), br: corner(2), bl: corner(3) }
}

/** Is this box, with these corners, a circle? — the record, and only the record. */
export function isCircle(width: number, height: number, corners: Corners): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5
  return (
    near(width, height) &&
    [corners.tl, corners.tr, corners.br, corners.bl].every((c) => near(c.rx, width / 2) && near(c.ry, height / 2))
  )
}

/**
 * The whole outline, once round, `gap` pixels outside the frame — CLOCKWISE
 * FROM THE MIDDLE OF THE BOTTOM, so that the middle of the top, where the word
 * being sung is read, is `top` pixels along it.
 *
 * ⚠️ Starting at the bottom is what keeps the ribbon off the seam. The words
 * that are drawn at all lie less than half a lap either side of the top, so
 * every distance given to a word falls inside the path and none has to wrap
 * round its end.
 */
export function loopPath(width: number, height: number, corners: Corners, gap: number): EdgePath & { top: number } {
  const g = grow(width, height, corners, gap)
  const cx = width / 2
  const d = [
    `M ${n(cx)} ${n(g.bottom)}`,
    `L ${n(g.left + g.bl.rx)} ${n(g.bottom)}`,
    arc(g.bl, 1, g.left, g.bottom - g.bl.ry),
    `L ${n(g.left)} ${n(g.top + g.tl.ry)}`,
    arc(g.tl, 1, g.left + g.tl.rx, g.top),
    `L ${n(g.right - g.tr.rx)} ${n(g.top)}`,
    arc(g.tr, 1, g.right, g.top + g.tr.ry),
    `L ${n(g.right)} ${n(g.bottom - g.br.ry)}`,
    arc(g.br, 1, g.right - g.br.rx, g.bottom),
    'Z',
  ].join(' ')
  const toTop =
    run(cx - (g.left + g.bl.rx)) +
    quarter(g.bl) +
    run(g.bottom - g.bl.ry - (g.top + g.tl.ry)) +
    quarter(g.tl) +
    run(cx - (g.left + g.tl.rx))
  const rest =
    run(g.right - g.tr.rx - cx) +
    quarter(g.tr) +
    run(g.bottom - g.br.ry - (g.top + g.tr.ry)) +
    quarter(g.br) +
    run(g.right - g.br.rx - cx)
  return { d, length: toTop + rest, top: toTop }
}

/**
 * Over the top, left to right, from half-way down one side to half-way down
 * the other, `gap` pixels out — for a line written along it, upright.
 */
export function topPath(width: number, height: number, corners: Corners, gap: number): EdgePath {
  const g = grow(width, height, corners, gap)
  const mid = height / 2
  const from = Math.max(mid, g.top + g.tl.ry)
  const to = Math.max(mid, g.top + g.tr.ry)
  const d = [
    `M ${n(g.left)} ${n(from)}`,
    `L ${n(g.left)} ${n(g.top + g.tl.ry)}`,
    arc(g.tl, 1, g.left + g.tl.rx, g.top),
    `L ${n(g.right - g.tr.rx)} ${n(g.top)}`,
    arc(g.tr, 1, g.right, g.top + g.tr.ry),
    `L ${n(g.right)} ${n(to)}`,
  ].join(' ')
  const length =
    run(from - (g.top + g.tl.ry)) +
    quarter(g.tl) +
    run(g.right - g.tr.rx - (g.left + g.tl.rx)) +
    quarter(g.tr) +
    run(to - (g.top + g.tr.ry))
  return { d, length }
}

/**
 * Under the bottom, left to right — so that a line written along it stands
 * upright, which means its letters reach back up TOWARDS the machine: the
 * caller puts it out by the height of its type as well as the gap.
 */
export function bottomPath(width: number, height: number, corners: Corners, gap: number): EdgePath {
  const g = grow(width, height, corners, gap)
  const mid = height / 2
  const from = Math.min(mid, g.bottom - g.bl.ry)
  const to = Math.min(mid, g.bottom - g.br.ry)
  const d = [
    `M ${n(g.left)} ${n(from)}`,
    `L ${n(g.left)} ${n(g.bottom - g.bl.ry)}`,
    arc(g.bl, 0, g.left + g.bl.rx, g.bottom),
    `L ${n(g.right - g.br.rx)} ${n(g.bottom)}`,
    arc(g.br, 0, g.right, g.bottom - g.br.ry),
    `L ${n(g.right)} ${n(to)}`,
  ].join(' ')
  const length =
    run(g.bottom - g.bl.ry - from) +
    quarter(g.bl) +
    run(g.right - g.br.rx - (g.left + g.bl.rx)) +
    quarter(g.br) +
    run(g.bottom - g.br.ry - to)
  return { d, length }
}

interface Grown extends Corners {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * The frame pushed out by `gap` on every side. Each corner's radii grow by the
 * same amount, which is what keeps the words the same distance from the
 * machine all the way round a corner, rather than closer at the bend.
 */
function grow(width: number, height: number, c: Corners, gap: number): Grown {
  const out = (k: Corner): Corner => ({ rx: k.rx + gap, ry: k.ry + gap })
  return { left: -gap, top: -gap, right: width + gap, bottom: height + gap, tl: out(c.tl), tr: out(c.tr), br: out(c.br), bl: out(c.bl) }
}

/** A quarter of an ellipse, as an SVG arc to (x, y). `sweep` 1 is clockwise on screen. */
function arc(c: Corner, sweep: 0 | 1, x: number, y: number): string {
  return `A ${n(c.rx)} ${n(c.ry)} 0 0 ${sweep} ${n(x)} ${n(y)}`
}

/** A quarter of an ellipse's perimeter — Ramanujan's, which is exact for a circle. */
function quarter({ rx, ry }: Corner): number {
  if (rx <= 0 || ry <= 0) return Math.hypot(rx, ry)
  return (Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))) / 4
}

/** A straight run's length — never negative, where two corners meet. */
const run = (px: number) => Math.max(0, px)

/** CSS's one-to-four expansion, in the order top-left, top-right, bottom-right, bottom-left. */
function expand(values: string[]): [string, string, string, string] {
  const [a = '0', b = a, c = a, d = b] = values
  return [a, b, c, d]
}

function length(value: string, base: number): number {
  const number = parseFloat(value)
  if (!Number.isFinite(number)) return 0
  return value.endsWith('%') ? (number / 100) * base : number
}

/** Short numbers in the path — two places is a hundredth of a pixel. */
const n = (value: number) => Math.round(value * 100) / 100
