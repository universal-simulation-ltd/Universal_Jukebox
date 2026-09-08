import { create } from 'zustand'
import { releaseAllCovers } from '../lib/art'
import * as db from '../lib/library'
import { hasDirectoryPicker, scan, REFUSED } from '../lib/scan'
import type { Album, Root, ScanProgress, Track } from '../lib/types'

// The library: what was found, and everything about getting it.
//
// Two things here are worth reading before changing anything.
//
// ⚠️ 1. THE FOLDER PROBLEM IS THE PRODUCT, NOT AN EDGE CASE. On Chromium the
// chosen folder is a `FileSystemDirectoryHandle` that IndexedDB can store, so
// the library survives a reload behind one permission re-grant. On Firefox and
// Safari there is no File System Access API and no polyfill can invent one —
// the handle IS the permission, and nothing else can stand in for it. So on
// those browsers the folder must be re-chosen every session.
//
// The mitigation, and it is a real one: the INDEX and the ARTWORK survive
// anyway, in IndexedDB, keyed by path+size+mtime. A returning Firefox user
// re-picks the folder and their library is already there, covers and all,
// because the rescan matches what it finds against what it stored. What they
// lose is one click, not their library.
//
// The suite's honest shape for this is to LABEL THE BUTTON DIFFERENTLY rather
// than fail at the moment of use (`Universal_Converter/src/lib/saveFile.ts` and
// `Universal_Beam/src/lib/fileSink.ts` both do exactly that), which is why
// `canPersistFolder` is read by the landing copy.
//
// ⚠️ 2. THE STORE HOLDS `File` OBJECTS AND MUST NOT BE PERSISTED. `filesByPath`
// is the live handle to the actual bytes on disk. It is rebuilt on every scan
// and deliberately not written anywhere — a `File` outlives its permission by
// exactly nothing, and a stored one is a broken reference that looks valid.

export type LibraryStatus = 'empty' | 'loading' | 'scanning' | 'ready'

interface LibraryState {
  status: LibraryStatus
  tracks: Track[]
  albums: Album[]
  roots: Root[]
  progress: ScanProgress | null
  /** Extension → sentence, for the formats found and refused in the last scan. */
  refusals: { ext: string; count: number; why: string }[]
  error: string | null
  /** path → File, for everything currently reachable. Never persisted. */
  filesByPath: Map<string, File>
  canPersistFolder: boolean
  /** Set when the stored folder needs its permission re-granted. */
  needsRegrant: boolean

  hydrate(): Promise<void>
  pickFolder(): Promise<void>
  addFiles(files: FileList | File[], label?: string): Promise<void>
  regrant(): Promise<void>
  rescan(): Promise<void>
  clear(): Promise<void>
  fileFor(track: Track): File | null
  dismissError(): void
}

