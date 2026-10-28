// The Hits shelf: your songs, ranked by how they do in the WORLD, not on this
// device (James, 2026-10-28: "a 'Hits' shelf top of jukebox shelves … the
// ranking of songs, of top played, best rated, most awarded", then "these are
// trying to automatically rank by things like worldwide streaming numbers,
// things that are universal as opposed to generated from the user", and "it's
// ok to use online resources if we have it as an optional setting").
//
// Three open sources, none of which needs a key — so no server, so nobody at
// UNI·SIM holds a log of anybody's library:
//
//   • **Top played — ListenBrainz** (MetaBrainz). Matches the title and artist
//     to a MusicBrainz recording, then gives its plays and listeners worldwide.
//     ⚠️ The match is the LABS `acr-lookup`, not `/1/metadata/lookup/`: that
//     one answers 401 without a user token since (at least) 2026-10-28, and a
//     token can't ship in an app. Labs is MetaBrainz's experimental host (the
//     same mapping data); if it moves, the shelf just stops filling (any error
//     ends the pass, and it tries again later). MusicBrainz's own search is no
//     stand-in: "Bohemian Rhapsody" by Queen is 228 equal-scored recordings,
//     mostly live, and the album one isn't in the first 25.
//   • **Best rated — MusicBrainz**, the community's 0–5 rating of that same
//     recording. Asked by its id alone, so it learns nothing ListenBrainz
//     wasn't already told. Sparse: most songs have no votes, and then it
//     simply doesn't count.
//   • **Most awarded — Wikidata**, the song's "award received" (P166), found
//     through its English Wikipedia article with `pickSong`, the matcher
//     "About this track" already trusts.
//
// ⚠️ THE FOURTH FILE IN THIS APP THAT TOUCHES THE NETWORK, and the first that
// asks about the whole library rather than the one song in front of you. The
// rules `lrclib.ts` and `aboutTrack.ts` set hold here, with one more:
//
//   1. **OFF by default.** `settings().hitsOnline` is false until somebody
//      turns it on, beside a sentence saying what it sends.
//   2. **Browser straight to each service, never through us.**
//   3. **Only the song's title and the artist's name** (and, after that, ids
//      the services gave back). Not the album, path, or anything about the
//      person or device. `no-referrer` and no cookies.
//   4. **Asked once per track**, answers — "nothing known" included — kept in
//      the `hits` store (`library.ts`) and asked again only after `TTL_MS`.
//   5. **One song at a time, in the background, slowly** (`GAP_MS`), and
//      never for the example library's made-up songs. MusicBrainz asks for no
//      more than one request a second; a 429 or 503 is a pause, not a fault.
//
// ⚠️ THE AWARDS ARE ONLY ASKED FOR SONGS THE WORLD ALREADY PLAYS
// (`AWARDS_MIN_LISTENERS`). Two more requests per song across a library of
// thousands of album tracks would be thousands of questions to Wikipedia for
// answers that are almost all "none".
//
// The answers are read by the pure `parse*` functions below; `hits.live.test.ts`
// asks the real services (first run 2026-10-28, which is how the 401 above was
// found) — run it after touching any of them.

import { putHitRecord, type HitRecord } from './library'
import { searchTitle } from './lrclib'
import { artistNames, pickSong, type Page } from './aboutTrack'
import type { Track } from './types'

export type { HitRecord }

const LISTENBRAINZ = 'https://api.listenbrainz.org/1'
const LISTENBRAINZ_LABS = 'https://labs.api.listenbrainz.org'
const MUSICBRAINZ = 'https://musicbrainz.org/ws/2'
const WIKIPEDIA = 'https://en.wikipedia.org/w/api.php'
const WIKIDATA = 'https://www.wikidata.org/w/api.php'
const TIMEOUT_MS = 10_000
export const CACHE_VERSION = 1
/** Asked again after ninety days: songs climb, and new ones get matched. */
export const TTL_MS = 90 * 24 * 60 * 60 * 1000
/** Listeners worldwide before a song's awards are worth asking about. */
export const AWARDS_MIN_LISTENERS = 50
/** Songs on the shelf, at most. */
export const HITS_MAX = 20
/** A song needs this many plays worldwide, or an award, to be on it. */
export const HITS_MIN_LISTENS = 100
/** Votes before a rating counts — one person's 5 is an opinion. */
export const RATING_MIN_VOTES = 2

