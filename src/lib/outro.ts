import { BLOCK_SEC, blocksFromBuffer } from './intro'
import { NativeFile } from './nativeFile'
import { pluginRegistered } from './nativePlugins'
import type { SourceFile } from './types'

// How long a song's ENDING is dead air — for the crossfade OUT of it (James,
// 2026-09-15: "If there's a few blank seconds at the end of the track start the
// crossfade earlier").
//
// `lib/intro.ts` is the same measurement at the other end of the song, and the
// two are deliberately twins: a quiet OPENING on the song arriving holds the
// one ending at full for longer (`introHold`), and a silent CLOSE on the song
// ending starts the whole blend sooner (`outroLead`). Both read the same
// `blocksFromBuffer` so a quiet passage is judged alike wherever it falls.
//
// ⚠️ THE TWO PULL ON DIFFERENT LEVERS, and that is the one thing to get right
// in `maybeStartEarlyCrossfade`. A quiet opening makes the blend LONGER — there
// is real audio in it, it is just soft, so the song ending waits through it. A
// silent close has nothing in it worth hearing, so it makes the blend EARLIER
// and leaves its length alone: the next song is at full by the time the dead
// air would have started, and the dead air is simply never played.
//
// Measured once per song and remembered — natively in the iPhone app
// (`LoudnessPlugin.outro`, which streams the tail), and in the page by decoding
// the last few megabytes of the file.
//
// ⚠️ THE LAST FEW MEGABYTES, NOT THE FILE. `lib/scan.ts` forbids
// `file.arrayBuffer()` outright and it is right to: a whole-file read is the
// out-of-memory crash that header exists to prevent, and "it is only one file"
// is how it comes back. So this is a RANGE read off the back, the mirror of the
// range read off the front that `lib/intro.ts` already does.
//
// What that costs is honest and worth saying: a raw fragment off the back of an
// MP3 or an ADTS-AAC decodes fine, because their frames carry their own
// headers, but a fragment of an M4A, a FLAC or an Ogg does not — those keep the
// index the decoder needs at one end of the container. So in the PAGE a long
// M4A gets no lead and behaves exactly as it did before this existed. A short
// one does: under `WEB_BYTES` the range covers the whole file, index and all.
// The iPhone app has no such gap — `AVAssetReader` seeks properly.

const KEY = 'jukebox:outro'
const NAME = 'JukeboxLoudness'
/** How much of the ending is looked at. */
export const CLOSING_SEC = 20
/** Dead air shorter than this is the song stopping, not a gap worth skipping. */
export const OUTRO_MIN = 1.2
/** The most the blend is ever brought forward. */
export const OUTRO_LEAD_MAX = 8
/** "Quiet" is this far under the loudest moment of the ending. */
const QUIET_DB = 10
/** An ending quieter than this throughout is silence, not a fade. */
const SILENT_DB = -50
/**
 * How much is read off the BACK of a file — the mirror of `intro.ts`'s
 * `WEB_BYTES` off the front, and enough for the closing seconds of anything a
 * browser decodes. A file smaller than this is covered whole by that one range.
 */
const WEB_BYTES = 4 * 1024 * 1024
/**
 * The rate the page decodes at.
 *
 * ⚠️ Not the file's own. `decodeAudioData` resamples to the context's rate, and
 * the whole file has to be decoded to reach its last seconds — at 44.1 kHz a
 * four-minute stereo track is eighty megabytes of Float32 for a measurement
 * that needs none of that detail. 16 kHz is a quarter of it and tells a silent
 * block from a loud one just as well. Safari has historically refused rates
 * outside its own range for an `OfflineAudioContext`, so a refusal falls back.
 */
const DECODE_RATE = 16000

/**
 * Seconds of quiet at the END of the blocks — the mirror of `introFromBlocks`.
 * An ending that is silent throughout counts as all of it.
 */
export function outroFromBlocks(blocksDb: readonly number[], blockSec: number): number {
  if (blocksDb.length === 0) return 0
  const loudest = Math.max(...blocksDb)
  if (!Number.isFinite(loudest) || loudest < SILENT_DB) return Math.round(blocksDb.length * blockSec * 10) / 10
  let last = blocksDb.length - 1
  while (last >= 0 && blocksDb[last] < loudest - QUIET_DB) last--
  return Math.round((blocksDb.length - 1 - last) * blockSec * 10) / 10
}

let measured: Record<string, number> | null = null
let saveTimer: number | null = null
const inFlight = new Map<string, Promise<number | null>>()

function cache(): Record<string, number> {
  if (measured) return measured
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    measured = parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    measured = {}
  }
  return measured
}

/** Remember a song's dead air at the end, in seconds. */
export function rememberOutro(trackId: string, seconds: number): void {
  cache()[trackId] = Math.round(seconds * 10) / 10
  if (saveTimer !== null) return
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    try {
      localStorage.setItem(KEY, JSON.stringify(cache()))
    } catch { /* storage full or off — measured again next time */ }
  }, 1000)
}

/** A song's dead air at the end, if it has been measured. */
export function cachedOutro(trackId: string): number | null {
  const value = cache()[trackId]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** How much earlier the blend out of this song starts — 0 for a song that ends on its music. */
export function outroLead(trackId: string): number {
  const outro = cachedOutro(trackId)
  return outro !== null && outro >= OUTRO_MIN ? Math.min(outro, OUTRO_LEAD_MAX) : 0
}

/** Measure a song's ending (once; concurrent asks share the work). Null if it cannot be. */
export function measureOutro(trackId: string, file: SourceFile): Promise<number | null> {
  const known = cachedOutro(trackId)
  if (known !== null) return Promise.resolve(known)
  let work = inFlight.get(trackId)
  if (!work) {
    work = closingBlocks(file)
      .then((blocks) => {
        if (!blocks || blocks.length === 0) return null
        const seconds = outroFromBlocks(blocks, BLOCK_SEC)
        rememberOutro(trackId, seconds)
        return seconds
      })
      .catch(() => null)
      .finally(() => inFlight.delete(trackId))
    inFlight.set(trackId, work)
  }
  return work
}

async function closingBlocks(file: SourceFile): Promise<number[] | null> {
  if (file instanceof NativeFile && pluginRegistered(NAME)) {
    const { registerPlugin } = await import('@capacitor/core')
    const plugin = registerPlugin<{ outro(o: { uri: string; seconds: number; block: number }): Promise<{ blocksDb: number[] }> }>(NAME)
    const { blocksDb } = await plugin.outro({ uri: file.uri, seconds: CLOSING_SEC, block: BLOCK_SEC })
    return Array.isArray(blocksDb) ? blocksDb.filter((db) => Number.isFinite(db)) : null
  }
  const Offline =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!Offline) return null
  let context: OfflineAudioContext
  try {
    context = new Offline(1, 1, DECODE_RATE)
  } catch {
    context = new Offline(1, 1, 44100)
  }
  const bytes = await file.slice(Math.max(0, file.size - WEB_BYTES), file.size).arrayBuffer()
  const buffer = await context.decodeAudioData(bytes)
  const duration = buffer.length / buffer.sampleRate
  return blocksFromBuffer(buffer, CLOSING_SEC, BLOCK_SEC, Math.max(0, duration - CLOSING_SEC))
}
