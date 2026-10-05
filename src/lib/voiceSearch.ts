import { fold } from './format'
import type { Track } from './types'

// "Hey Google, play Radiohead on Jukebox" (James, 2026-10-05). The Android
// voice assistant hands a media app what was asked for as a play-from-search
// request: a free-text `query`, and sometimes a `focus` (artist, album, song,
// genre) with the parts it recognised split out. This turns that into
// something to play from the library. The native side is
// `android/…/ShortcutsPlugin.java`; the playing is `shortcuts.ts`.
//
// ⚠️ THE QUERY IS WHATEVER THE ASSISTANT HEARD, and often not tidy: "kid a by
// radiohead", "some music", "shuffle my songs". So exact matches are tried
// before partial ones, and a partial match must be whole words — "a" must not
// find every artist with an "a" in it.

export type VoiceFocus = 'artist' | 'album' | 'song' | 'genre' | 'any'

export interface VoiceRequest {
  query?: string
  focus?: VoiceFocus
  artist?: string
  album?: string
  title?: string
  genre?: string
}

export type VoicePlan =
  /** Nothing in particular asked for: carry on, or shuffle songs. */
  | { kind: 'play' }
  | { kind: 'shuffle'; what: 'songs' | 'albums' | 'artists' }
  /** An artist's or a genre's songs, shuffled. */
  | { kind: 'mix'; tracks: Track[] }
  /** Tracks in album order, starting at `at`. */
  | { kind: 'inOrder'; tracks: Track[]; at: number }
  | { kind: 'none'; asked: string }

type Sort = (tracks: Track[]) => Track[]

/** "play some music", "play anything", "play my songs" — nothing named. */
const ANYTHING = /^(?:(?:some|my|all|the|any|all my|all the)\s+)?(?:music|songs?|tracks?|anything|something|everything|jukebox)?$/
const SHUFFLE = /^shuffle(?:\s+(?:my|all|all my|the|all the))?(?:\s+(songs?|music|tracks?|everything|albums?|artists?))?$/

export function planVoice(request: VoiceRequest, tracks: readonly Track[], sort: Sort): VoicePlan {
  const query = fold(request.query ?? '')
  const asked = (request.query ?? '').trim()

  // The parts the assistant split out, when it did.
  if (request.title) {
    const song = findSong(tracks, request.title, request.artist)
    if (song) return inAlbum(song, tracks, sort)
  }
  if (request.album) {
    const album = findAlbum(tracks, request.album, request.artist)
    if (album) return album(sort)
  }
  if (request.artist) {
    const songs = byArtist(tracks, request.artist)
    if (songs.length) return { kind: 'mix', tracks: songs }
  }
  if (request.genre) {
    const songs = byGenre(tracks, request.genre)
    if (songs.length) return { kind: 'mix', tracks: songs }
  }

  if (!query) return { kind: 'play' }
  // ⚠️ A NAME IN THE LIBRARY BEATS THE STOCK PHRASES: "play Something" is a
  // Beatles song before it is "play anything", and "Music" may be an album.
  const focus = request.focus ?? 'any'
  const exact = focus === 'any' ? freeText(tracks, query, sort, same) : null
  if (exact) return exact
  if (ANYTHING.test(query)) return { kind: 'play' }
  const shuffle = SHUFFLE.exec(query)
  if (shuffle) {
    const what = shuffle[1] ?? ''
    if (what.startsWith('album')) return { kind: 'shuffle', what: 'albums' }
    if (what.startsWith('artist')) return { kind: 'shuffle', what: 'artists' }
    return { kind: 'shuffle', what: 'songs' }
  }

  // A focus without the split-out parts: the query is the name.
  if (focus === 'artist') return mixOrNone(byArtist(tracks, query), asked)
  if (focus === 'genre') return mixOrNone(byGenre(tracks, query), asked)
  if (focus === 'album') {
    const album = findAlbum(tracks, query)
    return album ? album(sort) : { kind: 'none', asked }
  }
  if (focus === 'song') {
    const song = findSong(tracks, query)
    return song ? inAlbum(song, tracks, sort) : { kind: 'none', asked }
  }

  // Free text. "<album or song> by <artist>" first.
  const by = / by (.+)$/.exec(query)
  if (by) {
    const name = query.slice(0, by.index)
    const album = findAlbum(tracks, name, by[1])
    if (album) return album(sort)
    const song = findSong(tracks, name, by[1])
    if (song) return inAlbum(song, tracks, sort)
  }
  return freeText(tracks, query, sort, within) ?? { kind: 'none', asked }
}

