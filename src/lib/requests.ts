// Requests: a reminder list of music to get — a song, an album or an artist —
// standing on the Jukebox tab as records waiting to be found (James,
// 2026-09-26: "a requests section, which is a reminder to download a track /
// album / artist in the future … the option to search for the corresponding
// image … and a way to check off the items once they are added to the library
// (could we do this check automatically on next library update?)").
//
// So a request is ticked off BY THE LIBRARY: every time the library settles
// (`requestsStore`), each open request is looked for in it with `findInLibrary`
// and ticked when it is there. A tick can also be given or taken back by hand;
// one taken back by hand stays off (`autoOff`), so a bad match can't keep
// re-ticking itself.
//
// ⚠️ THE THIRD THING IN THIS APP THAT TOUCHES THE NETWORK — `searchArt` below,
// after `lrclib.ts` and `aboutTrack.ts` — and it keeps their rules in its own
// shape:
//
//   1. **Nothing is sent until you tap Search**, beside a sentence saying what
//      goes. There is no setting because there is nothing automatic: no
//      request is ever looked up on its own.
//   2. **Device straight to itunes.apple.com, never through us.** Apple's
//      Search API needs no key and answers any origin (CORS `*`, measured
//      2026-09-26), and so does its artwork CDN.
//
//      ⚠️ BUT NOT TO AN iPHONE'S WEB VIEW (James, 2026-09-27, on the phone:
//      "The search didn't get an answer"). Asked with an iPhone's browser user
//      agent, itunes.apple.com answers 301 to `musics://…` — "open this in the
//      Music app" — and `fetch` can't follow that, so every search failed.
//      The user agent can't be changed from a page. So in the iOS app the
//      search goes through Capacitor's native HTTP (`CapacitorHttp`, built
//      into the bridge): URLSession's own user agent gets the JSON. Android's
//      web view, iPad, desktop and the artwork CDN are all answered normally
//      (checked with curl, 2026-09-27). Safari on an iPhone has no way round
//      it, and `searchArt` says so rather than "check the connection".
//   3. **Only what you typed.** The words in the search box — not the library,
//      not the other requests, nothing about the device.
//   4. **The picture is fetched once**, shrunk and kept on the device with the
//      request, so drawing the shelf never asks Apple for anything.
//
// ⚠️ AN ARTIST HAS NO PICTURE OF THEIR OWN IN ITUNES — the Search API returns
// artist names and links, not photos. So an artist request searches their
// ALBUMS and the cover you pick stands for them, which is also what a record
// shelf would show anyway.

import { downscaleImage } from '@unisim/sdk'
import { fold } from './format'
import type { Album, Track } from './types'

export type RequestKind = 'track' | 'album' | 'artist'

export interface MusicRequest {
  id: string
  kind: RequestKind
  /** The song's or album's title — or, for an artist, their name. */
  title: string
  /** Who by. Not used for an artist request, whose name is `title`. */
  artist?: string
  /** The picked picture, shrunk, as a data URL — kept with the request. */
  art?: string
  addedAt: number
  /** When it was ticked off, by the library or by hand. */
  gotAt?: number
  /** Unticked by hand: the library no longer ticks it (a match that was wrong). */
  autoOff?: boolean
}

export const TITLE_MAX = 120
/** Past this many the oldest ticked ones go first, then the oldest of all. */
export const REQUESTS_MAX = 200

export const KIND_LABEL: Record<RequestKind, string> = { track: 'Song', album: 'Album', artist: 'Artist' }

// ── Matching ─────────────────────────────────────────────────────────────────

/**
 * A title or name as it is compared: folded (`format.fold`), with a bracketed
 * tail and a leading "the" dropped, and "&" read as "and" — so "Abbey Road
 * (2019 Mix)" is "abbey road", and "The Beatles" finds "Beatles".
 */
export function matchKey(text: string): string {
  const key = fold(
    text
      .replace(/\s*[([{][^)\]}]*[)\]}]\s*/g, ' ')
      .replace(/\s+-\s+(\d{4}\s+)?(remaster(ed)?|live|mono|stereo|single version|radio edit)\b.*$/i, '')
      .replace(/&/g, ' and '),
  )
  return key.replace(/^the /, '')
}

