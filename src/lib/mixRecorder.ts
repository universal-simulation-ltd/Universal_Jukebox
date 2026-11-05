// mixRecorder.ts — a recording from the Mix tab, saved as a new song in the
// library (James, 2026-11-05: "add a record button so they can save a new
// track from their mixing").
//
// `mixer.ts` collects what the decks played (its `mix-tap` node, 16-bit
// stereo) and hands it here when Record is pressed again. This writes it into
// the app's own music folder — on the iPhone, Files → Universal Jukebox →
// Mixes — as a WAV whose tags put it on a "Mixes" album, then reads that
// folder again so the song appears in the library like any other.
//
// ⚠️ WAV, NOT A RECORDER'S M4A/WEBM. `MediaRecorder` would make a smaller
// file, but what it writes is a stream with no length in its header, which a
// library scan (and seeking) reads badly, and it differs per engine. The PCM
// the decks played is exact, the same everywhere and plays in everything.
// About 11 MB a minute, which is why a recording stops itself at
// `MAX_RECORD_SEC`.
//
// ⚠️ THE IPHONE ONLY, for now (`recordingSupported`): it is the platform with
// a music folder of the app's own to save into (`hasOwnMusicFolder`). Android
// reads folders the person chose, which this app cannot write into yet.
//
// ⚠️ WRITTEN IN PIECES. A file through Capacitor's bridge is a base64 string;
// one string for a ten-minute mix would be ~150 MB in the WebView at once. The
// header is written first and the audio appended a few MB at a time.

import { base64Of, hasOwnMusicFolder } from './nativeFile'
import { wavHeader } from './wavFile'
import type { Track } from './types'
import { getT } from '../i18n/runtime.ts'
import { useLibraryStore } from '../stores/libraryStore'

/** The longest recording, after which it stops and saves by itself. */
export const MAX_RECORD_SEC = 15 * 60
/** Anything shorter is a slip of the finger, not a mix. */
export const MIN_RECORD_SEC = 1

/** The folder in the app's own music folder that recordings go into. */
export const MIX_FOLDER = 'Mixes'

/** How much audio goes over the bridge in one write. */
const WRITE_BYTES = 4 * 1024 * 1024

export function recordingSupported(): boolean {
  return hasOwnMusicFolder()
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Mixes/Mix 2026-11-05 14.32.07.wav": in time order, and never the same twice. */
export function mixFileName(at: Date): string {
  const day = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  const time = `${pad(at.getHours())}.${pad(at.getMinutes())}.${pad(at.getSeconds())}`
  return `${MIX_FOLDER}/Mix ${day} ${time}.wav`
}

/**
 * The song's name: the records that were played into it, "Song A × Song B" (a
 * third or more as "+ 2"), or the time it was made when none were.
 */
export function mixTitle(heard: Track[], at: Date, untitled: (when: string) => string, locale?: string): string {
  const titles = [...new Set(heard.map((t) => t.title.trim()).filter(Boolean))]
  if (titles.length === 0) {
    const when = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(at)
    return untitled(when)
  }
  const shown = titles.slice(0, 2).join(' × ')
  return titles.length > 2 ? `${shown} + ${titles.length - 2}` : shown
}

export interface Recording {
  /** Interleaved 16-bit stereo, in the order it was played. */
  chunks: Int16Array[]
  sampleRate: number
  /** The songs that were played on a deck while it recorded. */
  heard: Track[]
  at: Date
}

/** Seconds of audio in a recording. */
export function recordedSec(chunks: Int16Array[], sampleRate: number): number {
  return chunks.reduce((n, c) => n + c.length, 0) / 2 / sampleRate
}

/** Save a recording into the library. Resolves to the song's title. */
export async function saveRecording(rec: Recording): Promise<string> {
  const t = getT()
  const title = mixTitle(rec.heard, rec.at, (when) => t('native.mix_rec_untitled', { when }), t.locale)
  const album = t('native.mix_rec_album')
  const dataBytes = rec.chunks.reduce((n, c) => n + c.byteLength, 0)
  const header = wavHeader(rec.sampleRate, 2, dataBytes, {
    title,
    artist: album,
    album,
    date: `${rec.at.getFullYear()}-${pad(rec.at.getMonth() + 1)}-${pad(rec.at.getDate())}`,
  })
  const path = mixFileName(rec.at)

  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const directory = Directory.Documents
  await Filesystem.mkdir({ path: MIX_FOLDER, directory, recursive: true }).catch(() => {
    /* Already there: `recursive` still throws when the leaf exists. */
  })
  try {
    await Filesystem.writeFile({ path, directory, data: await base64Of(new Blob([header as BlobPart])) })
    let batch: Int16Array[] = []
    let size = 0
    const send = async () => {
      if (batch.length === 0) return
      await Filesystem.appendFile({ path, directory, data: await base64Of(new Blob(batch as BlobPart[])) })
      batch = []
      size = 0
    }
    for (const chunk of rec.chunks) {
      batch.push(chunk)
      size += chunk.byteLength
      if (size >= WRITE_BYTES) await send()
    }
    await send()
  } catch (err) {
    // Half a file is worse than none: it would scan as a song that stops short.
    await Filesystem.deleteFile({ path, directory }).catch(() => {})
    throw err
  }
  // The new song into the library: the app's own folder read again.
  await useLibraryStore.getState().scanNativeFolder()
  return title
}
