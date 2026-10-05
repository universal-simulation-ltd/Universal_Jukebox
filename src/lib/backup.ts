// Backing up what you MADE in the app — never the music (James, 2026-10-05:
// "Go ahead with B and backup", after the costing of hosting people's music
// ourselves came out unbounded, and against the app's "nothing is uploaded").
//
// So the split is:
//
//   • The music stays where the person keeps it — their own cloud (Proton
//     Drive, iCloud Drive, Google Drive, OneDrive), made available offline on
//     the phone and added as a folder. The knowledge base article
//     `keeping-your-music-safe` says how. No code: that is the point.
//   • What only exists inside this app — the shelves, the requests list, the
//     settings and any lyrics file somebody added by hand — goes in a backup,
//     which this file builds and reads back. It is a few kilobytes.
//
// ⚠️ A BACKUP NAMES SONGS BY THEIR TAGS, NEVER BY TRACK ID. A track's id is
// `path + size + mtime` (`types.ts`), and the modified time is the one thing a
// cloud download onto a new phone is sure to change — so a backup keyed by id
// would restore onto a new phone as shelves of nothing, which is exactly the
// day it is needed. On the way back each song is looked for by title, artist
// and album (`matchSongs`).
//
// ⚠️ A RESTORE MERGES, IT NEVER REPLACES. A song only goes back on a shelf if
// the library has it, so restoring before all the music has been copied across
// brings back what it can — and restoring again later fills in the rest,
// because each shelf keeps its id and nothing already on it is added twice.
// Requests are merged by id the same way.
//
// Two places to keep it:
//
//   • A FILE (`jukebox-backup-YYYY-MM-DD.json`) — no account, no size limit,
//     and the person puts it wherever they like, Proton Drive included.
//   • Their Universal ID — the suite's opt-in `app_settings_backups` slot
//     (migration 0050), written and read only when they tap Back up or
//     Restore. ⚠️ That table caps a row at 64 KB, so the online copy is
//     `fitBackup`'s: request pictures go first, then added lyrics, and the
//     screen says what was left out. ⚠️ And unlike BlackBook's vault it is NOT
//     end-to-end encrypted: the suite operator can see it (0050's god-mode
//     policy, for support and erasure). The screen says so before it is used.

import { fold } from './format'
import { addRequest, parseRequests, type MusicRequest } from './requests'
import type { JukeboxShelf } from './shelves'
import type { Track } from './types'

export const BACKUP_VERSION = 1

/**
 * The online copy's limit, in bytes of JSON. Under `app_settings_backups`'
 * 64 KB `pg_column_size` check with room to spare: that counts the stored
 * (compressed) jsonb, so anything this size or smaller always fits.
 */
export const ONLINE_MAX_BYTES = 60_000

/** A song as a backup names it — see the note at the top. */
export interface SongRef {
  /** Title. */
  t: string
  /** Artist, or the album artist where there is no artist. */
  a?: string
  /** Album. */
  al?: string
  /** Track number. */
  n?: number
}

export interface BackupShelf {
  id: string
  name?: string
  songs: SongRef[]
}

export interface BackupLyrics {
  song: SongRef
  raw: string
}

export interface JukeboxBackup {
  app: 'jukebox'
  v: typeof BACKUP_VERSION
  savedAt: number
  /** The settings blob as `settingsStore` persists it; read back field by field. */
  settings: Record<string, unknown>
  shelves: BackupShelf[]
  requests: MusicRequest[]
  /** Lyrics files the person added themselves — never lrclib's, which can be looked up again. */
  lyrics: BackupLyrics[]
}

/** What `fitBackup` had to leave out of the online copy. */
export interface LeftOut {
  pictures: number
  lyrics: number
}

export function songRef(track: Track): SongRef {
  const artist = track.artist || track.albumArtist
  return {
    t: track.title,
    ...(artist ? { a: artist } : {}),
    ...(track.album ? { al: track.album } : {}),
    ...(track.trackNo ? { n: track.trackNo } : {}),
  }
}

