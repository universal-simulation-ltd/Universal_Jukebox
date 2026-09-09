// The library's storage: four IndexedDB stores, no server, nothing that leaves
// the device.
//
// A thin hand-rolled wrapper rather than a library, matching the eight other
// Universal Apps that do this (`Universal_PDF/src/lib/recents.ts` is the
// nearest template). IndexedDB's callback API is unpleasant exactly once, in
// `open()`, and everything above it is four promises.
//
// ⚠️ Every entry point here resolves rather than rejects when storage is
// unavailable. Private windows, "block all cookies", a full disk and Safari's
// eviction all produce a database that will not open, and the correct behaviour
// for a music player is to work anyway with an in-memory library that lasts the
// session. A player that shows an error box instead of playing your music has
// its priorities backwards.

import type { Album, Root, Track } from './types'

const DB_NAME = 'unisim-jukebox'
/**
 * ⚠️ Bumped to 2 for the `fixes` store (2026-09-08).
 *
 * `onupgradeneeded` below creates only what is missing, so it runs correctly
 * for a brand-new database AND for one already holding somebody's library —
 * dropping and recreating on an upgrade would silently throw away a scan of
 * five thousand files, which is the sort of thing a version bump does when
 * nobody thinks about it.
 */
const DB_VERSION = 2

export const STORE_TRACKS = 'tracks'
export const STORE_ALBUMS = 'albums'
export const STORE_ROOTS = 'roots'
export const STORE_FIXES = 'fixes'

let dbPromise: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      return resolve(null)
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const tracks = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' })
        // The only index the app actually asks for: every album view is
        // "the tracks with this albumId". Artist and title lists are built by
        // walking everything once at startup, which is faster than it sounds
        // and avoids indexes that would need maintaining on every scan.
        tracks.createIndex('albumId', 'albumId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_ALBUMS)) {
        db.createObjectStore(STORE_ALBUMS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_ROOTS)) {
        db.createObjectStore(STORE_ROOTS, { keyPath: 'id' })
      }
      // Tidy-up decisions, kept apart from the library they correct.
      //
      // ⚠️ This is the store that makes tidying worth doing. Everything else
      // here is DERIVED and thrown away by a rescan — so without somewhere
      // durable to record them, every fix a person made would be undone the
      // next time they added an album. Fixes are keyed by album id and track
      // id, both of which a rescan of unchanged files reproduces exactly, so
      // they survive and are re-applied.
      if (!db.objectStoreNames.contains(STORE_FIXES)) {
        db.createObjectStore(STORE_FIXES, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      const db = request.result
      // Another tab upgrading the schema would otherwise block forever.
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
  return dbPromise
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null)
        let request: IDBRequest<T>
        try {
          request = run(db.transaction(store, mode).objectStore(store))
        } catch {
          return resolve(null)
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(null)
      }),
  )
}

// ── Tracks ───────────────────────────────────────────────────────────────────

export async function allTracks(): Promise<Track[]> {
  return (await tx<Track[]>(STORE_TRACKS, 'readonly', (s) => s.getAll())) ?? []
}

/**
 * Write a batch of tracks in ONE transaction.
 *
 * ⚠️ Batched because it has to be. A scan of 5,000 files that opens a
 * transaction per track spends most of its time on transaction overhead and
 * makes the tab unresponsive; `scan.ts` therefore hands these over in chunks as
 * it streams, which is also what lets the first albums appear while the count
 * is still climbing.
 */
export async function putTracks(tracks: Track[]): Promise<void> {
  if (tracks.length === 0) return
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction(STORE_TRACKS, 'readwrite')
    } catch {
      return resolve()
    }
    const store = t.objectStore(STORE_TRACKS)
    for (const track of tracks) store.put(track)
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}

/** Fill in a duration learnt at playback time. */
export async function setDuration(id: string, durationSec: number): Promise<void> {
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction(STORE_TRACKS, 'readwrite')
    } catch {
      return resolve()
    }
    const store = t.objectStore(STORE_TRACKS)
    const get = store.get(id)
    get.onsuccess = () => {
      const track = get.result as Track | undefined
      if (track) store.put({ ...track, durationSec })
    }
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}

// ── Albums ───────────────────────────────────────────────────────────────────

export async function allAlbums(): Promise<Album[]> {
  return (await tx<Album[]>(STORE_ALBUMS, 'readonly', (s) => s.getAll())) ?? []
}

export async function putAlbums(albums: Album[]): Promise<void> {
  if (albums.length === 0) return
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction(STORE_ALBUMS, 'readwrite')
    } catch {
      return resolve()
    }
    const store = t.objectStore(STORE_ALBUMS)
    for (const album of albums) store.put(album)
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}

