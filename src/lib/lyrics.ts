// Turning a lyric sheet into something the screen can follow.
//
// Two jobs, and they are deliberately in one file because they are the same
// question asked twice: what did we get, and is it timed?
//
//   1. `parseLyrics` — LRC in, lines out. LRC is the only synced-lyric format
//      anybody actually writes: a `[mm:ss.xx]` at the head of each line, a few
//      `[ar:]`-style metadata tags at the top, and an `[offset:]` nobody
//      remembers the sign of (it is below, with the reasoning).
//   2. `lyricsFromFile` — the sheet the user's own file was tagged with, read
//      on demand for ONE track.
//
// ⚠️ The online source lives in `lib/lrclib.ts` and nothing here reaches the
// network. That split is the point: everything in this file works with the
// network unplugged, and the app's promise ("nothing is uploaded") is only
// qualified in the one file that has to qualify it.

import { extensionOf, readSlice, HEAD_BYTES, TAIL_BYTES } from './scan'
import { readLyrics } from './tags'
import type { SourceFile } from './types'

/**
 * One line of a sheet.
 *
 * `timeSec` is null on an untimed line, which is every line of a plain sheet
 * and none of the lines of a synced one — `LyricSheet.synced` is the flag to
 * branch on, not this.
 */
export interface LyricLine {
  timeSec: number | null
  text: string
}

export interface LyricSheet {
  /** True when the lines carry times and the screen can follow along. */
  synced: boolean
  lines: LyricLine[]
  /** Where it came from, so the panel can say so. */
  source: LyricSource
}

/** `upload`: a lyrics file the person added themselves (`adoptLyrics`). */
export type LyricSource = 'file' | 'online' | 'upload'

/**
 * A `[key:value]` at the head of a line — either a timestamp (`[01:23.45]`) or
 * a metadata tag (`[ar:Someone]`). Which one it is comes down to whether the
 * key is digits, which is why one expression matches both.
 */
const TAG = /^\[([^\]:]*):([^\]]*)\]/

/** `[01:23.45]`, `[1:23]`, and the older `[01:23:45]` with a colon before the hundredths. */
const TIMESTAMP = /^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/

/**
 * A sheet, parsed.
 *
 * Forgiving by design: anything that fails to look like LRC comes back as a
 * plain sheet rather than as an error, because a file tagged with plain text is
 * the common case and not a fault.
 */
export function parseLyrics(raw: string, source: LyricSource = 'file'): LyricSheet | null {
  const text = raw.replace(/\r\n?/g, '\n').trim()
  if (!text) return null

  const rawLines = text.split('\n')
  const timed: LyricLine[] = []
  const plain: string[] = []
  let offsetSec = 0
  let contentLines = 0

  for (const rawLine of rawLines) {
    let rest = rawLine
    const times: number[] = []

    // Peel `[...]` groups off the front. A line can carry SEVERAL timestamps —
    // `[00:41.10][02:17.55]` is how every LRC writer stores a chorus once and
    // plays it twice — so this loops rather than matching one.
    for (;;) {
      const match = TAG.exec(rest)
      if (!match) break
      const stamp = TIMESTAMP.exec(`${match[1]}:${match[2]}`)
      if (stamp) {
        times.push(secondsFrom(stamp))
      } else if (match[1].trim().toLowerCase() === 'offset') {
        offsetSec = offsetFrom(match[2])
      } else if (!/^[a-z]{1,8}$/i.test(match[1].trim())) {
        // Not a timestamp and not a known-shaped metadata key — so it is part
        // of the line. Stop peeling and keep it.
        break
      }
      rest = rest.slice(match[0].length)
    }

    const body = rest.trim()
    if (times.length > 0) {
      for (const time of times) timed.push({ timeSec: time, text: body })
      contentLines++
    } else if (body) {
      plain.push(body)
      contentLines++
    }
  }

  // ⚠️ Two rules, not one. A sheet needs enough timed lines to be worth
  // following (a single stray `[00:00.00]` at the top of a plain sheet is
  // common, and following it would leave one line highlighted for four
  // minutes), and they have to be most of what is there — a half-timed sheet
  // read as synced hides every untimed line, which is a sheet with holes in it.
  const enough = timed.length >= 2 && timed.length >= contentLines * 0.5
  if (enough) {
    const lines = timed
      .map((line) => ({ ...line, timeSec: Math.max(0, (line.timeSec ?? 0) - offsetSec) }))
      .sort((a, b) => (a.timeSec ?? 0) - (b.timeSec ?? 0))
    return { synced: true, lines, source }
  }

  // Untimed: keep the words, drop any stray timestamps, and keep the blank
  // lines BETWEEN verses because a lyric sheet without its stanza breaks is a
  // wall of text.
  const all = rawLines.map(stripTimestamps)
  const lines = trimBlankEnds(all).map((value) => ({ timeSec: null, text: value }))
  if (lines.length === 0) return null
  return { synced: false, lines, source }
}

