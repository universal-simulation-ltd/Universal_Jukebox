import { fallbackHue } from './art'
import { byYearThenTitle } from './libraryView'
import { compareName } from './collate'
import { hash } from './shuffleQueue'
import type { Album, Track } from './types'
import type { HomeTab } from '../stores/settingsStore'

// The library as the Apple Watch app sees it (James, 2026-11-21: "a Jukebox
// Apple Watch app that is a remote for the phone").
//
// The watch never holds a song. It shows the phone's albums, artists and
// shelves, and asks the phone to play one; the phone plays it exactly as its
// own screens would. This file decides what the watch is told: no paths, no
// files, no lyrics — names, counts and the ids the phone needs back to start
// something. `lib/watch.ts` sends it, with tiny covers, through the native
// `JukeboxWatch` plugin; `WatchBridge.swift` keeps it on the phone (so the
// watch can be answered while this page is asleep) and hands it to the watch.
//
// ⚠️ THE FIELD NAMES ARE A PROTOCOL. `WatchLibrary` in
// `ios/App/Shared/WatchProtocol.swift` decodes this on both the phone and the
// watch, and `watchLibrary.test.ts` holds this file's output to the same
// fixture the Swift tests decode (`ios/App/JukeboxWatchTests/library.json`).
// Rename a field in one place and both test suites say so.

/** The watch's own sections, in the phone's tab order (Mix has no watch form). */
export type WatchSection = 'artists' | 'albums' | 'songs' | 'shelves'

export interface WatchAlbum {
  id: string
  /** Title, as tagged. */
  t: string
  /** Artist. */
  a: string
  /** Songs on it. */
  n: number
  /** The fallback tile's hue when it has no cover (`fallbackHue`). */
  h: number
}

export interface WatchArtist {
  /** The artist's name is their id, as on the phone (`ArtistScreen`). */
  id: string
  /** Their albums, oldest first — the order "play this artist" plays them in. */
  al: string[]
  /** Songs, all albums together. */
  c: number
}

export type WatchShelfKind = 'hits' | 'most' | 'loved' | 'shelf'

export interface WatchShelf {
  id: string
  /** The name as the phone shows it, already in the phone's language. */
  n: string
  k: WatchShelfKind
  /** Its songs, in shelf order. */
  ids: string[]
  /** The album whose cover stands for it: its first song's. */
  art?: string
}

export interface WatchLibrary {
  v: 1
  /** Changes whenever anything the watch shows changes (covers included). */
  rev: string
  sections: WatchSection[]
  albums: WatchAlbum[]
  artists: WatchArtist[]
  shelves: WatchShelf[]
  /** Every song in the library — the Songs row is "Shuffle songs". */
  songs: number
  /** Only the example library — it plays on the phone only with the app open. */
  example: boolean
}

export interface WatchShelfInput {
  id: string
  name: string
  kind: WatchShelfKind
  trackIds: readonly string[]
}

export interface WatchLibraryInput {
  tracks: readonly Pick<Track, 'id' | 'albumId'>[]
  albums: readonly Pick<Album, 'id' | 'title' | 'artist' | 'year' | 'trackCount'>[]
  /** As the Shelves tab draws them, top to bottom, named. Empty ones are left off here. */
  shelves: readonly WatchShelfInput[]
  /** The phone's tab bar, in order, hidden tabs already left out. */
  tabs: readonly HomeTab[]
  example: boolean
  /** Album ids with a cover going to the watch — part of `rev`. */
  covers?: readonly string[]
}

const SECTION: Partial<Record<HomeTab, WatchSection>> = {
  artists: 'artists',
  albums: 'albums',
  tracks: 'songs',
  jukebox: 'shelves',
}

export function buildWatchLibrary(input: WatchLibraryInput): WatchLibrary {
  const sections = input.tabs.map((tab) => SECTION[tab]).filter((s): s is WatchSection => !!s)
  const albums = [...input.albums]
    .sort((a, b) => compareName(a.title, b.title) || compareName(a.artist, b.artist))
    .map((a) => ({ id: a.id, t: a.title, a: a.artist, n: a.trackCount, h: fallbackHue(a.id) }))

  const byArtist = new Map<string, (typeof input.albums)[number][]>()
  for (const album of input.albums) {
    const list = byArtist.get(album.artist)
    if (list) list.push(album)
    else byArtist.set(album.artist, [album])
  }
  const artists = [...byArtist.keys()].sort(compareName).map((name) => {
    const own = [...byArtist.get(name)!].sort(byYearThenTitle)
    return { id: name, al: own.map((a) => a.id), c: own.reduce((sum, a) => sum + a.trackCount, 0) }
  })

  const albumOf = new Map(input.tracks.map((t) => [t.id, t.albumId]))
  const shelves: WatchShelf[] = []
  for (const shelf of input.shelves) {
    const ids = shelf.trackIds.filter((id) => albumOf.has(id))
    if (ids.length === 0) continue
    shelves.push({ id: shelf.id, n: shelf.name, k: shelf.kind, ids, art: albumOf.get(ids[0]) })
  }

  const body = { v: 1 as const, sections, albums, artists, shelves, songs: input.tracks.length, example: input.example }
  const rev = hash(JSON.stringify(body) + '|' + [...(input.covers ?? [])].sort().join(',')).toString(36)
  return { v: 1, rev, sections, albums, artists, shelves, songs: body.songs, example: body.example }
}
