// "About this track": what Wikipedia says about the song on the deck, and about
// whoever is singing it (James, 2026-09-13: "an about this track feature where
// you click it and it gives you some info. E.g. This is a cover song of the
// original by X in XXXX and was top of the charts for X weeks").
//
// ⚠️ THE SECOND FILE IN THIS APP THAT TOUCHES THE NETWORK. `lrclib.ts` is the
// first, and the four rules at the top of that file hold here the same way:
//
//   1. **OFF by default.** `settings().aboutOnline` is false until somebody
//      turns it on, beside a sentence saying what it sends.
//   2. **Browser straight to en.wikipedia.org, never through us.** No key, so
//      no server, so nobody at UNI·SIM holds a log of what anyone listens to.
//   3. **Only the song's title and the artist's name.** Not the album, the
//      path, the library, or anything that identifies the person or device.
//   4. **Asked once per track.** The answer — "nothing found" included — goes
//      in the `about` store (`library.ts`).
//
// ⚠️ WIKIPEDIA ALONE, NOT MUSICBRAINZ AS WELL. The plan was MusicBrainz to pin
// down the exact song and Wikipedia for its story. Measured on 2026-09-13,
// MusicBrainz did not earn a second recipient of anybody's listening: half its
// answers were "busy" (503), its `cover` flag was empty on two famous covers
// ("Twist and Shout" by the Beatles, "Hallelujah" by Jeff Buckley), and its
// many re-releases made "first released" say 2023 for a 1963 recording.
// Wikipedia's own search, filtered as below, found the right article for every
// song tried — the covers included, whose articles sit under the ORIGINAL
// artist and say so in their first lines, which is the fact James asked for.
//
// ⚠️ A WRONG ARTICLE IS WORSE THAN NONE, the rule lyrics already live by. So a
// song's article counts only if its opening mentions this artist — or "Hurt"
// by anyone at all would be told the Nine Inch Nails story — and an artist's
// page only if it lands on a page with that name, about a musician. See
// `pickSong` and `pickArtist`, both pure and tested.

import { getAboutRecord, putAboutRecord, type AboutRecord, type WikiPage } from './library'
import { searchTitle } from './lrclib'
import type { Track } from './types'

export type { WikiPage }

const API = 'https://en.wikipedia.org/w/api.php'
const TIMEOUT_MS = 8_000
export const CACHE_VERSION = 1
/** A "nothing found" is asked again after three days — the lyrics rule. */
export const NONE_TTL_MS = 3 * 24 * 60 * 60 * 1000
/** An answer is refreshed after ninety days: articles get edited, songs don't. */
export const FOUND_TTL_MS = 90 * 24 * 60 * 60 * 1000
/** Paragraphs kept from each article's opening section. */
const MAX_PARAGRAPHS = 6

/** How an artist's page is usually titled when their name alone is taken. */
const SUFFIXES = ['', ' (band)', ' (musician)', ' (singer)', ' (rapper)', ' (group)']
/** Words that say an article's opening is about a song. */
const SONG = /\b(song|single|ballad|anthem|hymn)\b/i
/** A "(…)" naming something that is not the song: "Imagine (John Lennon album)". */
const NOT_A_SONG =
  /\b(album|EP|film|soundtrack|musical|opera|novel|book|TV|series|video|tour|band|musician|singer|group|rapper)\b/i
/** Words that say an article's opening is about a musician. */
const MUSIC =
  /\b(band|singer|musician|rapper|songwriter|composer|group|duo|trio|DJ|producer|vocalist|guitarist|pianist|drummer|orchestra|ensemble|recording artist)\b/i

export type AboutLookup =
  | { kind: 'found'; song: WikiPage | null; artist: WikiPage | null }
  /** Asked, and Wikipedia has nothing for this song or this artist. */
  | { kind: 'none' }
  /** Not asked: the lookup is off, and nothing was asked before. */
  | { kind: 'off' }
  /** No artist on the track, so there is no sensible question to ask. */
  | { kind: 'untagged' }
  | { kind: 'error'; message: string }

/**
 * What Wikipedia says about this track — from the cache if it was asked
 * before, and from Wikipedia if not and `allowNetwork`.
 *
 * `allowNetwork` is passed in, as in `onlineLyrics`, so that this file holds
 * no opinion about WHEN it may run; the store does.
 */
export async function aboutTrack(track: Track, allowNetwork: boolean, signal?: AbortSignal): Promise<AboutLookup> {
  const cached = await getAboutRecord(track.id).catch(() => null)
  if (cached && cacheUsable(cached, Date.now())) {
    return cached.song || cached.artist ? { kind: 'found', song: cached.song, artist: cached.artist } : { kind: 'none' }
  }
  if (!allowNetwork) return { kind: 'off' }

  const artist = track.artist ?? track.albumArtist
  if (!artist || !track.title) return { kind: 'untagged' }

  try {
    const [song, who] = await Promise.all([findSong(track.title, artist, signal), findArtist(artist, signal)])
    await remember({ id: track.id, song, artist: who, at: Date.now(), v: CACHE_VERSION })
    return song || who ? { kind: 'found', song, artist: who } : { kind: 'none' }
  } catch (error) {
    // Offline is the ordinary case for a local-file player, not a fault.
    const message =
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'No connection, so nothing could be looked up.'
        : error instanceof HttpError
          ? error.message
          : 'Couldn’t reach Wikipedia.'
    return { kind: 'error', message }
  }
}