export async function deleteAlbum(id: string): Promise<void> {
  await tx(STORE_ALBUMS, 'readwrite', (s) => s.delete(id))
}

/**
 * Replace the whole tracks+albums picture in one go.
 *
 * ⚠️ Used after a MERGE — adding a folder, removing one — where the result is
 * computed in memory from what was there plus what just arrived (`lib/roots.ts`)
 * and the database's job is simply to end up matching. Deleting the rows that
 * went away one id at a time is the obvious alternative and it is worse: the
 * set of removed ids is exactly the thing the merge does not compute, so it
 * would have to be derived by diffing, and a diff that is wrong leaves orphan
 * tracks that appear in the library and cannot be played.
 *
 * Clear-then-write in ONE transaction, so a failure halfway cannot leave the
 * library empty.
 */
export async function replaceLibrary(tracks: Track[], albums: Album[]): Promise<void> {
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction([STORE_TRACKS, STORE_ALBUMS], 'readwrite')
    } catch {
      return resolve()
    }
    const trackStore = t.objectStore(STORE_TRACKS)
    const albumStore = t.objectStore(STORE_ALBUMS)
    trackStore.clear()
    albumStore.clear()
    for (const track of tracks) trackStore.put(track)
    for (const album of albums) albumStore.put(album)
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}

// ── Roots ────────────────────────────────────────────────────────────────────

export async function allRoots(): Promise<Root[]> {
  return (await tx<Root[]>(STORE_ROOTS, 'readonly', (s) => s.getAll())) ?? []
}

export async function putRoot(root: Root): Promise<void> {
  await tx(STORE_ROOTS, 'readwrite', (s) => s.put(root))
}

export async function deleteRoot(id: string): Promise<void> {
  await tx(STORE_ROOTS, 'readwrite', (s) => s.delete(id))
}

// ── Fixes ────────────────────────────────────────────────────────────────────

export type Fix =
  | { id: string; kind: 'cover'; albumId: string; blob: Blob }
  | { id: string; kind: 'album'; trackId: string; albumId: string }

export const coverFixId = (albumId: string) => `cover:${albumId}`
export const albumFixId = (trackId: string) => `album:${trackId}`

export async function allFixes(): Promise<Fix[]> {
  return (await tx<Fix[]>(STORE_FIXES, 'readonly', (s) => s.getAll())) ?? []
}

export async function putFixes(fixes: Fix[]): Promise<void> {
  if (fixes.length === 0) return
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction(STORE_FIXES, 'readwrite')
    } catch {
      return resolve()
    }
    const store = t.objectStore(STORE_FIXES)
    for (const fix of fixes) store.put(fix)
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}

export async function clearFixes(): Promise<void> {
  await tx(STORE_FIXES, 'readwrite', (s) => s.clear())
}

// ── Wholesale ────────────────────────────────────────────────────────────────

/**
 * Empty the library.
 *
 * The roots are cleared too. Anything else would leave the app holding a folder
 * permission for a library it no longer has, which is the one state that is
 * harder to explain than either "no folder" or "a folder with music in it".
 */
export async function clearLibrary(): Promise<void> {
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction([STORE_TRACKS, STORE_ALBUMS, STORE_ROOTS, STORE_FIXES], 'readwrite')
    } catch {
      return resolve()
    }
    t.objectStore(STORE_TRACKS).clear()
    t.objectStore(STORE_ALBUMS).clear()
    t.objectStore(STORE_ROOTS).clear()
    // ⚠️ Fixes go too, but ONLY here. "Forget this library" means forget it;
    // `clearScanned` (which a rescan uses) deliberately leaves them, because
    // that is the whole reason they are stored separately.
    t.objectStore(STORE_FIXES).clear()
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}

/**
 * Drop the tracks and albums but KEEP the roots.
 *
 * This is what "Rescan folder" runs, and keeping the root is the entire point:
 * the folder permission is the expensive thing to re-acquire (on Chromium it
 * costs a click, on Firefox it costs the whole picker again), while the index
 * is cheap to rebuild.
 */
export async function clearScanned(): Promise<void> {
  const db = await open()
  if (!db) return
  await new Promise<void>((resolve) => {
    let t: IDBTransaction
    try {
      t = db.transaction([STORE_TRACKS, STORE_ALBUMS], 'readwrite')
    } catch {
      return resolve()
    }
    t.objectStore(STORE_TRACKS).clear()
    t.objectStore(STORE_ALBUMS).clear()
    t.oncomplete = () => resolve()
    t.onerror = () => resolve()
    t.onabort = () => resolve()
  })
}
