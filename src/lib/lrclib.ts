// The one file in this app that touches the network.
//
// ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE. The app's first promise is
// "nothing is uploaded, there is no account", and every other file keeps it
// absolutely. This one qualifies it, so the qualification has to be small
// enough to state in a sentence — which is what the Settings page says:
//
//   "Looking a track up sends its artist, title, album and length to
//    lrclib.net. Nothing else, and nothing at all until you turn this on."
//
// Four rules follow from that, and none of them are negotiable:
//
//   1. **OFF by default.** `settings().lyricsOnline` is false until somebody
//      chooses otherwise. A local-first app that quietly starts talking to a
//      server has broken its promise even if the server is a nice one.
//   2. **Browser straight to lrclib.net, never through us.** There is no key to
//      hide, so there is no reason for a Worker of ours to sit in the middle —
//      and if one did, UNI·SIM would hold a log of what everybody listens to,
//      which is a worse version of the thing being avoided. This is also why
//      LRCLIB and not Musixmatch: a licensed API needs a secret, a secret needs
//      a server, and the server is the part that cannot be made private.
//   3. **Only what a lookup needs.** Artist, title, album, duration. Not the
//      path, not the library, not an identifier for the person or the device.
//   4. **Asked once per track.** The answer — including "there is no sheet for
//      this" — goes in the `lyrics` store, so a track that has been looked up
//      is never looked up again. See `library.ts`.
//
// On the licensing: LRCLIB is a free, key-less, community-contributed database,
// and it is what open-source players use because the licensed alternatives are
// commercial contracts. It is not a licensed source. James took that call
// knowingly on 2026-09-09; the note is here so that the next person to open
// this file knows it was a call and not an oversight.

import { parseLyrics, type LyricSheet } from './lyrics'
import { getLyricRecord, putLyricRecord, type LyricRecord } from './library'
import type { Track } from './types'

const ENDPOINT = 'https://lrclib.net/api/get'
/** The fuzzy half — see `searchLrclib`. */
const SEARCH = 'https://lrclib.net/api/search'

/**
 * ⚠️ A "not found" is remembered for THREE DAYS, then asked again. It used to be
 * remembered for ever, so one miss — a lookup made before the fuzzy search
 * existed, a server having a bad minute — meant the song never got its words.
 * Found lyrics and "instrumental" are still kept for good.
 */
export const NONE_TTL_MS = 3 * 24 * 60 * 60 * 1000
export const CACHE_VERSION = 2
/** A result whose length is further off than this is a different recording. */
const MAX_OFF_SEC = 15

/**
 * LRCLIB asks clients to identify themselves, and it is the polite thing to do
 * for a free service being used by an app somebody else runs.
 *
 * ⚠️ A custom header makes this a preflighted request, and a preflight that
 * fails takes the whole feature with it — so `ask()` retries once WITHOUT the
 * header before giving up. Being unable to say who we are is worth a degraded
 * request; it is not worth no lyrics.
 */
const CLIENT_HEADER = 'Universal Jukebox (https://opensource.unisim.co.uk/jukebox)'

/** How long to wait before calling it a failure. */
const TIMEOUT_MS = 8_000

export type OnlineLookup =
  | { kind: 'found'; sheet: LyricSheet }
  /** Looked up, and nobody has transcribed this one. */
  | { kind: 'none' }
  /** Looked up, and LRCLIB says the track has no words. */
  | { kind: 'instrumental' }
  /** Not enough tags on the track to ask a sensible question. */
  | { kind: 'untagged' }
  | { kind: 'error'; message: string }

/**
 * The sheet for one track, from the cache if it has been asked for before and
 * from LRCLIB if not.
 *
 * `allowNetwork` is passed in rather than read from the settings store so that
 * this file has no opinion about when it is allowed to run — the caller holds
 * that, and a test can drive both halves without touching localStorage.
 */
