import { create } from 'zustand'
import { AWARDS_MIN_LISTENERS, BusyError, PLAYS_BATCH, lookUpDeep, lookUpPlays, recordFresh, wantsDeep, type HitRecord } from '../lib/hits'
import { allHitRecords, clearHits } from '../lib/library'
import { isExampleTrack } from '../lib/exampleLibrary'
import { useLibraryStore } from './libraryStore'
import { useSettingsStore } from './settingsStore'
import type { Track } from '../lib/types'
import { getT } from '../i18n/runtime.ts'
import { barsHits, nativePlatform } from '../lib/nativeFile'
import { noticeOnPhone, withdrawNotice } from '../lib/trackNotify'

// The Hits shelf's answers, and the slow pass that fills them in. `lib/hits.ts`
// decides what may be asked and how; this decides WHEN: only while the switch
// is on, the shelf is wanted, and a real library is ready — never during a
// trial of the example library.
//
// Two passes, one after the other (James, 2026-11-01): plays for every song,
// `PLAYS_BATCH` at a time, then — only with `hitsDeep` on — ratings and awards
// for the songs the world plays (`wantsDeep`), one song at a time with a pause
// between (`GAP_MS` — MusicBrainz asks for a second). Answers are published
// every `PUBLISH_MS`, never per song, because every publish re-ranks the shelf.

/** Between songs in the ratings-and-awards pass: MusicBrainz asks for no more than one request a second. */
const GAP_MS = 1100
/** Between plays batches: ListenBrainz allows 30 requests in 10 s, and each batch is two. */
const BATCH_GAP_MS = 1000
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

/**
 * How far ratings and awards have got: of the songs the world plays (enough
 * listeners), those asked. Total 0 = nothing for that pass to do.
 */
export function deepProgress(records: ReadonlyMap<string, HitRecord>, tracks: readonly Track[], now = Date.now()): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const track of tracks) {
    const r = records.get(track.id)
    if (!askable(track) || !r || !recordFresh(r, now) || !r.mbid) continue
    if (wantsDeep(r)) total++
    else if (r.deep === true && (r.listeners ?? 0) >= AWARDS_MIN_LISTENERS) {
      done++
      total++
    }
  }
  return { done, total }
}

/**
 * The pass going on now, for a progress line: plays until every song has them,
 * then ratings and awards while `hitsDeep` (`deepOn`) is on. `deep` says which.
 */
export function activeProgress(records: ReadonlyMap<string, HitRecord>, tracks: readonly Track[], deepOn: boolean, now = Date.now()): { done: number; total: number; deep: boolean } {
  const plays = hitsProgress(records, tracks, now)
  if (plays.done < plays.total || !deepOn) return { ...plays, deep: false }
  return { ...deepProgress(records, tracks, now), deep: true }
}

/** Unanswerable this session (a lookup that threw for those songs) — not asked again until a reload. */
const skipped = new Set<string>()
const skippedDeep = new Set<string>()
let controller: AbortController | null = null
let retry: ReturnType<typeof setTimeout> | null = null
/** The kept answers are in — before that, every song would look unasked. */
let loaded = false

function wanted(): boolean {
  const s = useSettingsStore.getState()
  const lib = useLibraryStore.getState()
  return loaded && !barsHits() && !useHitsStore.getState().paused && s.hitsOnline === true && s.hitsShelf && !lib.trying && lib.status === 'ready' && lib.tracks.length > 0
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
  /** True: carry on. False: stop this pass (asked to wait, or offline — `later` is set). */
  const survive = (error: unknown, ids: readonly string[], into: Set<string>): boolean => {
    if (mine.signal.aborted) return false
    if (error instanceof BusyError) {
      later(error.retryAfterMs)
      return false
    }
    // Offline is the ordinary case for a local-file player: stop, come back.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      later(RETRY_MS)
      return false
    }
    for (const id of ids) into.add(id)
    return true
  }
  try {
    // 1. Plays, `PLAYS_BATCH` songs at a time.
    for (;;) {
      if (mine.signal.aborted || !wanted()) return
      const now = Date.now()
      const { records } = useHitsStore.getState()
      const batch = useLibraryStore
        .getState()
        .tracks.filter((t) => askable(t) && !skipped.has(t.id) && !found.has(t.id) && !recordFresh(records.get(t.id), now))
        .slice(0, PLAYS_BATCH)
      if (batch.length === 0) break
      try {
        for (const record of await lookUpPlays(batch, mine.signal)) found.set(record.id, record)
      } catch (error) {
        if (!survive(error, batch.map((t) => t.id), skipped)) return
      }
      if (Date.now() - lastPublish >= PUBLISH_MS) flush()
      await new Promise((r) => setTimeout(r, BATCH_GAP_MS))
    }
    flush()
    // 2. Ratings and awards, once asked for, one song at a time.
    for (;;) {
      if (mine.signal.aborted || !wanted() || useSettingsStore.getState().hitsDeep !== true) return
      const now = Date.now()
      const records = new Map([...useHitsStore.getState().records, ...found])
      const due = (r: HitRecord | undefined): r is HitRecord => !!r && recordFresh(r, now) && wantsDeep(r)
      const track = useLibraryStore.getState().tracks.find((t) => askable(t) && !skippedDeep.has(t.id) && due(records.get(t.id)))
      const record = track && records.get(track.id)
      if (!track || !due(record)) break
      try {
        found.set(track.id, await lookUpDeep(record, track, mine.signal))
      } catch (error) {
        if (!survive(error, [track.id], skippedDeep)) return
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

// iPhone/iPad (`barsHits`): answers kept from an earlier build stay unread, so
// no plays line, rating or award shows anywhere.
void (barsHits() ? Promise.resolve([]) : allHitRecords()).then((list) => {
  // Anything learnt before the stored answers arrived wins: it is newer.
  useHitsStore.setState({ records: new Map([...list.map((r) => [r.id, r] as const), ...useHitsStore.getState().records]) })
  loaded = true
  kick()
})

useSettingsStore.subscribe((now, before) => {
  if (now.hitsOnline !== before.hitsOnline || now.hitsShelf !== before.hitsShelf || now.hitsDeep !== before.hitsDeep) kick()
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
  const { done, total } = away ? activeProgress(useHitsStore.getState().records, useLibraryStore.getState().tracks, useSettingsStore.getState().hitsDeep === true) : { done: 0, total: 0 }
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
