// "Lyrics on the lock screen" with the phone locked (backlog: engine
// follow-ups, 2026-10-13). `lockLyrics.ts` moves the line on every playback
// tick — but on a locked iPhone the page's JavaScript stops within a second
// (probe 3, 2026-10-07), so the line froze on whatever was sung at the lock,
// and the songs after it never had one. The engine runs the queue alone then,
// so it is given each song's timed lines in the plan (`lines` on
// `EngineEntryDraft`) and follows them itself (`followLines` in
// JukeboxEngine.swift).
//
// The lines are found here, ahead of time, for the song on now and the next
// few: the same sources the lyrics panel reads (`localLyricSheet`) — the
// person's own file, a `.lrc` beside the song, the tags, the Music library's
// lyrics — never lrclib.net, and never a Music-library copy made just for this.
// Only a SYNCED sheet is any use: a plain one has nothing to follow.

import type { LyricSheet } from './lyrics'
import type { Track } from './types'
import { localLyricSheet, useLyricsStore } from '../stores/lyricsStore'

export type LockLines = { t: number; text: string }[]

/** How many songs ahead of the one on now get their lines found. */
export const LINES_AHEAD = 4
/** Sheets kept; a few KB each. */
const KEEP = 60

const found = new Map<string, LockLines | null>()
let busy = false

/** A sheet as the engine wants it: timed lines, in order; null if there is nothing to follow. */
export function linesOf(sheet: LyricSheet | null): LockLines | null {
  if (!sheet?.synced) return null
  const lines: LockLines = []
  for (const line of sheet.lines) {
    if (line.timeSec === null) break
    lines.push({ t: line.timeSec, text: line.text })
  }
  return lines.length ? lines : null
}

/** The lines for a song, if found already. The lyrics panel's sheet counts for the song on now. */
export function lockLinesFor(track: Track): LockLines | null {
  const lyrics = useLyricsStore.getState()
  if (lyrics.trackId === track.id && lyrics.status === 'ready') return linesOf(lyrics.sheet)
  return found.get(track.id) ?? null
}

/**
 * Find the lines for these songs, one at a time in the background, and call
 * `onFound` once if any turned up — the cue to send the engine a new plan.
 */
export function findLockLines(tracks: Track[], onFound: () => void): void {
  const wanted = tracks.filter((t) => !found.has(t.id))
  if (busy || wanted.length === 0) return
  busy = true
  void (async () => {
    let any = false
    for (const track of wanted) {
      const sheet = await localLyricSheet(track, false).catch(() => null)
      const lines = linesOf(sheet)
      found.set(track.id, lines)
      if (lines) any = true
    }
    while (found.size > KEEP) {
      const oldest = found.keys().next().value
      if (oldest === undefined) break
      found.delete(oldest)
    }
    busy = false
    if (any) onFound()
  })()
}
