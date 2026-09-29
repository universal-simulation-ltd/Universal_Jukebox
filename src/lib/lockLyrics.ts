// "Lyrics on the lock screen": the line being sung takes the ARTIST's place in
// the lock screen's now-playing entry, line by line (James, 2026-09-16: "a
// widget that keeps showing the lyrics around the device when locked or out of
// app" — this is the first of the shapes offered, chosen with "make it an option
// that's default not on").
//
// ⚠️ THE ARTIST'S LINE, NOT THE TITLE'S. The title is what tells you which song
// it is; the artist is the line least missed for the length of a song. Between
// lines — the intro, an instrumental break, a sheet with no timings, a song with
// no lyrics — the artist comes back.
//
// ⚠️ TWO WRITERS, BOTH TOLD. The Media Session's metadata is what the browser,
// Chrome on Android and WebKit's own iPhone entry show; the iPhone app's own
// entry (`nowPlayingNative.ts`, mode `own`) keeps a copy of the artist that its
// keeper puts back, so it has to hear the line too or it would undo it within
// a second and a half.
//
// ⚠️ THE LYRICS ARE LOOKED UP WITHOUT THE PANEL. With this on, every song's
// words are found as it goes on (`lyricsStore.load`) — from the file, and from
// lrclib.net only if that is ALSO switched on; this never widens what the
// network setting allows.

import { activeLine, type LyricSheet } from './lyrics'
import * as ms from './mediaSession'
import { liveActivityOn, setLiveLyric, setLockArtist } from './nowPlayingNative'
import { useLyricsStore } from '../stores/lyricsStore'
import { settings } from '../stores/settingsStore'
import type { Track } from './types'

/** The line to show at `sec`, or null to show the artist. */
export function lockScreenLine(sheet: LyricSheet | null, sec: number): string | null {
  if (!sheet?.synced) return null
  const at = activeLine(sheet.lines, sec)
  if (at < 0) return null
  const text = sheet.lines[at].text.trim()
  return text === '' ? null : text
}

/**
 * The line AFTER the one at `sec` that has words in it — the Live Activity
 * draws it faintly under the sung one. Null at the end, and whenever there is
 * no sung line (an intro has nothing to follow).
 */
export function nextLockScreenLine(sheet: LyricSheet | null, sec: number): string | null {
  if (!sheet?.synced) return null
  const at = activeLine(sheet.lines, sec)
  if (at < 0 || sheet.lines[at].text.trim() === '') return null
  for (let i = at + 1; i < sheet.lines.length; i++) {
    const text = sheet.lines[i].text.trim()
    if (text !== '') return text
  }
  return null
}

/**
 * Called on every playback tick, and when either setting changes. Writes only on a change.
 *
 * ⚠️ TWO SWITCHES, ONE LOOK-UP. "Lyrics on the lock screen" puts the line in
 * the artist's place; the iPhone's Live Activity shows it under the song. Either
 * one on is reason to find each song's words as it starts — and the artist's
 * line is changed ONLY by the first, so turning on the Live Activity alone
 * leaves the lock screen's own entry saying who is singing.
 */
export function followLockLyrics(track: Track | null, sec: number): void {
  if (!track) return
  const onLockScreen = settings().lockScreenLyrics
  const inActivity = liveActivityOn()
  let line: string | null = null
  let next: string | null = null
  if (onLockScreen || inActivity) {
    const lyrics = useLyricsStore.getState()
    if (lyrics.trackId !== track.id) lyrics.load(track)
    else if (lyrics.status === 'ready') {
      line = lockScreenLine(lyrics.sheet, sec)
      next = nextLockScreenLine(lyrics.sheet, sec)
    }
  }
  ms.setArtistLine(track, onLockScreen ? line : null)
  setLockArtist(track, onLockScreen ? line : null)
  setLiveLyric(line, next)
}
