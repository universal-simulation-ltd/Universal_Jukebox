import { create } from 'zustand'
import { BusyError, lookUpHit, recordFresh, type HitRecord } from '../lib/hits'
import { allHitRecords, clearHits } from '../lib/library'
import { isExampleTrack } from '../lib/exampleLibrary'
import { useLibraryStore } from './libraryStore'
import { useSettingsStore } from './settingsStore'
import type { Track } from '../lib/types'

// The Hits shelf's answers, and the slow pass that fills them in. `lib/hits.ts`
// decides what may be asked and how; this decides WHEN: only while the switch
// is on, the shelf is wanted, and a real library is ready — never during a
// trial of the example library.
//
// ⚠️ The shape of `lyricsPresence.ts`: one song at a time with a pause
// between (`GAP_MS` — MusicBrainz asks for a second), and the answers
// published per batch, never per song, because every publish re-ranks the shelf.

/** Between songs: MusicBrainz asks for no more than one request a second. */
const GAP_MS = 1100
/** How often answers found so far are shown. */
const PUBLISH_MS = 4000
/** Offline, or a service down: try again after this. */
const RETRY_MS = 5 * 60 * 1000

interface HitsState {
  records: ReadonlyMap<string, HitRecord>
  /** The pass is running now. */
  busy: boolean
  /** Settings ▸ "Forget them": every answer gone, asked again while the switch is on. */
  forget(): Promise<void>
}

export const useHitsStore = create<HitsState>((set) => ({
  records: new Map(),
  busy: false,
  async forget() {
    stop()
    await clearHits()
    skipped.clear()
    set({ records: new Map() })
    kick()
  },
}))

/** Whether this song is one to ask about: a title, an artist, and not one of the example's made-up songs. */
export function askable(track: Track): boolean {
  return !!track.title && !!(track.artist ?? track.albumArtist) && !isExampleTrack(track)
}

/** Unanswerable this session (a lookup that threw for that song alone) — not asked again until a reload. */
const skipped = new Set<string>()
let controller: AbortController | null = null
let retry: ReturnType<typeof setTimeout> | null = null
/** The kept answers are in — before that, every song would look unasked. */
let loaded = false

function wanted(): boolean {
  const s = useSettingsStore.getState()
  const lib = useLibraryStore.getState()
  return loaded && s.hitsOnline === true && s.hitsShelf && !lib.trying && lib.status === 'ready' && lib.tracks.length > 0
}

function stop(): void {
  controller?.abort()
  controller = null
  if (retry) clearTimeout(retry)
  retry = null
}

/** Start the pass if it should run and isn't; stop it if it shouldn't. Safe to call as often as anything changes. */
function kick(): void {
  if (!wanted()) {
    stop()
    return
  }
  if (controller || retry) return
  void pass()
}

function later(ms: number): void {
  if (retry) clearTimeout(retry)
  retry = setTimeout(() => {
    retry = null
    kick()
  }, ms)
}

async function pass(): Promise<void> {
  const mine = new AbortController()
  controller = mine
  useHitsStore.setState({ busy: true })
  const found = new Map<string, HitRecord>()
  let lastPublish = Date.now()
  const flush = () => {
    if (found.size === 0) return
    useHitsStore.setState({ records: new Map([...useHitsStore.getState().records, ...found]) })
    found.clear()
    lastPublish = Date.now()
  }
  try {
    for (;;) {
      if (mine.signal.aborted || !wanted()) break
      const now = Date.now()
      const { records } = useHitsStore.getState()
      const track = useLibraryStore
        .getState()
        .tracks.find((t) => askable(t) && !skipped.has(t.id) && !found.has(t.id) && !recordFresh(records.get(t.id), now))
      if (!track) break
      try {
        found.set(track.id, await lookUpHit(track, mine.signal))
      } catch (error) {
        if (mine.signal.aborted) break
        if (error instanceof BusyError) {
          later(error.retryAfterMs)
          break
        }
        // Offline is the ordinary case for a local-file player: stop, come back.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          later(RETRY_MS)
          break
        }
        skipped.add(track.id)
      }
      if (Date.now() - lastPublish >= PUBLISH_MS) flush()
      await new Promise((r) => setTimeout(r, GAP_MS))
    }
  } finally {
    flush()
    if (controller === mine) controller = null
    useHitsStore.setState({ busy: false })
  }
}

// ── Wiring ───────────────────────────────────────────────────────────────────

void allHitRecords().then((list) => {
  // Anything learnt before the stored answers arrived wins: it is newer.
  useHitsStore.setState({ records: new Map([...list.map((r) => [r.id, r] as const), ...useHitsStore.getState().records]) })
  loaded = true
  kick()
})

useSettingsStore.subscribe((now, before) => {
  if (now.hitsOnline !== before.hitsOnline || now.hitsShelf !== before.hitsShelf) kick()
})
useLibraryStore.subscribe((now, before) => {
  if (now.trying !== before.trying || now.status !== before.status || now.tracks !== before.tracks) kick()
})
if (typeof window !== 'undefined') window.addEventListener('online', () => kick())