// ── Ranking, pure ────────────────────────────────────────────────────────────

/**
 * One number for "how big is this song". Pure, so the weights are tested.
 *
 * Plays are counted in orders of magnitude (a song with ten million plays is
 * not a thousand times the hit one with ten thousand is, for a shelf); each
 * award adds half an order, up to six; a rating with enough votes moves it by
 * up to 0.8 either way, around a middling 3.
 */
export function hitScore(r: Pick<HitRecord, 'listens' | 'rating' | 'votes' | 'awards'>): number {
  const plays = Math.log10(1 + Math.max(0, r.listens ?? 0))
  const awards = 0.5 * Math.min(6, Math.max(0, r.awards ?? 0))
  const rated = r.rating !== null && (r.votes ?? 0) >= RATING_MIN_VOTES ? (r.rating - 3) * 0.4 : 0
  return plays + awards + rated
}

/** Whether a song has done enough in the world to be on the shelf at all. */
export function isHit(r: HitRecord): boolean {
  return (r.listens ?? 0) >= HITS_MIN_LISTENS || (r.awards ?? 0) > 0
}

/**
 * The Hits shelf: the library's songs, biggest first. Pure.
 *
 * ⚠️ One per song TITLE AND ARTIST: the same hit on the album, a best-of and a
 * live record is one recording to ListenBrainz, and would otherwise fill the
 * shelf three times over. The first in the library's own order stays.
 */
