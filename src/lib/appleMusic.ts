// The iPhone's own Music library as a source — the songs synced to it from a
// Mac (James, 2026-09-10: "I always transfer my music from my Mac to iPhone
// and used to use Marvis to play it").
//
// ⚠️ NOT A FOLDER, AND THAT CHANGES TWO THINGS. Synced songs live in the Music
// app's library, which no folder picker and no `readdir` can reach; the only
// door is iOS's MediaPlayer framework (`ios/App/App/AppleMusicPlugin.swift`).
//
//   1. The INDEX is built from the tags iOS already holds, not from files. No
//      song is opened to scan the library, so a few thousand songs import in
//      seconds; the slow part is the album art, fetched a few at a time.
//   2. PLAYBACK needs a copy. iOS gives each song an `ipod-library://` URL that
//      only AVFoundation can open, so the first time a song plays the plugin
//      exports it into a size-capped cache (a remux, not a re-encode, wherever
//      the container allows) and it then plays through Capacitor's local
//      server like any other file. `prepareSong` below; the player waits on it
//      through `whenPlayable` in `stores/playerStore.ts`, and warms the next
//      track while this one plays.
//
// ⚠️ WHAT CAN NEVER PLAY HERE, SAID RATHER THAN HIDDEN: Apple Music
// subscription downloads (DRM-protected) and songs that are in iCloud but not
// on the phone. iOS gives neither a file to any third-party player. They are
// counted and reported, never silently dropped.

import { makeCoverBlob } from './art'
import { albumKey, trackKey } from './keys'
import { NativeFile } from './nativeFile'
import { pluginRegistered } from './nativePlugins'
import { rootOf } from './roots'
import type { Album, Root, ScanProgress, Track } from './types'

export const MUSIC_LIBRARY_PLUGIN = 'JukeboxAppleMusic'
export const MUSIC_LIBRARY_ROOT_ID = 'music-library'
/** What the root is called in the library — and so the prefix of its paths. */
export const MUSIC_LIBRARY_LABEL = 'Music library'

export type AccessStatus = 'authorized' | 'denied' | 'restricted' | 'notDetermined'

/** One song, as `AppleMusicPlugin.songs` describes it. */
export interface MusicLibrarySong {
  /** The song's persistent ID — a UInt64, so a STRING (JS numbers stop at 2^53). */
  id: string
  albumId: string
  title: string
  duration: number
  /** The container of the song's own asset — "m4a", "mp3". */
  ext: string
  /** When it was added to the library, epoch ms. Stable, so it is the mtime. */
  added: number
  artist?: string
  albumArtist?: string
  album?: string
  genre?: string
  trackNo?: number
  discNo?: number
  year?: number
}

interface MusicLibraryPlugin {
  status(): Promise<{ status: AccessStatus }>
  requestAccess(): Promise<{ status: AccessStatus }>
  songs(): Promise<{ songs: MusicLibrarySong[]; total: number; cloudOnly: number; protected: number }>
  artwork(options: { albumId: string; size?: number }): Promise<{ mime?: string; data?: string }>
  prepare(options: { id: string }): Promise<{ uri: string; size: number }>
}

let plugin: MusicLibraryPlugin | null = null

/**
 * Registered lazily and never returned through a promise — a Capacitor plugin
 * is a Proxy that answers `then` with a native call. See `loadMusicFolder` in
 * `nativeFile.ts`.
 */
async function load(): Promise<void> {
  if (plugin) return
  const { registerPlugin } = await import('@capacitor/core')
  plugin = registerPlugin<MusicLibraryPlugin>(MUSIC_LIBRARY_PLUGIN)
}

/** Is the Music library a source here? iOS only; synchronous for first render. */
export function hasMusicLibrary(): boolean {
  return pluginRegistered(MUSIC_LIBRARY_PLUGIN)
}

/** Does this track belong to the Music library rather than to a folder? */
export function isMusicLibraryTrack(roots: Root[], track: Track): boolean {
  return rootOf(roots, track.path)?.source === 'music-library'
}

/**
 * The song's persistent ID, out of a track path — `…/<albumId>/<id>.<ext>`.
 *
 * ⚠️ The path IS the song's identity here, as it is for a folder's file: it is
 * what `trackKey` hashes, so play counts, queue entries and tidy-up fixes keyed
 * to a track survive a refresh of the library.
 */
export function songIdOf(path: string): string | null {
  const last = path.slice(path.lastIndexOf('/') + 1)
  const dot = last.indexOf('.')
  const id = dot < 0 ? last : last.slice(0, dot)
  return /^\d+$/.test(id) ? id : null
}

/**
 * Songs → the library's own tracks and albums, shaped exactly as a scan shapes
 * them (`lib/scan.ts`), so every screen, the search and the tidy-up treat them
 * alike.
 *
 * ⚠️ PATHS: `<prefix>/<albumPersistentID>/<songPersistentID>.<ext>`. One
 * "directory" per album, because the tidy-up reasons about what sits in a
 * directory together; the persistent IDs rather than names, because two songs
 * can share a title and a name can be retagged.
 *
 * ⚠️ SIZE is 0, because iOS does not say. It is part of `trackKey` along with
 * the path and `added` — all three stable — so the id is stable too.
 */
