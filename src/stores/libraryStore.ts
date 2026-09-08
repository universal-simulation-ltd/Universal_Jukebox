import { create } from 'zustand'
import { releaseAllCovers } from '../lib/art'
import * as db from '../lib/library'
import { hasDirectoryPicker, scan, REFUSED, type FoundImage } from '../lib/scan'
import { applyFixes } from '../lib/tidy'
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
  /** Directory → the images found in it, for the tidy-up. Never persisted. */
  folderImages: Map<string, FoundImage[]>
  canPersistFolder: boolean
  /** Set when the stored folder needs its permission re-granted. */
  needsRegrant: boolean

  /** True once a scan has been stopped early, so the UI can say what it kept. */
  stoppedEarly: boolean

  hydrate(): Promise<void>
  /** Stop a running scan, keeping everything found so far. */
  stopScan(): void
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
  folderImages: new Map(),
  canPersistFolder: hasDirectoryPicker(),
  needsRegrant: false,
  stoppedEarly: false,

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

  /**
   * ⚠️ Stopping keeps what has been found — it does not undo the scan.
   *
   * Everything already scanned is in the store and in IndexedDB (the batches
   * are written as they arrive), so aborting the walk simply stops adding to a
   * library that is already usable. A "stop" that threw the work away would be
   * a cancel, and cancelling forty minutes of scanning is not what anybody
   * pressing it wants.
   */
  stopScan() {
    scanAbort?.abort()
  },

  async clear() {
    releaseAllCovers()
    await db.clearLibrary()
    set({
      status: 'empty', tracks: [], albums: [], roots: [], progress: null,
      refusals: [], filesByPath: new Map(), folderImages: new Map(),
      needsRegrant: false, error: null,
      stoppedEarly: false,
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
/**
 * The controller for the scan currently running, if any.
 *
 * Module-level rather than in the store because it is not state anything
 * renders — and because a new scan must be able to abort the previous one even
 * if the component that started it is long gone.
 */
let scanAbort: AbortController | null = null

async function runScan(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
  source: FileSystemDirectoryHandle | FileList | File[],
  label: string,
  handle: FileSystemDirectoryHandle | null,
) {
  releaseAllCovers()
  await db.clearScanned()

  // A second scan started while one is running aborts the first, or the two
  // walks interleave into one library and the progress count runs backwards.
  scanAbort?.abort()
  const abort = new AbortController()
  scanAbort = abort

  const tracks: Track[] = []
  const albums = new Map<string, Album>()

  set({
    status: 'scanning', tracks: [], albums: [], error: null, needsRegrant: false,
    stoppedEarly: false,
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
      signal: abort.signal,
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

  const stopped = abort.signal.aborted
  if (scanAbort === abort) scanAbort = null

  // ⚠️ Fold the user's tidy-up back in, because a scan has just rebuilt the
  // library from the files and thrown every correction away. Fixes are keyed by
  // album id and track id — both derived from the files themselves — so a
  // rescan of unchanged music reproduces exactly the ids they refer to. Without
  // this, tidying would last until the next time somebody added an album, which
  // is worse than not offering it.
  const fixes = await db.allFixes()
  let fixedTracks = result.tracks
  let fixedAlbums = result.albums
  if (fixes.length > 0) {
    const applied = applyFixes(result.tracks, result.albums, fixes)
    fixedTracks = applied.tracks
    fixedAlbums = applied.albums
    await Promise.all([db.putTracks(fixedTracks), db.putAlbums(fixedAlbums)])
  }

  set({
    status: fixedTracks.length > 0 ? 'ready' : 'empty',
    tracks: fixedTracks,
    albums: fixedAlbums,
    roots: [root],
    filesByPath: result.files,
    folderImages: result.images,
    refusals,
    progress: null,
    needsRegrant: false,
    stoppedEarly: stopped,
    // ⚠️ A stopped scan is not an error, so it does not get the error slot. It
    // is a library that is complete as far as it goes, and `ScanBanner` says so
    // with the button to finish the job — putting it in red would tell someone
    // their music is broken when what actually happened is that they asked.
    error: stopped || result.tracks.length > 0
      ? null
      : `Nothing playable in that folder — checked ${result.refused.size > 0 ? 'every file' : 'the whole folder'}.`,
  })
}