/**
 * Is a cached answer still worth showing? Pure, so the rule is tested.
 *
 * Only this version's records; an answer for ninety days, a "nothing found"
 * for three.
 */
export function cacheUsable(record: AboutRecord, now: number): boolean {
  if (record.v !== CACHE_VERSION) return false
  const found = record.song !== null || record.artist !== null
  return now - record.at < (found ? FOUND_TTL_MS : NONE_TTL_MS)
}

// ── The two questions ────────────────────────────────────────────────────────

async function findSong(title: string, artist: string, signal?: AbortSignal): Promise<WikiPage | null> {
  const song = searchTitle(title).replace(/"/g, '')
  const body = await ask(
    {
      generator: 'search',
      gsrsearch: `"${song}" ${clean(artist)} song`,
      gsrlimit: '6',
      prop: 'extracts|pageprops',
      exintro: '1',
      explaintext: '1',
      exlimit: '6',
      ppprop: 'disambiguation',
    },
    signal,
  )
  const page = pickSong(pagesOf(body), song, artist)
  return page ? toWikiPage(page) : null
}

async function findArtist(artist: string, signal?: AbortSignal): Promise<WikiPage | null> {
  const names = artistNames(artist)
  const pageParams = {
    prop: 'extracts|pageprops|pageimages',
    exintro: '1',
    explaintext: '1',
    exlimit: '20',
    ppprop: 'disambiguation',
    piprop: 'thumbnail',
    pithumbsize: '240',
    pilimit: '20',
  }
  // First by the titles an artist's page is given — cheaper than a search, and
  // exact: "Queen" is `Queen (band)`, not a search result about a drummer.
  const asked = artistTitles(names)
  const byTitle = await ask({ titles: asked.join('|'), ...pageParams }, signal)
  const direct = pickArtist(byTitle, names, asked)
  if (direct) return toWikiPage(direct)
  // Then a search restricted to titles carrying the name: "Bush" is
  // `Bush (British band)`, which no suffix above guesses.
  const searched = await ask(
    { generator: 'search', gsrsearch: `intitle:"${names[0]}" band OR singer OR musician OR rapper`, gsrlimit: '6', ...pageParams },
    signal,
  )
  const found = pickArtistFromSearch(pagesOf(searched), names)
  return found ? toWikiPage(found) : null
}

// ── Choosing, pure ───────────────────────────────────────────────────────────

/** One page of a MediaWiki `formatversion=2` answer — only what is read. */
export interface Page {
  title: string
  index?: number
  missing?: boolean
  extract?: string
  pageprops?: Record<string, string>
  thumbnail?: { source: string }
}

/**
 * The article about this song, among a search's results — or null.
 *
 * A candidate must: not be a disambiguation page; carry the song's own title
 * once any "(…)" is taken off; have a "(…)" that says song or single, or names
 * the artist, or none at all (so not "(album)", "(EP)" or "(film)"); open by
 * calling itself a song; and mention the artist, in its title or its opening.
 * Of those, the search's own order decides.
 */
export function pickSong(pages: Page[], song: string, artist: string): Page | null {
  const want = normalizeName(song)
  const who = artistNames(artist).map(normalizeName).filter(Boolean)
  const mentions = (text: string) => who.some((name) => ` ${normalizeName(text)} `.includes(` ${name} `))
  for (const page of [...pages].sort(bySearchOrder)) {
    if (page.missing || isDisambiguation(page)) continue
    if (normalizeName(baseTitle(page.title)) !== want) continue
    const qualifier = qualifierOf(page.title)
    // ⚠️ Naming the artist is not enough on its own: "Imagine (John Lennon
    // album)" names him, and an album's opening talks about its songs. A "(…)"
    // that does not say song or single must also not say what else it is.
    if (qualifier && !/\b(song|single)\b/i.test(qualifier) && (NOT_A_SONG.test(qualifier) || !mentions(qualifier))) {
      continue
    }
    const extract = page.extract ?? ''
    if (!SONG.test(extract.slice(0, 400))) continue
    if (!mentions(qualifier) && !mentions(extract)) continue
    return page
  }
  return null
}

/**
 * The artist's page, from a lookup of the titles in `asked` — or null.
 *
 * ⚠️ Where each asked title LANDS is checked, not just that it landed. A
 * redirect can carry a name somewhere else entirely: "Prince (band)" redirects
 * to `The Revolution (band)`, his backing band, which is a real band page and
 * would otherwise have been the answer for Prince.
 */
export function pickArtist(body: unknown, names: string[], asked: string[]): Page | null {
  const query = (body as { query?: { pages?: Page[]; normalized?: Hop[]; redirects?: Hop[] } } | null)?.query
  if (!query?.pages) return null
  const hop = (list: Hop[] | undefined) => new Map((list ?? []).map((h) => [h.from, h.to]))
  const normalized = hop(query.normalized)
  const redirects = hop(query.redirects)
  const byTitle = new Map(query.pages.map((p) => [p.title, p]))
  for (const title of asked) {
    const once = normalized.get(title) ?? title
    const page = byTitle.get(redirects.get(once) ?? once)
    if (page && isArtistPage(page, names)) return page
  }
  return null
}

/** The same test, over a search's results, in the search's order. */
export function pickArtistFromSearch(pages: Page[], names: string[]): Page | null {
  return [...pages].sort(bySearchOrder).find((page) => isArtistPage(page, names)) ?? null
}

interface Hop {
  from: string
  to: string
}

function isArtistPage(page: Page, names: string[]): boolean {
  if (page.missing || isDisambiguation(page)) return false
  const base = normalizeName(baseTitle(page.title))
  if (!names.some((name) => normalizeName(name) === base)) return false
  return MUSIC.test((page.extract ?? '').slice(0, 300))
}

/**
 * The artist as written, then — for "A feat. B", "A & B", "A, B" — A alone.
 *
 * ⚠️ The full name is always tried FIRST, because "&" and "," are also how
 * bands are named: "Simon & Garfunkel" and "Earth, Wind & Fire" are pages of
 * their own, and splitting them first would find Paul Simon and the Earth.
 */
export function artistNames(artist: string): string[] {
  const full = clean(artist)
  const lead = full.split(/\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|x)\s+|\s*[,&;/]\s*|\s+and\s+/i)[0]?.trim() ?? ''
  return lead && normalizeName(lead) !== normalizeName(full) ? [full, lead] : [full]
}

