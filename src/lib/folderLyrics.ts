// folderLyrics.ts — lyrics files that sit beside the songs.
//
// A tool such as LRCGET saves timed lyrics as a `.lrc` with the song's own
// name (`Album/Song.mp3` → `Album/Song.lrc`). When a folder is scanned, each
// one found is read and kept with the song's other lyrics (a `'folder'` record
// in the lyrics store), so it plays from then on without the file having to be
// reachable again — the same reason the library itself is kept.
//
// Order of trust (`stores/lyricsStore.ts`): a lyrics file the person picked
// for one song in the app (`'upload'`), then this, then the song's own tags,
// then lrclib if that is switched on. A picked file is never overwritten here,
// and a `.lrc` that has gone from the folder takes its record with it on the
// next scan.
//
// Reading the person's own files only: nothing leaves the device.

import { deleteLyricRecord, getLyricRecord, putLyricRecord } from './library'
import { CACHE_VERSION } from './lrclib'
import { parseLyrics } from './lyrics'
import { readSlice, withoutExtension } from './scan'
import type { SourceFile } from './types'
import type { Track } from './types'

/** Bigger than any real lyrics file; anything past it is not one. */
const MAX_BYTES = 512 * 1024

/** Read a `.lrc` as text: UTF-8, with a byte-order mark dropped. Null if it isn't lyrics. */
export async function readLyricsFile(file: SourceFile): Promise<string | null> {
  if (file.size === 0 || file.size > MAX_BYTES) return null
  const bytes = await readSlice(file, 0, file.size)
  const text = new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '')
  const sheet = parseLyrics(text, 'upload')
  return sheet && sheet.lines.some((line) => line.text.trim() !== '') ? text : null
}

/**
 * Keep the `.lrc` files found in a scan as the songs' lyrics, and drop the
 * kept ones whose file has gone. Returns how many songs now have one.
 * One song at a time, so a big library doesn't hold the main thread.
 */
export async function adoptFolderLyrics(tracks: readonly Track[], found: ReadonlyMap<string, SourceFile>): Promise<number> {
  let adopted = 0
  for (const track of tracks) {
    const file = found.get(withoutExtension(track.path))
    try {
      const kept = await getLyricRecord(track.id)
      if (kept?.source === 'upload') continue
      if (!file) {
        if (kept?.source === 'folder') await deleteLyricRecord(track.id)
        continue
      }
      const raw = await readLyricsFile(file)
      if (raw === null) continue
      if (kept?.source !== 'folder' || kept.raw !== raw) {
        await putLyricRecord({ id: track.id, raw, at: Date.now(), source: 'folder', v: CACHE_VERSION })
      }
      adopted++
    } catch {
      // An unreadable file, or storage switched off: that song just keeps
      // whatever lyrics it had.
    }
  }
  return adopted
}
