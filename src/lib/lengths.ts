// Every track's LENGTH, learnt in the background rather than only by playing it
// (James, 2026-10-08: "can we get the duration before having to play the
// tracks?").
//
// The length is not in the tags — see `Track.durationSec` — and `scan.ts` does
// not decode, so a fresh library showed "—" in every Length column until each
// song had been played once. This walks the tracks that still have none and
// asks the browser's own demuxer: an `<audio preload="metadata">`, never
// played, reads the file's headers (an MP3's Xing/VBRI frame, an MP4's moov,
// FLAC's STREAMINFO) and reports `duration`. Nothing is decoded and nothing is
// heard.
//
// ⚠️ ONE AT A TIME, with a pause between. Chromium caps the media players a
// page may hold, and the two decks in `lib/audio.ts` need theirs — a burst of
// probes could starve the deck of the next song. Each probe's element is
// emptied and its URL released before the next begins.
//
// ⚠️ Written back the same way a played track's length is: `db.setDuration`
// for each, and the store's `tracks` republished in batches, never per track —
// every publish re-sorts every list on screen.

import { releaseTrackUrl, trackUrl } from './trackSource'
import type { SourceFile, Track } from './types'

const PROBE_TIMEOUT_MS = 8000
/** Breathing room between probes, so the walk never crowds playback. */
const GAP_MS = 15
/** How often lengths found so far are shown. */
const PUBLISH_MS = 2500

/** The length of one file in seconds, or null if the browser can't say. */
export function probeLength(file: SourceFile): Promise<number | null> {
  // No media element (the unit tests' Node, a worker): no length, as when
  // the browser can't say. Unguarded, a scan under test threw from here.
  if (typeof Audio === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const el = new Audio()
    el.preload = 'metadata'
    el.muted = true
    let url: string | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    const done = (sec: number | null) => {
      if (timer) clearTimeout(timer)
      el.onloadedmetadata = null
      el.onerror = null
      // Emptied, so the element lets go of its media player now rather than
      // whenever it is collected.
      el.removeAttribute('src')
      el.load()
      releaseTrackUrl(url)
      resolve(sec !== null && Number.isFinite(sec) && sec > 0 ? sec : null)
    }
    el.onloadedmetadata = () => done(el.duration)
    el.onerror = () => done(null)
    timer = setTimeout(() => done(null), PROBE_TIMEOUT_MS)
    try {
      url = trackUrl(file)
      el.src = url
    } catch {
      done(null)
    }
  })
}

export interface LengthsHost {
  tracks(): Track[]
  fileFor(track: Track): SourceFile | null
  /** Show these learnt lengths — one call per batch. */
  publish(learnt: Map<string, number>): void
  /** Keep one learnt length. */
  save(id: string, sec: number): void
}

let running = false
/** Ids tried and failed this session — not tried again until a reload. */
const failed = new Set<string>()

/**
 * Learn the length of every track that has a file and no length yet.
 *
 * Safe to call as often as anything changes: a walk already running picks up
 * new tracks itself, since it asks for the next one each time round.
 */
export async function learnLengths(host: LengthsHost): Promise<void> {
  if (running) return
  running = true
  const learnt = new Map<string, number>()
  let lastPublish = Date.now()
  const flush = () => {
    if (learnt.size === 0) return
    host.publish(new Map(learnt))
    learnt.clear()
    lastPublish = Date.now()
  }
  try {
    for (;;) {
      const track = host.tracks().find((t) => !t.durationSec && !failed.has(t.id) && !learnt.has(t.id) && host.fileFor(t))
      if (!track) break
      const file = host.fileFor(track)
      const sec = file ? await probeLength(file) : null
      if (sec === null) failed.add(track.id)
      else {
        learnt.set(track.id, sec)
        host.save(track.id, sec)
      }
      if (Date.now() - lastPublish >= PUBLISH_MS) flush()
      await new Promise((r) => setTimeout(r, GAP_MS))
    }
  } finally {
    flush()
    running = false
  }
}