export function buildBackup(input: {
  settings: Record<string, unknown>
  shelves: readonly JukeboxShelf[]
  requests: readonly MusicRequest[]
  /** Added lyrics, by track id. */
  lyrics: readonly { id: string; raw: string }[]
  tracks: readonly Track[]
  now: number
}): JukeboxBackup {
  const byId = new Map(input.tracks.map((t) => [t.id, t]))
  const ref = (id: string) => {
    const track = byId.get(id)
    return track ? songRef(track) : null
  }
  return {
    app: 'jukebox',
    v: BACKUP_VERSION,
    savedAt: input.now,
    settings: { ...input.settings },
    shelves: input.shelves
      .map((s) => ({
        id: s.id,
        ...(s.name ? { name: s.name } : {}),
        songs: s.trackIds.map(ref).filter((r): r is SongRef => r !== null),
      }))
      .filter((s) => s.songs.length > 0),
    requests: [...input.requests],
    lyrics: input.lyrics
      .map((l) => ({ song: ref(l.id), raw: l.raw }))
      .filter((l): l is BackupLyrics => l.song !== null),
  }
}

export function backupBytes(backup: JukeboxBackup): number {
  return new TextEncoder().encode(JSON.stringify(backup)).length
}

/**
 * The backup cut down to `max` bytes for the online slot, or null when even
 * the settings, shelves and requests alone are too big (the file has no limit,
 * and the screen offers it instead).
 *
 * Pictures go first — a request's picture can be searched for again — then
 * added lyrics, kept in the order they came until the next one would not fit.
 * Lyrics are kept before pictures because somebody typed or found them by hand.
 */
export function fitBackup(backup: JukeboxBackup, max = ONLINE_MAX_BYTES): { backup: JukeboxBackup; left: LeftOut } | null {
  if (backupBytes(backup) <= max) return { backup, left: { pictures: 0, lyrics: 0 } }

  const bare: JukeboxBackup = {
    ...backup,
    requests: backup.requests.map((r) => {
      const bareRequest = { ...r }
      delete bareRequest.art
      return bareRequest
    }),
    lyrics: [],
  }
  let size = backupBytes(bare)
  if (size > max) return null

  // Each item adds its own JSON plus a comma; counting it that way is exact
  // enough, and the final size is measured again below.
  const lyrics: BackupLyrics[] = []
  for (const item of backup.lyrics) {
    const cost = new TextEncoder().encode(JSON.stringify(item)).length + 1
    if (size + cost > max) break
    lyrics.push(item)
    size += cost
  }
  const requests = bare.requests.map((r, i) => {
    const art = backup.requests[i].art
    if (!art) return r
    const cost = new TextEncoder().encode(`,"art":${JSON.stringify(art)}`).length
    if (size + cost > max) return r
    size += cost
    return { ...r, art }
  })
  const fitted: JukeboxBackup = { ...bare, requests, lyrics }
  // Belt and braces: the running count is an estimate of JSON's own layout.
  if (backupBytes(fitted) > max) return { backup: bare, left: { pictures: countArt(backup), lyrics: backup.lyrics.length } }
  return {
    backup: fitted,
    left: { pictures: countArt(backup) - countArt(fitted), lyrics: backup.lyrics.length - lyrics.length },
  }
}

function countArt(backup: JukeboxBackup): number {
  return backup.requests.filter((r) => r.art).length
}

/**
 * Whatever was read back, as a backup — or null when it is not one of ours.
 * Like every other read in this app, anything malformed is dropped rather than
 * trusted: this may be a file somebody picked from anywhere.
 */
export function parseBackup(raw: unknown): JukeboxBackup | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (b.app !== 'jukebox' || typeof b.v !== 'number' || b.v > BACKUP_VERSION) return null
  const settings = b.settings && typeof b.settings === 'object' && !Array.isArray(b.settings) ? (b.settings as Record<string, unknown>) : {}
  return {
    app: 'jukebox',
    v: BACKUP_VERSION,
    savedAt: typeof b.savedAt === 'number' ? b.savedAt : 0,
    settings,
    shelves: (Array.isArray(b.shelves) ? b.shelves : [])
      .map((s): BackupShelf | null => {
        if (!s || typeof s !== 'object') return null
        const shelf = s as Record<string, unknown>
        if (typeof shelf.id !== 'string' || !Array.isArray(shelf.songs)) return null
        const songs = shelf.songs.map(parseSongRef).filter((r): r is SongRef => r !== null)
        if (songs.length === 0) return null
        return { id: shelf.id, ...(typeof shelf.name === 'string' && shelf.name.trim() ? { name: shelf.name } : {}), songs }
      })
      .filter((s): s is BackupShelf => s !== null),
    requests: parseRequests(b.requests),
    lyrics: (Array.isArray(b.lyrics) ? b.lyrics : [])
      .map((l): BackupLyrics | null => {
        if (!l || typeof l !== 'object') return null
        const item = l as Record<string, unknown>
        const song = parseSongRef(item.song)
        return song && typeof item.raw === 'string' && item.raw.trim() ? { song, raw: item.raw } : null
      })
      .filter((l): l is BackupLyrics => l !== null),
  }
}

