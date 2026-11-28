// bpmDetect.ts — the Mix tab's tempo finder: a cache per track, and the estimate
// itself run in a Worker so a deck that is playing never stutters.
//
// Everything happens on the device. The excerpt is a copy of samples already
// decoded for the deck; nothing is sent anywhere.
//
// The cache is remembered between launches (small: a number or "none" per
// song) and keyed by `Track.id`, which is path + size + mtime, so an edited file
// is worked out again. It is the finished answer that is kept, "unknown"
// included, so a speech track is not tried again every time it goes on a deck.

import { estimateBpm } from './bpm'

const KEY = 'jukebox.bpm.v1'
const MAX_ENTRIES = 3000

/** null = tried, no steady tempo. */
const cache = new Map<string, number | null>()
let loaded = false

function load(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const obj = JSON.parse(raw) as Record<string, number | null>
    for (const [id, v] of Object.entries(obj)) if (v === null || (typeof v === 'number' && v > 0)) cache.set(id, v)
  } catch {
    /* a private window, or a damaged entry: start empty */
  }
}

function save(): void {
  try {
    // Oldest out first (a Map keeps insertion order).
    while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch {
    /* storage full or blocked: the memory cache still works */
  }
}

/** The remembered answer: a tempo, null for "no steady tempo", undefined for "not worked out yet". */
export function cachedBpm(trackId: string): number | null | undefined {
  load()
  return cache.get(trackId)
}

export function rememberBpm(trackId: string, bpm: number | null): void {
  load()
  cache.delete(trackId)
  cache.set(trackId, bpm)
  save()
}

/** Forget everything (tests). */
export function forgetAllBpm(): void {
  cache.clear()
  loaded = true
}

let worker: Worker | null | undefined
let ids = 0
const waiting = new Map<number, (bpm: number | null) => void>()

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    const w = new Worker(new URL('./bpmWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<{ id: number; bpm: number | null }>) => {
      waiting.get(e.data.id)?.(e.data.bpm)
      waiting.delete(e.data.id)
    }
    w.onerror = () => {
      // The worker could not run: answer what waits, and do the work inline from now on.
      worker = null
      for (const done of waiting.values()) done(null)
      waiting.clear()
    }
    worker = w
  } catch {
    worker = null
  }
  return worker
}

/**
 * The tempo of a mono excerpt, off the main thread where the browser allows it
 * (otherwise in a timeout, which still lets the audio thread carry on: it is a
 * second of work, not a stall). The excerpt's buffer is handed over.
 */
export function detectBpm(samples: Float32Array, sampleRate: number): Promise<number | null> {
  const w = getWorker()
  if (w) {
    const id = ++ids
    return new Promise((resolve) => {
      waiting.set(id, resolve)
      w.postMessage({ id, samples, sampleRate }, [samples.buffer])
    })
  }
  return new Promise((resolve) => setTimeout(() => resolve(estimateBpm(samples, sampleRate).bpm), 0))
}