/** The library folded once, so checking many requests doesn't fold it many times. */
export interface LibraryIndex {
  byTitle: Map<string, Track[]>
  byArtist: Map<string, Track[]>
  byAlbum: Map<string, Track[]>
  /** Album id → its artist's key, to hold an album request to its artist. */
  albumArtist: Map<string, string>
  albumsByTitle: Map<string, string[]>
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  if (!key) return
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export function indexLibrary(tracks: readonly Track[], albums: readonly Album[]): LibraryIndex {
  const index: LibraryIndex = { byTitle: new Map(), byArtist: new Map(), byAlbum: new Map(), albumArtist: new Map(), albumsByTitle: new Map() }
  for (const t of tracks) {
    push(index.byTitle, matchKey(t.title), t)
    push(index.byAlbum, t.albumId, t)
    const a = matchKey(t.artist ?? '')
    const aa = matchKey(t.albumArtist ?? '')
    push(index.byArtist, a, t)
    if (aa !== a) push(index.byArtist, aa, t)
  }
  for (const album of albums) {
    index.albumArtist.set(album.id, matchKey(album.artist))
    push(index.albumsByTitle, matchKey(album.title), album.id)
  }
  return index
}

/**
 * The library's songs that answer a request, in library order — none if it is
 * not there yet. An artist given with a song or album has to match too; one
 * with no artist takes the title from anyone.
 */
export function findInLibrary(request: Pick<MusicRequest, 'kind' | 'title' | 'artist'>, index: LibraryIndex): Track[] {
  const title = matchKey(request.title)
  if (!title) return []
  if (request.kind === 'artist') return index.byArtist.get(title) ?? []
  const artist = matchKey(request.artist ?? '')
  if (request.kind === 'album') {
    // The album's own artist decides it; a track-level one would miss a
    // compilation's songs.
    return (index.albumsByTitle.get(title) ?? [])
      .filter((id) => !artist || index.albumArtist.get(id) === artist)
      .flatMap((id) => index.byAlbum.get(id) ?? [])
  }
  return (index.byTitle.get(title) ?? []).filter(
    (t) => !artist || matchKey(t.artist ?? '') === artist || matchKey(t.albumArtist ?? '') === artist,
  )
}

/**
 * Tick every open request the library now has. Returns the same array when
 * nothing changed, so the store knows not to write.
 */
export function tickFound(
  requests: readonly MusicRequest[],
  tracks: readonly Track[],
  albums: readonly Album[],
  now: number,
): readonly MusicRequest[] {
  if (!requests.some((r) => !r.gotAt && !r.autoOff)) return requests
  const index = indexLibrary(tracks, albums)
  let changed = false
  const next = requests.map((r) => {
    if (r.gotAt || r.autoOff || findInLibrary(r, index).length === 0) return r
    changed = true
    return { ...r, gotAt: now }
  })
  return changed ? next : requests
}

/** Ticked, or not — by hand. Unticking stops the library ticking it again. */
export function setGot(requests: readonly MusicRequest[], id: string, got: boolean, now: number): MusicRequest[] {
  return requests.map((r) => {
    if (r.id !== id) return r
    if (got) {
      const ticked = { ...r, gotAt: now }
      delete ticked.autoOff
      return ticked
    }
    const open = { ...r, autoOff: true }
    delete open.gotAt
    return open
  })
}

/** The shelf's order: still to get first, oldest first; then the ticked, newest tick first. */
export function requestsInOrder(requests: readonly MusicRequest[]): MusicRequest[] {
  const open = requests.filter((r) => !r.gotAt).sort((a, b) => a.addedAt - b.addedAt)
  const got = requests.filter((r) => r.gotAt).sort((a, b) => (b.gotAt ?? 0) - (a.gotAt ?? 0))
  return [...open, ...got]
}

/** Add one, keeping the list under `REQUESTS_MAX` (oldest ticked go first). */
export function addRequest(requests: readonly MusicRequest[], request: MusicRequest): MusicRequest[] {
  const next = [...requests, request]
  while (next.length > REQUESTS_MAX) {
    const ticked = next.filter((r) => r.gotAt).sort((a, b) => (a.gotAt ?? 0) - (b.gotAt ?? 0))[0]
    const oldest = ticked ?? [...next].sort((a, b) => a.addedAt - b.addedAt)[0]
    next.splice(next.indexOf(oldest), 1)
  }
  return next
}

/** Whatever was stored, as requests — anything malformed is dropped, not trusted. */
export function parseRequests(raw: unknown): MusicRequest[] {
  if (!Array.isArray(raw)) return []
  const out: MusicRequest[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const { id, kind, title, artist, art, addedAt, gotAt, autoOff } = r as Record<string, unknown>
    if (typeof id !== 'string' || (kind !== 'track' && kind !== 'album' && kind !== 'artist')) continue
    if (typeof title !== 'string' || !title.trim()) continue
    out.push({
      id,
      kind,
      title: title.trim().slice(0, TITLE_MAX),
      ...(kind !== 'artist' && typeof artist === 'string' && artist.trim() ? { artist: artist.trim().slice(0, TITLE_MAX) } : {}),
      ...(typeof art === 'string' && art.startsWith('data:image/') ? { art } : {}),
      addedAt: typeof addedAt === 'number' ? addedAt : 0,
      ...(typeof gotAt === 'number' ? { gotAt } : {}),
      ...(autoOff === true ? { autoOff: true } : {}),
    })
  }
  return out
}

// ── The picture ──────────────────────────────────────────────────────────────

const SEARCH = 'https://itunes.apple.com/search'
const TIMEOUT_MS = 8_000
/** Plenty to pick from without a scroll of lookalike reissues. */
const RESULTS = 12
/** Stored small: the shelf draws it on a 45's label, a quarter of the record. */
const ART_MAX = 240

export interface ArtResult {
  /** The same picture at 300px, which is what gets fetched and shrunk. */
  image: string
  /** A small one, for the picker's grid. */
  thumb: string
  title: string
  artist: string
  /** The album a song is from, or the cover an artist is shown by. */
  album?: string
  year?: number
}

/** A reissue's tail — "(2019 Mix)", "(Remastered)" — which a request needn't carry. */
const REISSUE = /\s*[([][^)\]]*\b(mix|remaster(ed)?|deluxe|edition|version|anniversary|expanded|bonus)\b[^)\]]*[)\]]\s*$/i