export async function onlineLyrics(
  track: Track,
  allowNetwork: boolean,
  signal?: AbortSignal,
): Promise<OnlineLookup> {
  const cached = await getLyricRecord(track.id)
  if (cached && cacheUsable(cached, Date.now())) {
    if (cached.instrumental) return { kind: 'instrumental' }
    if (cached.raw === null) return { kind: 'none' }
    const sheet = parseLyrics(cached.raw, cached.source === 'upload' ? 'upload' : 'online')
    if (sheet) return { kind: 'found', sheet }
    return { kind: 'none' }
  }
  if (!allowNetwork) return { kind: 'none' }

  const artist = track.artist ?? track.albumArtist
  // ⚠️ Both, or nothing is sent. A lookup on a title alone is a worse question
  // — LRCLIB matches on the pair — and "Track 04" from an untagged rip would
  // send a filename to a server to no possible purpose.
  if (!artist || !track.title) return { kind: 'untagged' }

  const query = new URLSearchParams({ artist_name: artist, track_name: track.title })
  if (track.album) query.set('album_name', track.album)
  // Duration is how LRCLIB tells two recordings of the same song apart, so it
  // is worth sending — but it is only known once a track has been played (see
  // `Track.durationSec`), and an absent one just widens the match.
  if (track.durationSec) query.set('duration', String(Math.round(track.durationSec)))

  try {
    const response = await ask(`${ENDPOINT}?${query}`, signal)
    // ⚠️ THE EXACT LOOKUP MISSES SONGS LRCLIB HAS. `/api/get` matches the
    // length to within about two seconds, and a remaster, a compilation copy or
    // a slightly different rip is enough to miss — asked for "Piano Man" at 345
    // seconds instead of 339 it answers 503, which this used to report as an
    // error (James, 2026-09-10: "It showed as couldn't find lyrics but it's a
    // well known song"). A miss, or a server error, goes to the fuzzy search,
    // which picks the closest match itself.
    let found: { raw: string | null; instrumental: boolean } | null = null
    if (response.ok) {
      found = readResponse(await response.json())
    } else if (response.status === 404 || response.status >= 500) {
      found = await searchLrclib(artist, track.title, track.durationSec, signal)
      if (!found && response.status >= 500) {
        return { kind: 'error', message: `lrclib.net returned ${response.status}.` }
      }
      if (!found) {
        await remember({ id: track.id, raw: null, at: Date.now(), v: CACHE_VERSION })
        return { kind: 'none' }
      }
    } else {
      return { kind: 'error', message: `lrclib.net returned ${response.status}.` }
    }
    if (found.instrumental) {
      await remember({ id: track.id, raw: null, instrumental: true, at: Date.now(), v: CACHE_VERSION })
      return { kind: 'instrumental' }
    }
    if (!found.raw) {
      await remember({ id: track.id, raw: null, at: Date.now(), v: CACHE_VERSION })
      return { kind: 'none' }
    }
    await remember({ id: track.id, raw: found.raw, at: Date.now(), v: CACHE_VERSION })
    const sheet = parseLyrics(found.raw, 'online')
    return sheet ? { kind: 'found', sheet } : { kind: 'none' }
  } catch (error) {
    if (signal?.aborted) return { kind: 'none' }
    // ⚠️ Offline is the ordinary case for this app, not an exception — it is a
    // local-file player and it is expected to work on a train. Say so plainly
    // rather than showing a stack trace's worth of nothing.
    const message = typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'No connection, so nothing could be looked up.'
      : `Couldn’t reach lrclib.net${error instanceof Error && error.name === 'TimeoutError' ? ' in time' : ''}.`
    return { kind: 'error', message }
  }
}

/**
 * One request, with the client header, retried once without it.
 *
 * See `CLIENT_HEADER`. The retry is deliberately only for a thrown error and
 * not for an HTTP status: a 500 is the server answering, and asking again
 * without a header will get the same 500.
 */
async function ask(url: string, signal?: AbortSignal): Promise<Response> {
  const withTimeout = { signal: signal ?? AbortSignal.timeout(TIMEOUT_MS) }
  try {
    return await fetch(url, { ...withTimeout, headers: { 'Lrclib-Client': CLIENT_HEADER } })
  } catch (error) {
    if (signal?.aborted) throw error
    return await fetch(url, withTimeout)
  }
}

