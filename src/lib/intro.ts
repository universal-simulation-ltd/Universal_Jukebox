import { NativeFile } from './nativeFile'
import { pluginRegistered } from './nativePlugins'
import type { SourceFile } from './types'

// How long a song's opening stays quiet — for the crossfade INTO it (James,
// 2026-09-11: "the crossfade is quite harsh sometimes … in case the next track
// has a slow start" — "Crossfade for slow intros: yes").
//
// A song that opens with a few quiet bars used to arrive under a crossfade of
// the usual length, so the song ending was gone before the new one's music
// was. Now, when the next song starts quietly, the crossfade begins that much
// EARLIER (`maybeStartEarlyCrossfade`), and the song ending holds at full
// through the quiet, then crosses over as the music arrives — the DJ's trick
// of starting the next record under the last one.
//
// The quiet opening is measured once per song — in the iPhone app natively
// (`LoudnessPlugin.intro`, which can decode anything it can play), elsewhere
// by decoding the file's first few megabytes in the page — and remembered.
// The decision is made HERE, from the levels either side returns, so both
// platforms judge a song alike.

const KEY = 'jukebox:intro'
const NAME = 'JukeboxLoudness'
/** Enough of a file for its first twenty seconds in any format a browser decodes. */
const WEB_BYTES = 4 * 1024 * 1024
/** How much of the opening is looked at. */
export const OPENING_SEC = 20
/** The blocks it is measured in. */
export const BLOCK_SEC = 0.2
/** A quiet start shorter than this is just a breath — no hold. */
export const INTRO_MIN = 1
/** The longest a song ending is held for the next one's quiet start. */
export const INTRO_HOLD_MAX = 6
/** "Quiet" is this far under the loudest moment of the opening. */
const QUIET_DB = 10
/** An opening quieter than this throughout is silence, not a quiet start. */
const SILENT_DB = -50

/**
 * Seconds until the opening first comes within `QUIET_DB` of its loudest
 * block. An opening that is silent throughout counts as all of it.
 */
export function introFromBlocks(blocksDb: readonly number[], blockSec: number): number {
  if (blocksDb.length === 0) return 0
  const loudest = Math.max(...blocksDb)
  if (!Number.isFinite(loudest) || loudest < SILENT_DB) return Math.round(blocksDb.length * blockSec * 10) / 10
  const first = blocksDb.findIndex((db) => db >= loudest - QUIET_DB)
  return Math.round(Math.max(0, first) * blockSec * 10) / 10
}

/** The level of each block of a decoded opening (mono), as dBFS. */
export function blocksFromBuffer(
  buffer: { sampleRate: number; numberOfChannels: number; length: number; getChannelData(channel: number): Float32Array },
  seconds = OPENING_SEC,
  blockSec = BLOCK_SEC,
): number[] {
  const rate = buffer.sampleRate
  const end = Math.min(buffer.length, Math.floor(rate * seconds))
  const block = Math.max(1, Math.floor(rate * blockSec))
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const out: number[] = []
  for (let start = 0; start + block <= end; start += block) {
    let sum = 0
    for (let i = start; i < start + block; i++) {
      let v = 0
      for (const data of channels) v += data[i]
      v /= channels.length || 1
      sum += v * v
    }
    out.push(10 * Math.log10(Math.max(sum / block, 1e-10)))
  }
  return out
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

/** Remember a song's quiet opening, in seconds. */
export function rememberIntro(trackId: string, seconds: number): void {
  cache()[trackId] = Math.round(seconds * 10) / 10
  if (saveTimer !== null) return
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    try {
      localStorage.setItem(KEY, JSON.stringify(cache()))
    } catch { /* storage full or off — measured again next time */ }
  }, 1000)
}

/** A song's quiet opening, if it has been measured. */
export function cachedIntro(trackId: string): number | null {
  const value = cache()[trackId]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** How long a crossfade into this song holds the one ending — 0 for a song that starts straight away. */
export function introHold(trackId: string): number {
  const intro = cachedIntro(trackId)
  return intro !== null && intro >= INTRO_MIN ? Math.min(intro, INTRO_HOLD_MAX) : 0
}

/** Measure a song's opening (once; concurrent asks share the work). Null if it cannot be. */
export function measureIntro(trackId: string, file: SourceFile): Promise<number | null> {
  const known = cachedIntro(trackId)
  if (known !== null) return Promise.resolve(known)
  let work = inFlight.get(trackId)
  if (!work) {
    work = openingBlocks(file)
      .then((blocks) => {
        if (!blocks || blocks.length === 0) return null
        const seconds = introFromBlocks(blocks, BLOCK_SEC)
        rememberIntro(trackId, seconds)
        return seconds
      })
      .catch(() => null)
      .finally(() => inFlight.delete(trackId))
    inFlight.set(trackId, work)
  }
  return work
}

async function openingBlocks(file: SourceFile): Promise<number[] | null> {
  if (file instanceof NativeFile && pluginRegistered(NAME)) {
    const { registerPlugin } = await import('@capacitor/core')
    const plugin = registerPlugin<{ intro(o: { uri: string; seconds: number; block: number }): Promise<{ blocksDb: number[] }> }>(NAME)
    const { blocksDb } = await plugin.intro({ uri: file.uri, seconds: OPENING_SEC, block: BLOCK_SEC })
    return Array.isArray(blocksDb) ? blocksDb.filter((db) => Number.isFinite(db)) : null
  }
  const Offline =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!Offline) return null
  const bytes = await file.slice(0, Math.min(file.size, WEB_BYTES)).arrayBuffer()
  const buffer = await new Offline(1, 1, 44100).decodeAudioData(bytes)
  return blocksFromBuffer(buffer)
}