/** One of Apple's answers as a result — or null for one without a picture. */
export function toArtResult(item: Record<string, unknown>, kind: RequestKind): ArtResult | null {
  const small = typeof item.artworkUrl100 === 'string' ? item.artworkUrl100 : null
  if (!small) return null
  const artist = typeof item.artistName === 'string' ? item.artistName : ''
  const album = typeof item.collectionName === 'string' ? item.collectionName.replace(REISSUE, '') : undefined
  const title =
    kind === 'track' ? (typeof item.trackName === 'string' ? item.trackName.replace(REISSUE, '') : '') : kind === 'album' ? (album ?? '') : artist
  const year = typeof item.releaseDate === 'string' ? Number(item.releaseDate.slice(0, 4)) || undefined : undefined
  return {
    image: small.replace(/\/\d+x\d+bb\./, '/300x300bb.'),
    thumb: small,
    title,
    artist,
    ...(kind !== 'album' && album ? { album } : {}),
    ...(year ? { year } : {}),
  }
}

/** An iPhone's web view — which Apple sends to the Music app (rule 2 at the top). */
function iPhone(): boolean {
  return typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent)
}

function nativeIOS(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor
  return cap?.isNativePlatform?.() === true && cap.getPlatform?.() === 'ios'
}

/** Safari on an iPhone, where the search can never answer. */
export class IPhoneBrowserError extends Error {}

async function getJson(url: string): Promise<unknown> {
  if (nativeIOS()) {
    const { CapacitorHttp } = await import('@capacitor/core')
    const res = await CapacitorHttp.get({ url, headers: { Accept: 'application/json' }, connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS })
    if (res.status < 200 || res.status >= 300) throw new Error(`iTunes search answered ${res.status}`)
    // iTunes calls its JSON `text/javascript`, so it may come back unparsed.
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), referrerPolicy: 'no-referrer' })
    if (!res.ok) throw new Error(`iTunes search answered ${res.status}`)
    return await res.json()
  } catch (error) {
    throw iPhone() ? new IPhoneBrowserError('iTunes sends iPhone browsers to the Music app') : error
  }
}

/** The store to search: the one for the device's region, or Apple's default. */
function country(): string | null {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    return region && /^[A-Z]{2}$/.test(region) ? region : null
  } catch {
    return null
  }
}

/**
 * Ask iTunes for pictures to go with a request. Sends the words typed and
 * nothing else — see rule 3 at the top. Throws on a failed search, so the
 * dialog can say so rather than show "nothing found".
 */
export async function searchArt(kind: RequestKind, words: string): Promise<ArtResult[]> {
  const params = new URLSearchParams({ term: words.trim(), media: 'music', entity: kind === 'track' ? 'song' : 'album', limit: String(RESULTS * 2) })
  if (kind === 'artist') params.set('attribute', 'artistTerm')
  const where = country()
  if (where) params.set('country', where)
  const body = ((await getJson(`${SEARCH}?${params}`)) ?? {}) as { results?: unknown[] }
  const seen = new Set<string>()
  const out: ArtResult[] = []
  for (const item of body.results ?? []) {
    const result = item && typeof item === 'object' ? toArtResult(item as Record<string, unknown>, kind) : null
    // The same sleeve comes back under several releases; show it once.
    if (!result || seen.has(result.image)) continue
    seen.add(result.image)
    out.push(result)
    if (out.length === RESULTS) break
  }
  return out
}

/** Fetch the picked picture once and shrink it into a data URL to keep. */
export async function keepArt(image: string): Promise<string> {
  const res = await fetch(image, { signal: AbortSignal.timeout(TIMEOUT_MS), referrerPolicy: 'no-referrer' })
  if (!res.ok) throw new Error(`The picture answered ${res.status}`)
  const blob = await res.blob()
  const source = new File([blob], 'art', { type: blob.type || 'image/jpeg' })
  const small = await downscaleImage(source, { maxDimension: ART_MAX, mimeType: 'image/webp', quality: 0.8 }).catch(() => source)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(small)
  })
}

/** A kept data URL back as a Blob, for `Cover` — synchronous, so a shelf draws at once. */
export function artBlob(dataUrl: string | undefined): Blob | null {
  if (!dataUrl) return null
  const comma = dataUrl.indexOf(',')
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'image/webp'
  try {
    const bytes = atob(dataUrl.slice(comma + 1))
    const out = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i)
    return new Blob([out], { type: mime })
  } catch {
    return null
  }
}