/**
 * What LRCLIB sends back, defensively.
 *
 * The shape is `{ syncedLyrics, plainLyrics, instrumental }` and any of them
 * may be null. Synced wins when both are present, because a timed sheet is the
 * entire reason for going online rather than reading the tag.
 */
function readResponse(body: unknown): { raw: string | null; instrumental: boolean } {
  if (!body || typeof body !== 'object') return { raw: null, instrumental: false }
  const record = body as Record<string, unknown>
  if (record.instrumental === true) return { raw: null, instrumental: true }
  const synced = typeof record.syncedLyrics === 'string' ? record.syncedLyrics.trim() : ''
  const plain = typeof record.plainLyrics === 'string' ? record.plainLyrics.trim() : ''
  return { raw: synced || plain || null, instrumental: false }
}

/** Writing to the cache must never be able to fail a lookup that succeeded. */
/**
 * Is a cached answer still worth trusting? Pure, so the rule is tested.
 *
 * Anything with words in it, "instrumental", and a person's own uploaded file
 * are kept for good. A "not found" is kept only if it was written by this
 * version of the cache and is less than `NONE_TTL_MS` old.
 */
export function cacheUsable(record: LyricRecord, now: number): boolean {
  if (record.source === 'upload' || record.instrumental || record.raw !== null) return true
  return record.v === CACHE_VERSION && now - record.at < NONE_TTL_MS
}

/**
 * The title to SEARCH with: the song, without a remaster, live or version tag.
 * "Piano Man - 2023 Remaster" and "Piano Man (Live)" are both asked as
 * "Piano Man", and the length then picks the right recording.
 */
export function searchTitle(title: string): string {
  const TAGS = '(remaster|remastered|live|version|edit|mono|stereo|deluxe|bonus|mix|anniversary)'
  return title
    .replace(new RegExp(`\\s*[([][^)\\]]*${TAGS}[^)\\]]*[)\\]]\\s*$`, 'i'), '')
    .replace(new RegExp(`\\s+[-–]\\s+.*${TAGS}.*$`, 'i'), '')
    .trim() || title
}

/**
 * The best of a search's results, or null. Pure, so the choice is tested.
 *
 * Results within a few seconds of the track's own length come first, synced
 * before plain among those; then the rest by how close they are. Anything more
 * than `MAX_OFF_SEC` out is a different recording, and wrong words timed to the
 * wrong song are worse than none.
 */
export function pickBest(
  results: unknown,
  durationSec?: number,
): { raw: string | null; instrumental: boolean } | null {
  if (!Array.isArray(results)) return null
  const scored = results
    .map((result) => {
      const record = (result ?? {}) as Record<string, unknown>
      const length = typeof record.duration === 'number' ? record.duration : null
      return {
        read: readResponse(result),
        off: durationSec && length !== null ? Math.abs(length - durationSec) : 0,
        synced: typeof record.syncedLyrics === 'string' && record.syncedLyrics.trim() !== '',
      }
    })
    .filter((s) => s.read.raw !== null || s.read.instrumental)
    .filter((s) => !durationSec || s.off <= MAX_OFF_SEC)
    .sort((a, b) => Number(a.off > 3) - Number(b.off > 3) || Number(b.synced) - Number(a.synced) || a.off - b.off)
  return scored[0]?.read ?? null
}

async function searchLrclib(
  artist: string,
  title: string,
  durationSec: number | undefined,
  signal?: AbortSignal,
): Promise<{ raw: string | null; instrumental: boolean } | null> {
  try {
    const query = new URLSearchParams({ artist_name: artist, track_name: searchTitle(title) })
    const response = await ask(`${SEARCH}?${query}`, signal)
    if (!response.ok) return null
    return pickBest(await response.json(), durationSec)
  } catch {
    return null
  }
}

async function remember(record: LyricRecord): Promise<void> {
  try {
    await putLyricRecord(record)
  } catch { /* storage disabled — the lookup still worked, it just repeats */ }
}