export function rankHits(records: ReadonlyMap<string, HitRecord>, tracks: readonly Track[]): Track[] {
  const seen = new Set<string>()
  return tracks
    .map((track) => ({ track, record: records.get(track.id) }))
    .filter((e): e is { track: Track; record: HitRecord } => !!e.record && isHit(e.record))
    .map((e) => ({ ...e, score: hitScore(e.record) }))
    .sort((a, b) => b.score - a.score)
    .filter(({ track, record }) => {
      const key = record.mbid ?? `${searchTitle(track.title).toLowerCase()}\u0000${(track.artist ?? track.albumArtist ?? '').toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, HITS_MAX)
    .map(({ track }) => track)
}

/** Is a kept answer still good? */
export function recordFresh(record: HitRecord | undefined, now: number): boolean {
  return !!record && record.v === CACHE_VERSION && now - record.at < TTL_MS
}

// ── Reading the answers, pure ────────────────────────────────────────────────

/** ListenBrainz labs `GET /acr-lookup/json` → the recording's MBID, or null (`[]` when nothing matched). */
export function parseLookup(body: unknown): string | null {
  const mbid = (Array.isArray(body) ? (body[0] as { recording_mbid?: unknown } | undefined) : null)?.recording_mbid
  return typeof mbid === 'string' && mbid.length > 0 ? mbid : null
}

/** ListenBrainz `POST /1/popularity/recording` → plays and listeners for this MBID (nulls when it has none). */
export function parsePopularity(body: unknown, mbid: string): { listens: number | null; listeners: number | null } {
  const rows = Array.isArray(body) ? (body as Array<Record<string, unknown>>) : []
  const row = rows.find((r) => r && r.recording_mbid === mbid)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
  return { listens: num(row?.total_listen_count), listeners: num(row?.total_user_count) }
}

/** MusicBrainz `GET /ws/2/recording/{mbid}?inc=ratings&fmt=json` → the rating and its votes. */
export function parseRating(body: unknown): { rating: number | null; votes: number | null } {
  const r = (body as { rating?: { value?: unknown; 'votes-count'?: unknown } } | null)?.rating
  const votes = typeof r?.['votes-count'] === 'number' ? r['votes-count'] : null
  const rating = typeof r?.value === 'number' && votes ? r.value : null
  return { rating, votes }
}

/** Wikidata `wbgetentities&props=claims` → how many awards (P166) the item received. Each award once. */
export function countAwards(body: unknown, qid: string): number {
  const claims = (body as { entities?: Record<string, { claims?: Record<string, unknown> }> } | null)?.entities?.[qid]?.claims
  const p166 = claims?.P166
  if (!Array.isArray(p166)) return 0
  const awards = new Set<string>()
  for (const claim of p166 as Array<{ rank?: string; mainsnak?: { datavalue?: { value?: { id?: unknown } } } }>) {
    if (claim?.rank === 'deprecated') continue
    const id = claim?.mainsnak?.datavalue?.value?.id
    if (typeof id === 'string') awards.add(id)
  }
  return awards.size
}

// ── Asking, one song ─────────────────────────────────────────────────────────

/** A service said "slow down" (429, 503): stop the pass and come back later. */
export class BusyError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('busy')
  }
}

/**
 * Everything the three services know about this song, kept, and returned.
 *
 * Throws `BusyError` when asked to wait, and anything else when offline — the
 * caller stops and tries later, and nothing half-asked is kept.
 */
export async function lookUpHit(track: Track, signal?: AbortSignal): Promise<HitRecord> {
  const artist = track.artist ?? track.albumArtist
  const empty: HitRecord = { id: track.id, mbid: null, listens: null, listeners: null, rating: null, votes: null, awards: null, at: Date.now(), v: CACHE_VERSION }
  if (!artist || !track.title) return keep(empty)

  const title = searchTitle(track.title)
  const lookup = await getJson(`${LISTENBRAINZ_LABS}/acr-lookup/json?${new URLSearchParams({ artist_credit_name: artist, recording_name: title })}`, signal)
  const mbid = parseLookup(lookup)
  if (!mbid) return keep(empty)

  const popularity = parsePopularity(await postJson(`${LISTENBRAINZ}/popularity/recording`, { recording_mbids: [mbid] }, signal), mbid)
  // A rating that cannot be had now is not worth losing the rest for.
  const rating = await getJson(`${MUSICBRAINZ}/recording/${encodeURIComponent(mbid)}?inc=ratings&fmt=json`, signal)
    .then(parseRating)
    .catch((e: unknown) => {
      if (signal?.aborted) throw e
      return { rating: null, votes: null }
    })
  const awards = (popularity.listeners ?? 0) >= AWARDS_MIN_LISTENERS ? await awardsFor(title, artist, signal) : null
  return keep({ ...empty, mbid, ...popularity, ...rating, awards })
}

/** The song's Wikipedia article, by `pickSong`; then its Wikidata item's awards. */
async function awardsFor(title: string, artist: string, signal?: AbortSignal): Promise<number> {
  const song = title.replace(/"/g, '')
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
    generator: 'search',
    gsrsearch: `"${song}" ${artistNames(artist)[0]} song`,
    gsrlimit: '6',
    prop: 'extracts|pageprops',
    exintro: '1',
    explaintext: '1',
    exlimit: '6',
    ppprop: 'disambiguation|wikibase_item',
  })
  const body = (await getJson(`${WIKIPEDIA}?${query}`, signal)) as { query?: { pages?: Page[] } } | null
  const page = pickSong(body?.query?.pages ?? [], song, artist)
  const qid = page?.pageprops?.wikibase_item
  if (!qid) return 0
  const claims = await getJson(
    `${WIKIDATA}?${new URLSearchParams({ action: 'wbgetentities', ids: qid, props: 'claims', format: 'json', origin: '*' })}`,
    signal,
  )
  return countAwards(claims, qid)
}

/** Writing to the cache must never fail a lookup that worked. */
async function keep(record: HitRecord): Promise<HitRecord> {
  try {
    await putHitRecord(record)
  } catch { /* storage off — it shows now, and is asked again next time */ }
  return record
}

// ── The requests ─────────────────────────────────────────────────────────────

const getJson = (url: string, signal?: AbortSignal) => request(url, { method: 'GET' }, signal)

const postJson = (url: string, body: unknown, signal?: AbortSignal) =>
  request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, signal)

async function request(url: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
  // `no-referrer` and `omit`: each service is told the question, not which
  // page asked it or who is asking.
  // A timeout of its own beside the caller's signal — by hand, because
  // `AbortSignal.any` is newer than the oldest iPhones this app runs on.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const stop = () => controller.abort()
  signal?.addEventListener('abort', stop)
  if (signal?.aborted) controller.abort()
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, referrerPolicy: 'no-referrer', credentials: 'omit' })
    if (response.status === 429 || response.status === 503) {
      // ListenBrainz says when in `X-RateLimit-Reset-In`, the rest in `Retry-After`.
      const seconds = Number(response.headers.get('X-RateLimit-Reset-In') ?? response.headers.get('Retry-After'))
      throw new BusyError(Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 600) * 1000 : 60_000)
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', stop)
  }
}
