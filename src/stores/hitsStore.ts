import { create } from 'zustand'
import { BusyError, lookUpHit, recordFresh, type HitRecord } from '../lib/hits'
import { allHitRecords, clearHits } from '../lib/library'
import { isExampleTrack } from '../lib/exampleLibrary'
import { useLibraryStore } from './libraryStore'
import { useSettingsStore } from './settingsStore'
import type { Track } from '../lib/types'
import { getT } from '../i18n/runtime.ts'
import { nativePlatform } from '../lib/nativeFile'
import { noticeOnPhone, withdrawNotice } from '../lib/trackNotify'

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
/**
 * Paused from the shelf (James, 2026-10-30: "allow the user to pause the
 * download"). Kept on the device until Resume — a pause for being on mobile
 * data should not quietly end at the next launch. Not a setting: it is where
 * this device's lookups got to, not how the app is tuned.
 */
const PAUSED_KEY = 'jukebox:hits-paused'

function readPaused(): boolean {
  try {
    return localStorage.getItem(PAUSED_KEY) === '1'
  } catch {
    return false
  }
}

interface HitsState {
  records: ReadonlyMap<string, HitRecord>
  /** The pass is running now. */
  busy: boolean
  /** Paused from the shelf: nothing is asked until Resume. */
  paused: boolean
  setPaused(paused: boolean): void
  /** Settings ▸ "Forget them": every answer gone, asked again while the switch is on. */
  forget(): Promise<void>
}

export const useHitsStore = create<HitsState>((set) => ({
  records: new Map(),
  busy: false,
  paused: readPaused(),
  setPaused(paused) {
    try {
      if (paused) localStorage.setItem(PAUSED_KEY, '1')
      else localStorage.removeItem(PAUSED_KEY)
    } catch { /* storage off — paused until the app closes */ }
    set({ paused })
    kick()
  },
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

/** How far the pass has got: the songs with a fresh answer, of all those to ask about. */
export function hitsProgress(records: ReadonlyMap<string, HitRecord>, tracks: readonly Track[], now = Date.now()): { done: number; total: number } {
  const asked = tracks.filter(askable)
  return { done: asked.filter((track) => recordFresh(records.get(track.id), now)).length, total: asked.length }
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
  return loaded && !useHitsStore.getState().paused && s.hitsOnline === true && s.hitsShelf && !lib.trying && lib.status === 'ready' && lib.tracks.length > 0
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
    // ⚠️ Only if no newer pass has started: a Resume straight after a Pause
    // starts one while this one is still in its gap between songs.
    if (!controller) useHitsStore.setState({ busy: false })
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

// ── With the app away ───────────────────────────────────────────────────────
// James, 2026-10-30: "check that if they are downloading and minimise the app
// that it continues to download. Ideally with a notification saying it's
// downloading in background".
//
// ⚠️ ON THE IPHONE IT CANNOT CARRY ON. The pass runs in the page, and the page
// stops within a second of the app leaving the screen (probe 3, in
// `ios/App/App/JukeboxEngine.swift`) — music playing or not. It picks up where
// it left off when the app comes back; a card says so, once, as it goes.
// On Android the page goes on while the app is kept alive (the music's own
// service does that while playing), so there the card counts up instead,
// quietly (its own LOW channel, `NotifyPlugin.java`), and goes when the pass
// is done. Either way it goes as soon as the app is back on screen. Only with
// notifications already allowed (`noticeOnPhone`): nothing is asked for here.
let noticed = false
function noticeAway(): void {
  if (typeof document === 'undefined') return
  const away = document.visibilityState === 'hidden' && useHitsStore.getState().busy
  const { done, total } = away ? hitsProgress(useHitsStore.getState().records, useLibraryStore.getState().tracks) : { done: 0, total: 0 }
  if (!away || done >= total) {
    if (noticed) withdrawNotice('hits')
    noticed = false
    return
  }
  const ios = nativePlatform() === 'ios'
  // Once on the iPhone: a second card in the second before the page stops
  // would only alert again.
  if (ios && noticed) return
  const t = getT()
  const counts = { done: t.num(done), total: t.num(total) }
  noticeOnPhone('hits', t('shelves.hits_notice_title'), t(ios ? 'shelves.hits_notice_paused' : 'shelves.hits_notice_progress', counts))
  noticed = true
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', noticeAway)
useHitsStore.subscribe((now, before) => {
  if (noticed && (now.records !== before.records || now.busy !== before.busy)) noticeAway()
})