/** Every title an artist's page might have, most likely first. */
export function artistTitles(names: string[]): string[] {
  return names.flatMap((name) => SUFFIXES.map((suffix) => name + suffix))
}

/**
 * A name reduced to what two spellings of it share: case, accents, "&" for
 * "and", punctuation and a leading "The" all gone. "The Beatles" and
 * "Beatles, The" still differ — nobody's tags say the second.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘"“”.,!?:;()[\]{}/\\–—-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '')
}

/** "Imagine (song)" → "Imagine". */
export function baseTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** "Imagine (song)" → "song"; "" when there is none. */
function qualifierOf(title: string): string {
  return /\(([^)]*)\)\s*$/.exec(title)?.[1] ?? ''
}

function isDisambiguation(page: Page): boolean {
  return page.pageprops !== undefined && 'disambiguation' in page.pageprops
}

function bySearchOrder(a: Page, b: Page): number {
  return (a.index ?? 99) - (b.index ?? 99)
}

/**
 * An article's opening as paragraphs, tidied.
 *
 * Plain-text extracts keep the holes where pronunciations and footnotes were:
 * "Queen  are  a British rock band", "( born …)", "( )". Those are closed up.
 */
export function paragraphs(extract: string): string[] {
  return extract
    .split(/\n+/)
    .map((p) =>
      p
        .replace(/\(\s*[;,]?\s*\)/g, '')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s+([,.;:])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 0)
    .slice(0, MAX_PARAGRAPHS)
}

function toWikiPage(page: Page): WikiPage {
  return {
    title: page.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    paragraphs: paragraphs(page.extract ?? ''),
    thumbnail: page.thumbnail?.source ?? null,
  }
}

function pagesOf(body: unknown): Page[] {
  const pages = (body as { query?: { pages?: unknown } } | null)?.query?.pages
  return Array.isArray(pages) ? (pages as Page[]) : []
}

/** Characters a MediaWiki title may not hold; "|" also separates titles. */
function clean(text: string): string {
  return text.replace(/[|#<>[\]{}]/g, '').replace(/\s+/g, ' ').trim()
}

// ── The request ──────────────────────────────────────────────────────────────

class HttpError extends Error {}

/**
 * One MediaWiki query. `origin=*` is what lets a page on another origin read
 * the answer — the anonymous form of CORS, with no cookies sent either way.
 */
async function ask(params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
    ...params,
  })
  // `no-referrer`: Wikipedia is told the question, not which page asked it.
  const response = await fetch(`${API}?${query}`, {
    signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new HttpError(`Wikipedia returned ${response.status}.`)
  return response.json()
}

/** Writing to the cache must never fail a lookup that worked. */
async function remember(record: AboutRecord): Promise<void> {
  try {
    await putAboutRecord(record)
  } catch { /* storage disabled — it still shows now, it just asks again next time */ }
}
