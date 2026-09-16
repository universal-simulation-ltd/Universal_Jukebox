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
import { setLockArtist } from './nowPlayingNative'
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

/** Called on every playback tick, and when the setting changes. Writes only on a change. */
export function followLockLyrics(track: Track | null, sec: number): void {
  if (!track) return
  let line: string | null = null
  if (settings().lockScreenLyrics) {
    const lyrics = useLyricsStore.getState()
    if (lyrics.trackId !== track.id) lyrics.load(track)
    else if (lyrics.status === 'ready') line = lockScreenLine(lyrics.sheet, sec)
  }
  ms.setArtistLine(track, line)
  setLockArtist(track, line)
}