export function songsToLibrary(
  songs: MusicLibrarySong[],
  prefix: string,
): { tracks: Track[]; albums: Album[]; artworkFor: Map<string, string> } {
  const tracks: Track[] = []
  const albums = new Map<string, Album>()
  /** Our album id → the Music library album to fetch its sleeve from. */
  const artworkFor = new Map<string, string>()

  for (const song of songs) {
    const ext = (song.ext || 'm4a').toLowerCase()
    const path = `${prefix}/${song.albumId}/${song.id}.${ext}`
    const mtime = song.added > 0 ? song.added : 0
    const title = song.title?.trim() || 'Untitled'
    // ⚠️ `albumKey` groups by album ARTIST and album, like a scan — so two
    // library albums that iOS keeps apart but that carry identical tags become
    // one record here, exactly as they would from a folder.
    const albumId = albumKey({ album: song.album, albumArtist: song.albumArtist, artist: song.artist })

    tracks.push({
      id: trackKey({ path, size: 0, mtime }),
      path,
      name: `${title}.${ext}`,
      size: 0,
      mtime,
      ext,
      title,
      artist: song.artist,
      albumArtist: song.albumArtist,
      album: song.album,
      trackNo: song.trackNo,
      discNo: song.discNo,
      year: song.year,
      genre: song.genre,
      // iOS knows the length — the one thing a folder scan has to wait for a
      // first play to learn.
      durationSec: song.duration > 0 ? song.duration : undefined,
      albumId,
    })

    const album = albums.get(albumId)
    if (album) {
      album.trackCount++
      if (!album.year && song.year) album.year = song.year
    } else {
      albums.set(albumId, {
        id: albumId,
        title: song.album?.trim() || 'Unknown album',
        artist: (song.albumArtist || song.artist)?.trim() || 'Unknown artist',
        year: song.year,
        trackCount: 1,
        cover: null,
      })
      artworkFor.set(albumId, song.albumId)
    }
  }
  return { tracks, albums: [...albums.values()], artworkFor }
}

/** Ask for access — the system prompt the first time, the stored answer after. */
export async function requestMusicLibraryAccess(): Promise<AccessStatus> {
  await load()
  return (await plugin!.requestAccess()).status
}

export interface MusicLibraryRead {
  tracks: Track[]
  albums: Album[]
  /** Every song in the library, playable or not. */
  total: number
  /** In iCloud, not on this phone. */
  cloudOnly: number
  /** Apple Music downloads — DRM, unplayable by any third-party app. */
  protected: number
}

/** Read the whole library: songs, then the album art, reporting as it goes. */
export async function readMusicLibrary(
  prefix: string,
  onProgress?: (progress: ScanProgress) => void,
): Promise<MusicLibraryRead> {
  await load()
  const answer = await plugin!.songs()
  const { tracks, albums, artworkFor } = songsToLibrary(answer.songs, prefix)
  const skipped = answer.cloudOnly + answer.protected
  const report = (where: string, done = false) =>
    onProgress?.({ seen: answer.total, added: tracks.length, skipped, where, done })

  report('Reading the album art…')
  let fetched = 0
  await inLanes(albums, 4, async (album) => {
    const libraryAlbumId = artworkFor.get(album.id)
    if (libraryAlbumId) {
      try {
        const art = await plugin!.artwork({ albumId: libraryAlbumId, size: 600 })
        if (art.data) {
          album.cover = await makeCoverBlob({ mime: art.mime || 'image/jpeg', bytes: bytesOf(art.data) })
        }
      } catch {
        // A sleeve that will not come is a blank tile, not a failed import.
      }
    }
    fetched++
    if (fetched % 10 === 0) report(`Reading the album art — ${fetched} of ${albums.length}`)
  })
  report('', true)
  return { tracks, albums, total: answer.total, cloudOnly: answer.cloudOnly, protected: answer.protected }
}

/** Run `work` over `items`, at most `width` at a time. */
async function inLanes<T>(items: T[], width: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const lanes = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (next < items.length) await work(items[next++])
  })
  await Promise.all(lanes)
}

function bytesOf(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── Playback: a copy on first play ───────────────────────────────────────────

/**
 * The songs whose copies exist, most recent last.
 *
 * ⚠️ DELIBERATELY SMALL. The native cache evicts least-recently-played files
 * once it passes its ceiling, and a file remembered here that the cache has
 * since deleted would play as a media error. Six copies are a tiny fraction of
 * that ceiling, so nothing remembered here can have been evicted; anything
 * older is simply asked for again, which on a cache hit is instant.
 */
const prepared = new Map<string, NativeFile>()
const KEEP = 6
/** One export per song, however many callers ask while it runs. */
const inflight = new Map<string, Promise<NativeFile>>()

/** The copy, if it is ready — synchronous, for `fileFor`. */
export function preparedFile(track: Track): NativeFile | null {
  const id = songIdOf(track.path)
  if (!id) return null
  const hit = prepared.get(id)
  if (!hit) return null
  prepared.delete(id)
  prepared.set(id, hit)
  return hit
}

/** Make the copy (or find it in the cache). Rejects if the song cannot play. */
export async function prepareSong(track: Track): Promise<NativeFile> {
  const id = songIdOf(track.path)
  if (!id) throw new Error('That track is not from the Music library.')
  const ready = preparedFile(track)
  if (ready) return ready
  const running = inflight.get(id)
  if (running) return running

  const job = (async () => {
    await load()
    const { uri, size } = await plugin!.prepare({ id })
    // The copy's own container, which can differ from the song's (an MP3 is
    // remuxed into QuickTime) — and the lyrics reader decides by extension.
    const ext = uri.slice(uri.lastIndexOf('.') + 1).toLowerCase() || track.ext
    const file = new NativeFile({ path: track.path, uri, name: `${track.title}.${ext}`, size, mtime: track.mtime })
    prepared.set(id, file)
    while (prepared.size > KEEP) {
      const oldest = prepared.keys().next().value
      if (oldest === undefined) break
      prepared.delete(oldest)
    }
    return file
  })()
  inflight.set(id, job)
  try {
    return await job
  } finally {
    inflight.delete(id)
  }
}