/** `[01:23.45]` → 83.45 seconds. */
function secondsFrom(stamp: RegExpExecArray): number {
  const minutes = parseInt(stamp[1], 10)
  const seconds = parseInt(stamp[2], 10)
  const fraction = stamp[3] ? parseInt(stamp[3], 10) / 10 ** stamp[3].length : 0
  return minutes * 60 + seconds + fraction
}

/**
 * `[offset:+500]` in milliseconds, as seconds to SUBTRACT.
 *
 * ⚠️ The sign is the part everybody gets wrong, including several shipping
 * players. A positive offset means the lyrics should appear EARLIER — it exists
 * to correct a sheet that lags the music — so the correction is
 * `time - offset`, not `time + offset`. Getting it backwards doubles the error
 * instead of removing it, and only on the handful of sheets that carry one, so
 * it is exactly the bug that never gets noticed.
 */
function offsetFrom(value: string): number {
  const ms = parseInt(value.trim(), 10)
  return Number.isFinite(ms) ? ms / 1000 : 0
}

function stripTimestamps(line: string): string {
  let rest = line
  for (;;) {
    const match = TAG.exec(rest)
    if (!match) break
    const isStamp = TIMESTAMP.test(`${match[1]}:${match[2]}`)
    const isMeta = /^[a-z]{1,8}$/i.test(match[1].trim())
    if (!isStamp && !isMeta) break
    rest = rest.slice(match[0].length)
  }
  return rest.trim()
}

/** Drop leading and trailing blank lines, keeping the ones in the middle. */
function trimBlankEnds(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && !lines[start]) start++
  while (end > start && !lines[end - 1]) end--
  return lines.slice(start, end)
}

/**
 * Which line is on now.
 *
 * The last line whose time has passed — NOT the nearest one, which would light
 * up the next line before it is sung. Returns -1 before the first line, which
 * is a real state (the intro) and not an error.
 *
 * Linear from the top, because a lyric sheet is a hundred lines and this runs
 * four times a second. A binary search here would be a fifth of a microsecond
 * better and one more thing to get wrong at the boundaries.
 */
export function activeLine(lines: LyricLine[], currentSec: number): number {
  let found = -1
  for (let i = 0; i < lines.length; i++) {
    const time = lines[i].timeSec
    if (time === null || time > currentSec) break
    found = i
  }
  return found
}

/**
 * The sheet the file itself was tagged with.
 *
 * One range read of the head, plus the MP4 tail read for the same reason
 * `scan.ts` does it — `moov` is at the back of maybe a third of real M4A files,
 * and lyrics live inside it with everything else. Returns null when the file
 * carries no sheet, which is the ordinary case and not a failure.
 */
export async function lyricsFromFile(file: SourceFile): Promise<LyricSheet | null> {
  const head = await readSlice(file, 0, HEAD_BYTES)
  const found = readLyrics(head)
  if (found) return parseLyrics(found, 'file')

  const ext = extensionOf(file.name)
  const isMp4 = ext === 'm4a' || ext === 'mp4' || ext === 'aac'
  if (isMp4 && file.size > HEAD_BYTES) {
    const tail = await readSlice(file, file.size - TAIL_BYTES, file.size)
    const fromTail = readLyrics(tail)
    if (fromTail) return parseLyrics(fromTail, 'file')
  }
  return null
}
