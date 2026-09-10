// What the lyrics panel should be doing, worked out from where the song is.
//
// Two answers, both pure so they can be tested without a song:
//
//   • `nextSungLine` — the line to show in black-but-not-bold, so the person
//     singing along sees what is coming (James, 2026-09-10: "make the next
//     lyric black non-bold so the user gets ready to sing the next line").
//   • `micPhase` — what the microphone above the sheet is doing: lying on the
//     table through the intro, picked up for the first sung line, singing while
//     a line is being sung, held still through a gap or a pause, and dropped
//     when the last line has been sung.
//
// ⚠️ A BLANK TIMED LINE IS A GAP, NOT A LYRIC. LRC marks an instrumental
// passage with a timestamp and no words, and it keeps its place in the sheet
// (see `Lyrics.tsx`). So "the next line" skips blanks — the next thing to SING,
// not the next row — and "the last line" is the last one with words in it.

import type { LyricLine } from './lyrics'

export type MicPhase = 'resting' | 'singing' | 'holding' | 'dropped'

/**
 * How long the final line is taken to last when nothing timed follows it.
 * Most sheets end with a blank timed line, which is the honest answer; this is
 * for the ones that do not.
 */
export const LAST_LINE_SEC = 5

const sung = (line: LyricLine | undefined): boolean =>
  !!line && line.timeSec !== null && line.text.trim() !== ''

/** The first line with words, or -1. */
export function firstSungLine(lines: LyricLine[]): number {
  return lines.findIndex(sung)
}

/** The last line with words, or -1. */
export function lastSungLine(lines: LyricLine[]): number {
  for (let i = lines.length - 1; i >= 0; i--) if (sung(lines[i])) return i
  return -1
}

/**
 * The next line with words AFTER `active` — or the first one, during the intro.
 * -1 once there is nothing left to sing.
 */
export function nextSungLine(lines: LyricLine[], active: number): number {
  for (let i = Math.max(0, active + 1); i < lines.length; i++) if (sung(lines[i])) return i
  return -1
}

/**
 * What the microphone is doing right now.
 *
 * ⚠️ Derived fresh from the position every time, never remembered — so a seek
 * backwards after the mic drop simply answers "singing" again, and the
 * component turns that change into a pick-up. Nothing has to be reset.
 */
export function micPhase(lines: LyricLine[], active: number, currentSec: number, playing: boolean): MicPhase {
  const first = firstSungLine(lines)
  if (first < 0 || active < first) return 'resting'

  const last = lastSungLine(lines)
  // Past the last sung line: a trailing blank line is on, which is the end.
  if (active > last) return 'dropped'
  if (active === last) {
    const lastAt = lines[last].timeSec ?? 0
    const after = lines.slice(last + 1).find((l) => l.timeSec !== null)?.timeSec
    if (currentSec >= (after ?? lastAt + LAST_LINE_SEC)) return 'dropped'
  }

  if (!playing) return 'holding'
  return sung(lines[active]) ? 'singing' : 'holding'
}
