// Which tracks have a lyrics file KEPT for them with words in it: an `.lrc`
// found beside the song (`folderLyrics.ts`), one the person added, or one
// looked up on lrclib. The other half of "has lyrics" — the song's own tags —
// is `Track.hasLyrics`; `trackHasLyrics` asks both, for the lyric-sheet mark
// on the lists (James, 2026-10-20: "an icon on each album / track to show if
// there's lyrics available").
//
// ⚠️ A set read from IndexedDB, not a flag copied onto the track: these files
// come and go on their own (a rescan drops a `.lrc` that has gone, Settings
// forgets the downloaded ones), and a copy would go stale. Read again whenever
// `library.ts` says one changed.

import { create } from 'zustand'
import { lyricRecordIds, onLyricRecordsChanged } from './library'
import type { Track } from './types'

export const useLyricRecords = create<{ ids: ReadonlySet<string> }>(() => ({ ids: new Set() }))

let reading = false
let again = false
async function read(): Promise<void> {
  if (reading) {
    again = true
    return
  }
  reading = true
  try {
    do {
      again = false
      const ids = await lyricRecordIds().catch(() => null)
      if (ids) useLyricRecords.setState({ ids })
    } while (again)
  } finally {
    reading = false
  }
}

if (typeof indexedDB !== 'undefined') {
  void read()
  onLyricRecordsChanged(() => void read())
}

/** Whether a track's words are to hand: in the song, or kept for it. */
export function trackHasLyrics(track: Track, kept: ReadonlySet<string>): boolean {
  return track.hasLyrics === true || kept.has(track.id)
}