function parseSongRef(raw: unknown): SongRef | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.t !== 'string' || !r.t.trim()) return null
  return {
    t: r.t,
    ...(typeof r.a === 'string' && r.a ? { a: r.a } : {}),
    ...(typeof r.al === 'string' && r.al ? { al: r.al } : {}),
    ...(typeof r.n === 'number' && Number.isFinite(r.n) ? { n: r.n } : {}),
  }
}

// ── Finding the songs again ──────────────────────────────────────────────────

/**
 * Each song in `refs` as a track in this library, or null where it isn't one.
 *
 * Strictest first: title, artist and album; then title and artist (the same
 * song re-tagged onto a compilation, or an album renamed); then the title alone
 * — but only when exactly one track has it, because "Intro" by nobody in
 * particular must not land on the first "Intro" in the library. Where several
 * tracks fit equally, the track number decides, then the first is taken.
 */
export function matchSongs(refs: readonly SongRef[], tracks: readonly Track[]): (Track | null)[] {
  const full = new Map<string, Track[]>()
  const titleArtist = new Map<string, Track[]>()
  const title = new Map<string, Track[]>()
  const add = (map: Map<string, Track[]>, key: string, t: Track) => {
    const list = map.get(key)
    if (list) list.push(t)
    else map.set(key, [t])
  }
  for (const t of tracks) {
    const k = fold(t.title)
    if (!k) continue
    // Both names where a track has both; '' only for a track with neither, so
    // an untagged song is never found under any track that merely lacks an
    // album artist.
    const named = [fold(t.artist ?? ''), fold(t.albumArtist ?? '')].filter(Boolean)
    const artists = new Set(named.length > 0 ? named : [''])
    for (const a of artists) {
      add(full, `${k}|${a}|${fold(t.album ?? '')}`, t)
      add(titleArtist, `${k}|${a}`, t)
    }
    add(title, k, t)
  }
  const pick = (list: Track[] | undefined, n?: number) => {
    if (!list || list.length === 0) return null
    return (n !== undefined && list.find((t) => t.trackNo === n)) || list[0]
  }
  return refs.map((r) => {
    const k = fold(r.t)
    const a = fold(r.a ?? '')
    return (
      pick(full.get(`${k}|${a}|${fold(r.al ?? '')}`), r.n) ??
      pick(titleArtist.get(`${k}|${a}`), r.n) ??
      (title.get(k)?.length === 1 ? title.get(k)![0] : null)
    )
  })
}

/**
 * The backed-up shelves put back onto the ones on this device. A shelf with
 * the same id gains the songs it is missing, in the backup's order after its
 * own; a shelf this device has never had arrives whole (as much of it as the
 * library has). Returns how many songs were found and how many were not.
 */
export function mergeShelves(
  current: readonly JukeboxShelf[],
  backup: readonly BackupShelf[],
  tracks: readonly Track[],
): { shelves: JukeboxShelf[]; found: number; missing: number } {
  let found = 0
  let missing = 0
  const shelves = current.map((s) => ({ ...s, trackIds: [...s.trackIds] }))
  for (const b of backup) {
    const ids: string[] = []
    for (const t of matchSongs(b.songs, tracks)) {
      if (t) {
        found++
        if (!ids.includes(t.id)) ids.push(t.id)
      } else {
        missing++
      }
    }
    if (ids.length === 0) continue
    const here = shelves.find((s) => s.id === b.id)
    if (here) {
      for (const id of ids) if (!here.trackIds.includes(id)) here.trackIds.push(id)
      if (!here.name && b.name) here.name = b.name
    } else {
      shelves.push({ id: b.id, trackIds: ids, ...(b.name ? { name: b.name } : {}) })
    }
  }
  return { shelves, found, missing }
}

/**
 * The backed-up requests added to this device's, by id; ones already here are
 * left as they are. Through `addRequest`, so the list's own cap still holds.
 */
export function mergeRequests(current: readonly MusicRequest[], backup: readonly MusicRequest[]): MusicRequest[] {
  const have = new Set(current.map((r) => r.id))
  return backup.filter((r) => !have.has(r.id)).reduce<MusicRequest[]>((list, r) => addRequest(list, r), [...current])
}

/** "jukebox-backup-2026-10-05.json", by the device's own calendar. */
export function backupFileName(now: number): string {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `jukebox-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}
