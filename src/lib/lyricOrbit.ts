import type { LyricLine } from './lyrics'

// The words laid out as a RIBBON around the record, and where on that ribbon
// the song currently is (James, 2026-09-15: "Anti clockwise rotation of the
// lyrics around the record so the current word is always near the top, they'd
// need to start and finish at the bottom, old lyrics go out and new lyrics come
// in, perhaps with a blur so it's not so hard").
//
// The whole style is one idea: every word of the song is written once, in
// order, around a circle that never ends, and the circle turns ANTI-CLOCKWISE
// under a fixed reading point at the top. Nothing moves relative to anything
// else — the ring turns, and the word being sung is whichever one has come
// round to the top. That is what makes it read: the words to come are climbing
// the right-hand side, the words just sung are falling down the left, and each
// line therefore enters at the bottom and leaves at the bottom, which is what
// was asked for and also the only way a circle can behave.
//
// ⚠️ TWO ANGLES, AND THEY ARE NOT THE SAME ANGLE.
//   - A word's `deg` is its place ON THE RIBBON, measured from the ribbon's
//     own beginning. It never changes for the whole song.
//   - The HEAD is how far the ribbon has turned. `orbitHead` is the only thing
//     time touches.
// What ends up on screen is `word.deg - head`, clockwise from the top. The
// component turns the ring by `-head` and lets the browser do that subtraction
// for every word at once, which is also why it can be a CSS transition rather
// than sixty re-renders a second.
//
// ⚠️ THE RIBBON IS MEASURED IN DEGREES, NOT PIXELS, and a degree is worth fewer
// pixels on a small deck than a big one. So the layout depends on the radius:
// the same line wraps further round a small record. Everything here takes the
// radius and the font size and returns degrees; nothing here knows about the
// screen.

/**
 * A word's width as a share of the font size, per character — the FALLBACK,
 * used only where nothing can measure the text (see `measure` below). Set from
 * the mean of a system sans at semibold, so it errs loose rather than tight: a
 * line spaced a shade widely reads, and a line spaced tightly runs its words
 * into each other.
 */
const CHAR_EM = 0.62
/** The space between two words, as a share of the font size. */
const SPACE_EM = 0.4
/**
 * The pause the ribbon carries between one line and the next, crossed while the
 * first line is still being sung.
 *
 * ⚠️ IT BELONGS TO THE LINE BEFORE IT, not to the gap after it, and that is the
 * whole reason it exists. Lyric files habitually time the next line at the exact
 * moment the last one ends, so a separator paid for out of "the gap" would have
 * to be crossed in zero seconds — a visible jolt on the tightest-packed songs,
 * which are the ones this style is best on. Crossed over the last of the line's
 * own time it is simply the ribbon running on a little.
 */
const SEAM_DEG = 18
/** How fast the ribbon turns through a gap with nothing being sung. */
const GAP_DEG_PER_SEC = 42
/** The most an instrumental can turn it, however long it lasts. */
export const MAX_GAP_DEG = 240
/** How long a line is taken to last when the sheet does not say. */
const PER_WORD_SEC = 0.6
const MIN_LINE_SEC = 1.2
/**
 * The longest a line is allowed to be sung for, however far off the next one is.
 *
 * ⚠️ A CEILING, NOT THE ANSWER — and the difference is the whole of why this
 * constant exists. When the sheet times the next row two seconds later, two
 * seconds is what the line takes, and no guess about pacing gets to overrule
 * it: doing that ends the line's turn early and leaves its last word drifting
 * off to the left while it is still being sung. The ceiling is for the other
 * case, a line followed by a minute of guitar, where believing the sheet would
 * have four words crawl across the top for a minute.
 */
const LINE_CEILING_SEC = 3.5
/** Where the first line waits before the song reaches it, and where the last one goes. */
const ENTRY_DEG = 150
const ENTRY_SEC = 4
const EXIT_DEG = 150
const EXIT_SEC = 6

/** One word, at its fixed place on the ribbon. */
export interface OrbitWord {
  /** Its line's index in the sheet — with `index`, a key that survives a re-render. */
  line: number
  index: number
  text: string
  /** The middle of the word, in degrees along the ribbon. */
  deg: number
}

/** One line's stretch of ribbon, and the times it is sung over. */
export interface OrbitLine {
  line: number
  startDeg: number
  /** The words alone — the seam that follows them is not in this. */
  spanDeg: number
  startSec: number
  /** When the ribbon stops moving at singing speed and starts drifting. */
  sungEndSec: number
}

export interface Ribbon {
  words: OrbitWord[]
  lines: OrbitLine[]
}

const sung = (line: LyricLine | undefined): boolean =>
  !!line && line.timeSec !== null && line.text.trim() !== ''

