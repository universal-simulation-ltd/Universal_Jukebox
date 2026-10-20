// Whether each song carries words (`Track.hasLyrics`), learnt in the background
// for the tracks a scan could not say about (James, 2026-10-20: "an icon on
// each album / track to show if there's lyrics available").
//
// A folder scan answers as it reads the tags (`scan.ts`). Left over: libraries
// scanned before that, and the iPhone's Music library, whose songs are read
// through iOS — there each one is asked of the library (`AppleMusicPlugin.lyrics`,
// item, then asset, then every metadata format). Nothing goes online.
//
// ⚠️ The same shape as `lengths.ts`, for the same reasons: one track at a time
// with a pause between, so playback is never crowded; written back per batch,
// and the store's `tracks` republished per batch, never per track — every
// publish re-sorts every list on screen. A track it cannot ask about yet (no
// file until a folder is allowed back) is left unknown and tried again the
// next time the files change.

import type { Track } from './types'

/** Breathing room between songs. */
const GAP_MS = 20
/** How often answers found so far are shown and kept. */
const PUBLISH_MS = 3000

export interface PresenceHost {
  tracks(): Track[]
  /** True / false, or null when it cannot be asked about now. */
  check(track: Track): Promise<boolean | null>
  /** Show and keep these answers — one call per batch. */
  publish(found: Map<string, boolean>): void
}

let running = false
/** Asked and unanswerable this session — not asked again until a reload. */
const skipped = new Set<string>()

/** Learn it for every track that doesn't have it. Safe to call as often as anything changes. */
export async function learnLyricsPresence(host: PresenceHost): Promise<void> {
  if (running) return
  running = true
  const found = new Map<string, boolean>()
  let lastPublish = Date.now()
  const flush = () => {
    if (found.size === 0) return
    host.publish(new Map(found))
    found.clear()
    lastPublish = Date.now()
  }
  try {
    for (;;) {
      const track = host.tracks().find((t) => t.hasLyrics === undefined && !skipped.has(t.id) && !found.has(t.id))
      if (!track) break
      let answer: boolean | null = null
      try {
        answer = await host.check(track)
      } catch {
        answer = null
      }
      if (answer === null) skipped.add(track.id)
      else found.set(track.id, answer)
      if (Date.now() - lastPublish >= PUBLISH_MS) flush()
      await new Promise((r) => setTimeout(r, GAP_MS))
    }
  } finally {
    flush()
    running = false
  }
}

/** Forget the unanswerable ones — a folder was allowed back, so they may answer now. */
export function retryLyricsPresence(): void {
  skipped.clear()
}
