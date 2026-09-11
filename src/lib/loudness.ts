import { NativeFile } from './nativeFile'
import { pluginRegistered } from './nativePlugins'
import type { SourceFile } from './types'

// "Stable volume" (James, 2026-09-11: "keeps the volume at in a sensible min /
// max range so a track doesn't blast your ears off").
//
// Each song's loudness is measured ONCE — a gated RMS over a minute from a
// quarter of the way in — cached, and a loud song is turned DOWN to a common
// level through its `<audio>` element's volume (`audio.setLevel`).
//
// ⚠️ DOWN ONLY. A quiet song is left as it is: turning up past an element's
// volume of 1 needs a Web Audio graph, and the iPhone app deliberately runs
// none (see the clips in `crackle.ts`). The target is a quiet-ish −16 dB RMS, so
// most modern masters (−8 to −12) come down to meet older ones, which is what
// "doesn't blast your ears off" asks for.
//
// Measured natively in the iPhone app (`ios/App/App/LoudnessPlugin.swift`),
// which can decode any file it can play. Elsewhere, the first part of the file
// is decoded in the page; a file that will not decode from its start (an M4A
// with its index at the end) is simply left at full level.

/** The level every song is brought down to, as RMS dBFS. */
export const TARGET_DB = -16
/** Never quieter than this — a mis-measured song must stay audible. */
export const MIN_GAIN = 0.3
const KEY = 'jukebox:loudness'
const NAME = 'JukeboxLoudness'
/** How much of a file the page decodes, when it has to. */
const WEB_BYTES = 12 * 1024 * 1024

/** The volume factor that brings a song measured at `rmsDb` to the target. */
export function gainForDb(rmsDb: number): number {
  return Math.max(MIN_GAIN, Math.min(1, 10 ** ((TARGET_DB - rmsDb) / 20)))
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

function remember(id: string, rmsDb: number): void {
  cache()[id] = Math.round(rmsDb * 10) / 10
  if (saveTimer !== null) return
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    try {
      localStorage.setItem(KEY, JSON.stringify(cache()))
    } catch { /* storage full or off — measured again next time */ }
  }, 1000)
}

/** The factor for a song already measured, or null. */
export function cachedGain(trackId: string): number | null {
  const db = cache()[trackId]
  return typeof db === 'number' && Number.isFinite(db) ? gainForDb(db) : null
}

/** Measure a song (once; concurrent asks share the work). Null if it cannot be. */
export function measureGain(trackId: string, file: SourceFile): Promise<number | null> {
  const known = cachedGain(trackId)
  if (known !== null) return Promise.resolve(known)
  let work = inFlight.get(trackId)
  if (!work) {
    work = measureDb(file)
      .then((db) => {
        if (db === null) return null
        remember(trackId, db)
        return gainForDb(db)
      })
      .catch(() => null)
      .finally(() => inFlight.delete(trackId))
    inFlight.set(trackId, work)
  }
  return work
}

async function measureDb(file: SourceFile): Promise<number | null> {
  if (file instanceof NativeFile && pluginRegistered(NAME)) {
    const { registerPlugin } = await import('@capacitor/core')
    const plugin = registerPlugin<{ measure(o: { uri: string }): Promise<{ rmsDb: number }> }>(NAME)
    const { rmsDb } = await plugin.measure({ uri: file.uri })
    return Number.isFinite(rmsDb) ? rmsDb : null
  }
  const Offline =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!Offline) return null
  const bytes = await file.slice(0, Math.min(file.size, WEB_BYTES)).arrayBuffer()
  const buffer = await new Offline(1, 1, 44100).decodeAudioData(bytes)
  return gatedRmsDb(buffer)
}

/**
 * The same gated RMS the native side computes: 400 ms blocks over up to a
 * minute from a quarter of the way in, blocks under −50 dB left out.
 */
export function gatedRmsDb(buffer: {
  sampleRate: number
  numberOfChannels: number
  length: number
  getChannelData(channel: number): Float32Array
}): number | null {
  const rate = buffer.sampleRate
  const window = Math.min(buffer.length, Math.floor(rate * 60))
  const from = buffer.length > window ? Math.min(Math.floor(buffer.length * 0.25), buffer.length - window) : 0
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const block = Math.max(1, Math.floor(rate * 0.4))
  let sum = 0
  let count = 0
  let gated = 0
  let blocks = 0
  for (let i = from; i < from + window; i++) {
    let v = 0
    for (const data of channels) v += data[i]
    v /= channels.length || 1
    sum += v * v
    count++
    if (count === block) {
      const meanSquare = sum / block
      if (meanSquare > 1e-5) {
        gated += meanSquare
        blocks++
      }
      sum = 0
      count = 0
    }
  }
  return blocks > 0 ? 10 * Math.log10(gated / blocks) : null
}