/** An artist, an album, a song, a genre — in that order — by one kind of match. */
function freeText(tracks: readonly Track[], query: string, sort: Sort, match: Match): VoicePlan | null {
  const artist = tracks.filter((t) => artistsOf(t).some((a) => match(a, query)))
  if (artist.length) return { kind: 'mix', tracks: artist }
  const album = findAlbum(tracks, query, undefined, match)
  if (album) return album(sort)
  const song = findSong(tracks, query, undefined, match)
  if (song) return inAlbum(song, tracks, sort)
  const genre = tracks.filter((t) => t.genre && match(t.genre, query))
  if (genre.length) return { kind: 'mix', tracks: genre }
  return null
}

type Match = (tag: string, wanted: string) => boolean

/** Folded, and with a leading "the" not counting: "Beatles" finds "The Beatles". */
function key(text: string): string {
  return fold(text).replace(/^the /, '')
}

const same: Match = (tag, wanted) => {
  const k = key(wanted)
  return k.length > 0 && key(tag) === k
}

const within: Match = (tag, wanted) => {
  const k = key(wanted)
  // Short words alone match too much to mean anything.
  return k.length >= 3 && ` ${key(tag)} `.includes(` ${k} `)
}

function artistsOf(track: Track): string[] {
  return [track.artist, track.albumArtist].filter((a): a is string => !!a)
}

function byArtist(tracks: readonly Track[], artist: string): Track[] {
  const exact = tracks.filter((t) => artistsOf(t).some((a) => same(a, artist)))
  return exact.length ? exact : tracks.filter((t) => artistsOf(t).some((a) => within(a, artist)))
}

function byGenre(tracks: readonly Track[], genre: string): Track[] {
  const exact = tracks.filter((t) => t.genre && same(t.genre, genre))
  return exact.length ? exact : tracks.filter((t) => t.genre && within(t.genre, genre))
}

function mixOrNone(tracks: Track[], asked: string): VoicePlan {
  return tracks.length ? { kind: 'mix', tracks } : { kind: 'none', asked }
}

/** The album's tracks, in order, as a plan — or null. The biggest wins a tie of names. */
function findAlbum(
  tracks: readonly Track[],
  name: string,
  artist?: string,
  match: Match = same,
): ((sort: Sort) => VoicePlan) | null {
  const named = tracks.filter((t) => t.album && match(t.album, name))
  const by = artist ? named.filter((t) => artistsOf(t).some((a) => within(a, artist) || same(a, artist))) : named
  const pool = by.length ? by : artist ? [] : named
  if (!pool.length) return null
  const counts = new Map<string, number>()
  for (const t of pool) counts.set(t.albumId, (counts.get(t.albumId) ?? 0) + 1)
  const albumId = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  return (sort) => ({ kind: 'inOrder', tracks: sort(tracks.filter((t) => t.albumId === albumId)), at: 0 })
}

function findSong(tracks: readonly Track[], title: string, artist?: string, match: Match = same): Track | null {
  const named = tracks.filter((t) => match(t.title, title))
  if (!artist) return named[0] ?? null
  return named.find((t) => artistsOf(t).some((a) => same(a, artist) || within(a, artist))) ?? null
}

/** The song, then the rest of its album after it. */
function inAlbum(song: Track, tracks: readonly Track[], sort: Sort): VoicePlan {
  const album = sort(tracks.filter((t) => t.albumId === song.albumId))
  return { kind: 'inOrder', tracks: album, at: Math.max(0, album.findIndex((t) => t.id === song.id)) }
}