/** Tracks in the order an album should play: disc, then track, then title. */
export function sortAlbumTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    const disc = (a.discNo ?? 1) - (b.discNo ?? 1)
    if (disc !== 0) return disc
    const no = (a.trackNo ?? Number.MAX_SAFE_INTEGER) - (b.trackNo ?? Number.MAX_SAFE_INTEGER)
    if (no !== 0) return no
    // Untagged files fall through to filename order, which for a folder of
    // "01 ...", "02 ..." is the right order anyway.
    return a.path.localeCompare(b.path, undefined, { numeric: true })
  })
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  status: 'loading',
  tracks: [],
  albums: [],
  roots: [],
  progress: null,
  refusals: [],
  error: null,
  filesByPath: new Map(),
  canPersistFolder: hasDirectoryPicker(),
  needsRegrant: false,

  /**
   * Load whatever last session left behind.
   *
   * Note what this does NOT do: ask for permission. A permission prompt fired
   * on page load is one the browser rejects (it needs a user gesture) and one
   * the user has no context for. The library is shown from the cache, and the
   * re-grant is a button.
   */
  async hydrate() {
    const [tracks, albums, roots] = await Promise.all([db.allTracks(), db.allAlbums(), db.allRoots()])
    set({
      tracks,
      albums,
      roots,
      status: tracks.length > 0 ? 'ready' : 'empty',
      // ⚠️ Whenever there is a library but no live `File` handles, which after a
      // reload is ALWAYS — and on BOTH browser paths, not just the Chromium one.
      //
      // This used to be gated on a stored directory handle existing, which meant
      // Firefox and Safari (where there never is one) reloaded to a library that
      // looked completely normal and played nothing: every click produced "that
      // file isn't reachable any more" with no way offered to fix it. The two
      // paths need different WORDING, not different silence — `ScanBanner`
      // branches on `roots[0].handle` for that.
      needsRegrant: tracks.length > 0,
    })
  },

  async pickFolder() {
    if (!hasDirectoryPicker()) return
    let handle: FileSystemDirectoryHandle
    try {
      handle = await (window as unknown as {
        showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker({ mode: 'read' })
    } catch {
      // The user cancelled the picker. Not an error, and not worth a message.
      return
    }
    await runScan(set, get, handle, handle.name, handle)
  },

  async addFiles(files, label) {
    const list = Array.from(files)
    if (list.length === 0) return
    // The label is the top folder of the first path, which is what the person
    // actually chose — `webkitRelativePath` carries it and nothing else does.
    const first = (list[0] as File & { webkitRelativePath?: string }).webkitRelativePath
    const derived = first && first.includes('/') ? first.slice(0, first.indexOf('/')) : label
    await runScan(set, get, list, derived ?? 'Chosen files', null)
  },

  /**
   * Re-ask for the stored folder's permission.
   *
   * ⚠️ Must be called from a user gesture — a click handler, not an effect. The
   * browser drops a permission request that has no gesture behind it, and it
   * does so silently, which presents as a button that does nothing at all.
   */
  async regrant() {
    const root = get().roots.find((r) => r.handle !== null)
    if (!root?.handle) return
    const handle = root.handle as FileSystemDirectoryHandle & {
      queryPermission?(d: { mode: 'read' }): Promise<PermissionState>
      requestPermission?(d: { mode: 'read' }): Promise<PermissionState>
    }
    try {
      let state = (await handle.queryPermission?.({ mode: 'read' })) ?? 'granted'
      if (state !== 'granted') state = (await handle.requestPermission?.({ mode: 'read' })) ?? 'denied'
      if (state !== 'granted') {
        set({ error: 'Without access to the folder the tracks cannot be played. Nothing was lost — the library is still here.' })
        return
      }
    } catch {
      set({ error: 'That folder could not be opened. It may have been moved, renamed, or be on a drive that is no longer connected.' })
      return
    }
    await runScan(set, get, root.handle, root.label, root.handle)
  },

  async rescan() {
    const root = get().roots[0]
    if (!root) return
    if (root.handle) {
      await get().regrant()
      return
    }
    // No handle means no way back to the folder without the picker. Say so
    // rather than pretending to rescan.
    set({
      error: 'This browser can’t reopen a folder on its own — choose it again to rescan. Your library and covers are kept, so it will be quick.',
    })
  },

  async clear() {
    releaseAllCovers()
    await db.clearLibrary()
    set({
      status: 'empty', tracks: [], albums: [], roots: [], progress: null,
      refusals: [], filesByPath: new Map(), needsRegrant: false, error: null,
    })
  },

  fileFor(track) {
    return get().filesByPath.get(track.path) ?? null
  },

  dismissError() {
    set({ error: null })
  },
}))

/**
 * One scan, shared by every way of starting one.
 *
 * Tracks and albums are written to the store AND to IndexedDB in batches as
 * they arrive, so the grid fills in while the walk is still going. On a library
 * of a few thousand files that is the whole difference between a progress bar
 * and a tab that appears to have hung.
 */
async function runScan(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
  source: FileSystemDirectoryHandle | FileList | File[],
  label: string,
  handle: FileSystemDirectoryHandle | null,
) {
  releaseAllCovers()
  await db.clearScanned()

  const tracks: Track[] = []
  const albums = new Map<string, Album>()

  set({
    status: 'scanning', tracks: [], albums: [], error: null, needsRegrant: false,
    progress: { seen: 0, added: 0, skipped: 0, where: '', done: false },
  })

  let result
  try {
    result = await scan(source, {
      onBatch: (newTracks, newAlbums) => {
        for (const t of newTracks) tracks.push(t)
        for (const a of newAlbums) albums.set(a.id, a)
        void db.putTracks(newTracks)
        void db.putAlbums(newAlbums)
        set({ tracks: [...tracks], albums: [...albums.values()] })
      },
      onProgress: (progress) => set({ progress }),
    })
  } catch {
    set({
      status: get().tracks.length > 0 ? 'ready' : 'empty',
      progress: null,
      error: 'That folder could not be read all the way through. Anything found before the problem is in the library.',
    })
    return
  }

  const root: Root = {
    id: 'primary',
    label,
    handle,
    scannedAt: Date.now(),
    trackCount: result.tracks.length,
  }
  await db.putRoot(root)

  const refusals = [...result.refused.entries()]
    .map(([ext, count]) => ({ ext, count, why: REFUSED[ext] ?? '' }))
    .filter((r) => r.why)
    .sort((a, b) => b.count - a.count)

  set({
    status: result.tracks.length > 0 ? 'ready' : 'empty',
    tracks: result.tracks,
    albums: result.albums,
    roots: [root],
    filesByPath: result.files,
    refusals,
    progress: null,
    needsRegrant: false,
    error: result.tracks.length === 0
      ? `Nothing playable in that folder — checked ${result.refused.size > 0 ? 'every file' : 'the whole folder'}.`
      : null,
  })
}