/** How wide a word is, in pixels. `lib/textWidth.ts` is the real one. */
export type MeasureWord = (text: string) => number

/**
 * Lay the whole sheet out around a circle of `radius` pixels at `fontSize`.
 *
 * ⚠️ PASS `measure` IF YOU CAN. Without it a word's width is guessed from how
 * many letters it has, and a guess is fine for "the minor fall" and badly wrong
 * for "mmm" or "understanding" — the first version of this had no measurer and
 * ran the words of every line into one another. `lib/textWidth.ts` measures the
 * real font on a canvas, cheaply; the estimate is what is left when there is no
 * canvas to do it with, and the tests use it deliberately so that they say the
 * same thing on every machine.
 *
 * ⚠️ Done ONCE per song, not per frame. It walks the whole sheet, so the caller
 * memoises it on the sheet, the radius and the font size — `orbitHead` is the
 * part that runs as the song plays, and it is a search and some arithmetic.
 */
export function orbitRibbon(lines: LyricLine[], radius: number, fontSize: number, measure?: MeasureWord | null): Ribbon {
  const width = measure ?? ((text: string) => text.length * CHAR_EM * fontSize)
  // A pixel of arc, in degrees, at this radius.
  const perPx = 180 / (Math.PI * Math.max(1, radius))
  const words: OrbitWord[] = []
  const out: OrbitLine[] = []
  let cursor = 0
  let previousEnd: number | null = null

  for (let i = 0; i < lines.length; i++) {
    if (!sung(lines[i])) continue
    const startSec = lines[i].timeSec ?? 0
    if (previousEnd !== null) {
      cursor += Math.min(MAX_GAP_DEG, Math.max(0, startSec - previousEnd) * GAP_DEG_PER_SEC)
    }
    const startDeg = cursor
    const parts = lines[i].text.trim().split(/\s+/).filter(Boolean)
    for (let k = 0; k < parts.length; k++) {
      const span = (width(parts[k]) + SPACE_EM * fontSize) * perPx
      words.push({ line: i, index: k, text: parts[k], deg: cursor + span / 2 })
      cursor += span
    }
    const spanDeg = cursor - startDeg
    // ⚠️ The next line with a TIME, blank or not. LRC marks the end of a sung
    // line with a timed blank one, so the row after this is usually the honest
    // answer to "when does this stop being sung?" — and `nextSungLine` would
    // skip straight past it to the far side of the instrumental.
    let nextTime: number | null = null
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].timeSec !== null) {
        nextTime = lines[j].timeSec
        break
      }
    }
    const paced = Math.max(MIN_LINE_SEC, parts.length * PER_WORD_SEC)
    const ceiling = startSec + Math.max(LINE_CEILING_SEC, paced * 2)
    const sungEndSec = Math.max(
      startSec + 0.4,
      nextTime !== null ? Math.min(nextTime, ceiling) : startSec + paced,
    )
    out.push({ line: i, startDeg, spanDeg, startSec, sungEndSec })
    cursor += SEAM_DEG
    previousEnd = sungEndSec
  }
  return { words, lines: out }
}

/**
 * How far the ribbon has turned at `sec`, in degrees.
 *
 * Within a line it moves at the line's own speed, so the word being sung is the
 * one at the top. Between lines it drifts: the line just finished carries on
 * down the left and the next climbs the right, arriving at the top exactly as
 * it is due. Before the first line and after the last it leans in and out, so
 * the song does not begin or end with words parked on screen.
 */
export function orbitHead(ribbon: Ribbon, sec: number): number {
  const { lines } = ribbon
  if (lines.length === 0) return 0

  const first = lines[0]
  if (sec < first.startSec) {
    const p = clamp((sec - (first.startSec - ENTRY_SEC)) / ENTRY_SEC, 0, 1)
    return first.startDeg - ENTRY_DEG * (1 - p)
  }

  let at = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startSec > sec) break
    at = i
  }
  const line = lines[at]
  const ends = line.startDeg + line.spanDeg + SEAM_DEG

  if (sec <= line.sungEndSec) {
    const p = clamp((sec - line.startSec) / Math.max(0.05, line.sungEndSec - line.startSec), 0, 1)
    return line.startDeg + (line.spanDeg + SEAM_DEG) * p
  }

  const next = lines[at + 1]
  if (!next) return ends + EXIT_DEG * clamp((sec - line.sungEndSec) / EXIT_SEC, 0, 1)
  const across = next.startSec - line.sungEndSec
  if (across <= 0) return next.startDeg
  return ends + (next.startDeg - ends) * clamp((sec - line.sungEndSec) / across, 0, 1)
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
}
