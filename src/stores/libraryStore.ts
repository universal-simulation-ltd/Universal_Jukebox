import { create } from 'zustand'
import { releaseAllCovers, releaseCover } from '../lib/art'
import * as db from '../lib/library'
import { EXAMPLE_LABEL, EXAMPLE_ROOT_ID, buildExampleLibrary, exampleFile, isExampleTrack } from '../lib/exampleLibrary'
import { addScan, pathUnder, prefixOf, removeRoot, rootsNeedingAccess, uniqueLabel } from '../lib/roots'
import { hasDirectoryPicker, isPlayable, scan, REFUSED, type FoundImage, type ScanSource } from '../lib/scan'
import {
  NATIVE_ROOT_LABEL,
  NATIVE_ROOT_PATH,
  ensureNativeMusicFolder,
  nativePlatform,
  NativeFile,
  importFilesToNativeLibrary,
  isNativeShell,
  pickNativeMusicFolder,
  releaseNativeMusicFolder,
  usesChosenFolder,
  walkNativeLibrary,
} from '../lib/nativeFile'
import { applyFixes } from '../lib/tidy'
import type { Album, Root, ScanProgress, SourceFile, Track } from '../lib/types'

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
// ⚠️ 1b. THERE CAN BE SEVERAL FOLDERS (2026-09-09). Adding one ADDS to the
// library; it used to replace it. Every root files its tracks under its own
// name — `Music/Nick Cave/…` — and `lib/roots.ts` owns every rule that follows
// from that, including the path collision which had to be fixed first and the
// one-off cost of fixing it. Read that file's header before changing anything
// here: this store is the plumbing, and the arithmetic is all over there.
//
// ⚠️ 2. THE STORE HOLDS LIVE FILE HANDLES AND MUST NOT BE PERSISTED.
// `filesByPath` is the live handle to the actual bytes on disk. It is rebuilt on
// every scan and deliberately not written anywhere — a `File` outlives its
// permission by exactly nothing, and a stored one is a broken reference that
// looks valid.
//
// ⚠️ 2b. THE ENTRIES ARE `SourceFile`, NOT `File`, since the phone build
// (2026-09-09). Inside the native shell there is no `File` for a track in the
// app's music folder — only a path — and materialising one would mean pulling
// the whole file across the Capacitor bridge, which is the out-of-memory crash
// the header of `lib/scan.ts` forbids, reached from a different direction. A
// browser `File` satisfies `SourceFile` structurally, so nothing on the web path
// changed. See `lib/nativeFile.ts`.

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
  /** path → the file, for everything currently reachable. Never persisted. */
  filesByPath: Map<string, SourceFile>
  /** Directory → the images found in it, for the tidy-up. Never persisted. */
  folderImages: Map<string, FoundImage[]>
  canPersistFolder: boolean

  /** True once a scan has been stopped early, so the UI can say what it kept. */
  stoppedEarly: boolean

  hydrate(): Promise<void>
  /** Stop a running scan, keeping everything found so far. */
  stopScan(): void
  /** Choose a folder and ADD it to the library. */
  pickFolder(): Promise<void>
  /** The Firefox/Safari path, and "pick individual files". Also adds. */
  addFiles(files: FileList | File[], label?: string): Promise<void>
  /** Fill the library with the generated example records — see `lib/exampleLibrary.ts`. */
  loadExample(): Promise<void>
  /** Re-ask for one folder's permission and re-read it. */
  regrantFolder(id: string): Promise<void>
  /** Re-read one folder, picking up anything new inside it. */
  rescanFolder(id: string): Promise<void>
  /** Take one folder out of the library, leaving the others alone. */
  removeFolder(id: string): Promise<void>
  /** Forget the lot. */
  clear(): Promise<void>
  /**
   * Native only: read the phone's music folder and build the library from it.
   *
   * The native equivalent of `pickFolder`, minus the picking — there is exactly
   * one folder and the OS shares it with the Files app. See
   * `lib/nativeFile.ts`.
   *
   * ⚠️ Where the folder is CHOSEN instead (`usesChosenFolder` — Android today)
   * the first "scan" is a choice: with no folder chosen yet, or with access to
   * the chosen one gone, this hands over to `chooseNativeFolder`.
   */
  scanNativeFolder(): Promise<void>
  /**
   * Where `usesChosenFolder()` (Android today; any platform whose shell
   * registers a `JukeboxMusicFolder` plugin): open the system folder picker and
   * make what is chosen the library's phone folder, replacing the one before if
   * there was one. A no-op everywhere else.
   *
   * ⚠️ REPLACES rather than adds, unlike the web's "Add a folder". There is one
   * native root and `nativePath` is what marks it (see `scanNativeFolder`
   * below), so a second chosen folder would need a second native root, and
   * every native code path assumes one. Worth doing; not done.
   */
  chooseNativeFolder(): Promise<void>
  /**
   * Native only: copy picked files into the music folder, then re-scan.
   *
   * ⚠️ NOT the same as the web's `addFiles`, which keeps the picked `File`
   * objects and loses them on reload. This one writes them to disk first, so
   * what it adds is permanent.
   */
  importNativeFiles(files: FileList | File[]): Promise<void>
  /** How far an import has got, for something honest to show during a slow one. */
  importProgress: { done: number; total: number; name: string } | null
  fileFor(track: Track): SourceFile | null
  dismissError(): void
}

/**
 * The roots that cannot be played right now — each needs its folder back.
 *
 * ⚠️ DERIVED, not stored, and that is the multi-folder change in one line:
 * `needsRegrant` was a boolean about the whole library, and with several folders
 * the answer genuinely differs between them. Reading it from the live `File` map
 * means it is right the moment a folder is re-granted, with nothing having to
 * remember to clear a flag.
 *
 * ⚠️ TAKES ITS INPUTS, and is NOT a zustand selector. It was one — 
 * `useLibraryStore(needAccess)` — and that is an infinite render loop: a
 * selector returning a NEW ARRAY every call never compares equal to the last
 * one under `Object.is`, so the store re-renders the subscriber, which calls the
 * selector, which returns another new array. React stops it with "Maximum
 * update depth exceeded" and the app is dead on the landing page, before there
 * is even a library to check. Callers subscribe to the three pieces and
 * `useMemo` this.
 */
export function needAccessFrom(
  roots: Root[],
  tracks: Track[],
  filesByPath: Map<string, SourceFile>,
): Root[] {
  return rootsNeedingAccess(roots, tracks, filesByPath, isGenerated)
}

/** The example library's records are made on demand — no folder, ever. */
function isGenerated(root: Root): boolean {
  return root.id === EXAMPLE_ROOT_ID
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
  importProgress: null,
  folderImages: new Map(),
  canPersistFolder: hasDirectoryPicker(),
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
      // ⚠️ NOTHING sets a "needs permission" flag any more. Which folders are
      // unreachable is DERIVED, by `needAccess`, from the live `File` map —
      // which after a reload is empty, so every real folder needs its
      // permission back, and the example library never does because its audio
      // is generated rather than read. A stored flag was fine while there was
      // one folder and became a lie the moment there were two: re-granting one
      // of three would have cleared it for all of them.
    })

    // ⚠️ THE NATIVE LIBRARY COMES BACK BY ITSELF, and this is the whole payoff
    // of scanning a fixed folder rather than a chosen one. A `Root.nativePath`
    // is a plain string with no permission attached, so there is nothing to
    // re-grant and nothing to ask — the files can simply be found again.
    //
    // ⚠️ It re-walks but does NOT re-read: a `readdir` tree walk of a few
    // thousand files is milliseconds, while re-reading their tags is the full
    // scan the user already sat through. The tags are in IndexedDB already;
    // all that is missing after a relaunch is the live handles, which is
    // exactly what this puts back. Anything the walk no longer finds is simply
    // absent from the map, which `needAccess` already reads as unplayable.
    if (isNativeShell()) {
      // ⚠️ Before anything else native: on a fresh install iOS will not show
      // this app in the Files app until its Documents folder has something in
      // it, so the landing page's "put your music in the Universal Jukebox
      // folder" refers to a folder that does not exist yet.
      await ensureNativeMusicFolder()
      if (roots.some((r) => r.nativePath != null)) await reattachNative(set, get)
    }
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

  /**
   * Put the example library in, as if a folder of it had been scanned.
   *
   * ⚠️ It goes into IndexedDB like a real one, and that is deliberate: the demo
   * then survives a reload exactly as a real library does, and the tracks still
   * play afterwards because their audio is regenerated from their paths rather
   * than read from a disk. It never asks for a folder, because it has none —
   * `needAccess` skips it by id.
   *
   * ⚠️ It REPLACES everything, unlike adding a folder. It is offered only from
   * the landing page, which is only shown when there is nothing to replace, and
   * a demo that merged itself into somebody's real library would be a mess to
   * pick apart afterwards.
   */
  async loadExample() {
    releaseAllCovers()
    scanAbort?.abort()
    await db.clearLibrary()
    set({ status: 'scanning', tracks: [], albums: [], roots: [], error: null, stoppedEarly: false, refusals: [], progress: null })

    const { tracks, albums } = await buildExampleLibrary()
    const root: Root = {
      id: EXAMPLE_ROOT_ID,
      label: EXAMPLE_LABEL,
      prefix: EXAMPLE_LABEL,
      handle: null,
      scannedAt: Date.now(),
      trackCount: tracks.length,
    }
    await Promise.all([db.putTracks(tracks), db.putAlbums(albums), db.putRoot(root)])

    set({
      status: 'ready',
      tracks,
      albums,
      roots: [root],
      // Nothing to hold: the audio is made on demand by `fileFor` below.
      filesByPath: new Map(),
      folderImages: new Map(),
    })
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
   * Re-ask for ONE folder's permission, then re-read it.
   *
   * ⚠️ Must be called from a user gesture — a click handler, not an effect. The
   * browser drops a permission request that has no gesture behind it, and it
   * does so silently, which presents as a button that does nothing at all.
   *
   * ⚠️ ONE folder per press, deliberately. Permission is per handle, so three
   * folders is three prompts — and a loop over them fires those prompts inside
   * a single user gesture, which browsers may collapse to one grant and drop
   * the rest with no error. A button per folder is honest about the cost and
   * cannot half-work.
   */
  async regrantFolder(id) {
    const root = get().roots.find((r) => r.id === id)
    if (!root?.handle) return
    const handle = root.handle as FileSystemDirectoryHandle & {
      queryPermission?(d: { mode: 'read' }): Promise<PermissionState>
      requestPermission?(d: { mode: 'read' }): Promise<PermissionState>
    }
    try {
      let state = (await handle.queryPermission?.({ mode: 'read' })) ?? 'granted'
      if (state !== 'granted') state = (await handle.requestPermission?.({ mode: 'read' })) ?? 'denied'
      if (state !== 'granted') {
        set({ error: `Without access to ${root.label} its tracks cannot be played. Nothing was lost — the library is still here.` })
        return
      }
    } catch {
      set({ error: `${root.label} could not be opened. It may have been moved, renamed, or be on a drive that is no longer connected.` })
      return
    }
    await runScan(set, get, root.handle, root.label, root.handle, root.id)
  },

  async rescanFolder(id) {
    const root = get().roots.find((r) => r.id === id)
    if (!root) return
    // The example library has no folder — "rescan" is simply "build it again".
    if (root.id === EXAMPLE_ROOT_ID) {
      await get().loadExample()
      return
    }
    if (root.handle) {
      await get().regrantFolder(id)
      return
    }
    // No handle means no way back to the folder without the picker. Say so
    // rather than pretending to rescan.
    set({
      error: `This browser can’t reopen a folder on its own — choose ${root.label} again to rescan it. Your library and covers are kept, so it will be quick.`,
    })
  },

  /**
   * Take one folder out, leaving the others exactly as they were.
   *
   * ⚠️ Everything about which tracks belong to it comes from the path prefix
   * (`lib/roots.ts`), which is the whole reason the prefix exists. The database
   * is then rewritten to match the merged result rather than diffed — see
   * `db.replaceLibrary` for why.
   */
  async removeFolder(id) {
    const root = get().roots.find((r) => r.id === id)
    if (!root) return
    const prefix = prefixOf(root)
    const merged = removeRoot({ tracks: get().tracks, albums: get().albums }, prefix)
    const roots = get().roots.filter((r) => r.id !== id)

    // ⚠️ Only the covers of albums that have actually gone. `releaseAllCovers`
    // would drop every object URL in the app, including those of the records
    // still in the library and possibly the one playing.
    const surviving = new Set(merged.albums.map((a) => a.id))
    for (const album of get().albums) {
      if (!surviving.has(album.id)) releaseCover(album.id)
    }

    const files = new Map<string, SourceFile>(get().filesByPath)
    for (const path of [...files.keys()]) {
      if (pathUnder(path, prefix)) files.delete(path)
    }

    await Promise.all([
      db.replaceLibrary(merged.tracks, merged.albums),
      db.deleteRoot(id),
    ])
    set({
      tracks: merged.tracks,
      albums: merged.albums,
      roots,
      filesByPath: files,
      status: merged.tracks.length > 0 ? 'ready' : 'empty',
      error: null,
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
      error: null,
      stoppedEarly: false,
    })
  },

  async scanNativeFolder() {
    if (!isNativeShell()) return
    // ⚠️ THE EXISTING ROOT IS FOUND BY `nativePath`, NOT BY ID, and the
    // difference is a bug that would only show on the second scan. `runScan`
    // derives a new root's id from its LABEL, so the first native scan creates
    // a root whose id is "Music" — not `NATIVE_ROOT_ID`. Looking it up by that
    // constant afterwards finds nothing, `existingId` stays undefined, and
    // `uniqueLabel` dutifully files the same folder a second time as
    // "Music (2)": one folder, two roots, every track in the library twice.
    // There is exactly one native root, and `nativePath` is what marks it.
    const existing = get().roots.find((r) => r.nativePath != null)
    if (usesChosenFolder() && !existing?.nativePath) {
      // Android with nothing chosen yet: "scan" can only mean "choose".
      await get().chooseNativeFolder()
      return
    }
    const outcome = await scanNative(
      set,
      get,
      existing?.nativePath ?? NATIVE_ROOT_PATH,
      existing?.id,
      NATIVE_ROOT_LABEL,
    )
    // ⚠️ Android has lost the folder — moved, renamed, deleted, or access
    // withdrawn in Settings. Choosing it again is the only way back, and this
    // was a tap, so the picker opens now rather than an error naming a fix the
    // screen has no button for. Backing out of it leaves the error showing.
    if (outcome === 'unreadable' && usesChosenFolder()) await get().chooseNativeFolder()
  },

  async chooseNativeFolder() {
    if (!usesChosenFolder()) return
    let picked
    try {
      picked = await pickNativeMusicFolder()
    } catch (err) {
      console.error('[jukebox] The folder picker failed:', err)
      set({ error: 'That folder could not be used — the phone would not let the app keep access to it. Try again, or choose a different folder.' })
      return
    }
    if (!picked) return // Backed out of the picker: not an error, nothing to say.

    const existing = get().roots.find((r) => r.nativePath != null)
    const outcome = await scanNative(set, get, picked.uri, existing?.id, picked.name)
    // Hold exactly one grant — the folder the library now reads. On success the
    // old folder's goes; on failure the new one's does, since the library is
    // still pointed at the old folder.
    const unused = outcome === 'ok' ? existing?.nativePath : picked.uri
    const inUse = outcome === 'ok' ? picked.uri : existing?.nativePath
    if (unused && unused !== inUse) void releaseNativeMusicFolder(unused)
  },

  async importNativeFiles(files) {
    const list = Array.from(files)
    if (list.length === 0 || !isNativeShell()) return
    set({ importProgress: { done: 0, total: list.length, name: '' }, error: null })
    let copied = 0
    try {
      copied = await importFilesToNativeLibrary(list, (done, total, name) =>
        set({ importProgress: { done, total, name } }),
      )
    } finally {
      set({ importProgress: null })
    }
    if (copied === 0) {
      set({ error: 'None of those files could be copied into the music folder.' })
      return
    }
    await get().scanNativeFolder()
  },

  fileFor(track) {
    const file = get().filesByPath.get(track.path)
    if (file) return file
    // ⚠️ The example library's audio does not exist until this asks for it, and
    // then it is synthesised on the spot rather than read. That is the whole
    // reason a demo of a local-file player can ship with no files in it — see
    // `lib/exampleLibrary.ts`.
    if (isExampleTrack(track)) return exampleFile(track)
    return null
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
/**
 * Where to put the music, in the words of the platform the user is holding.
 *
 * ⚠️ Names the actual path through the Files app rather than saying "the music
 * folder". The folder is not visible from inside this app, and a person who has
 * just been told there is no music in it has no way to find out where it is —
 * which is the whole reason the first version of this read as a dead end.
 */
function emptyFolderMessage(): string {
  if (usesChosenFolder()) {
    return 'No music in that folder. Copy albums into it from a computer or with the Files app — Artist/Album/track.mp3 is exactly right — then scan again, or choose a different folder.'
  }
  const where =
    nativePlatform() === 'ios'
      ? 'Open the Files app, go to On My iPhone \u2192 Universal Jukebox, and copy an album in.'
      : 'Copy an album into the Universal Jukebox folder in your Files app.'
  return `No music in your folder yet. ${where} Folders are kept, so Artist/Album/track.mp3 is exactly right \u2014 then scan again. Or tap \u201cadd music from this device\u201d to pick files here.`
}

let scanAbort: AbortController | null = null

/**
 * Walk a native music folder and scan what is in it — the part of a native
 * scan that is the same on both platforms.
 *
 * `folder` is `Root.nativePath`: `''` on iOS, where the music folder IS
 * Documents, and the chosen folder's tree URI on Android. Returns how it went,
 * because the callers do different things next — Android re-opens the picker
 * on `'unreadable'`, and `chooseNativeFolder` gives back whichever folder grant
 * the library is not using.
 */
async function scanNative(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
  folder: string,
  existingId: string | undefined,
  label: string,
): Promise<'ok' | 'empty' | 'unreadable'> {
  set({ status: 'scanning', error: null, progress: { seen: 0, added: 0, skipped: 0, where: '', done: false } })
  let entries
  try {
    entries = await walkNativeLibrary(undefined, folder)
  } catch (err) {
    console.error('[jukebox] Could not read the music folder:', err)
    set({
      status: get().tracks.length > 0 ? 'ready' : 'empty',
      progress: null,
      error: usesChosenFolder()
        ? 'That folder could not be opened — it may have been moved or renamed, or access to it was withdrawn. Choose it again.'
        : 'The music folder could not be read. If the app was just installed, try opening it again.',
    })
    return 'unreadable'
  }

  // ⚠️ A SCAN THAT FINDS NOTHING MUST SAY SO. This used to `set({ error: null })`
  // and return, which on a fresh install — the one state where every user
  // starts — made "Scan my music folder" a button that did *literally
  // nothing*: no spinner, no message, no change. It was reported as broken on
  // the first launch, and it was right to be.
  //
  // ⚠️ Counted on PLAYABLE files, not on entries. The folder is seeded with a
  // readme so that iOS shows it in the Files app at all (see
  // `ensureNativeMusicFolder`), so "empty" is never actually empty — an
  // `entries.length === 0` check would be dead code and the honest case would
  // fall through to the scanner's much vaguer "nothing playable" line.
  if (!entries.some((e) => isPlayable(e.name))) {
    set({
      status: get().tracks.length > 0 ? 'ready' : 'empty',
      progress: null,
      error: emptyFolderMessage(),
    })
    return 'empty'
  }
  await runScan(
    set,
    get,
    entries,
    label,
    null,
    existingId,
    // Empty on iOS but NOT null: `nativePath != null` is what marks a root as
    // the native one, in `scanNativeFolder` and in `hydrate`.
    folder,
  )
  return 'ok'
}

/**
 * Put the native music folder's live files back, without re-scanning it.
 *
 * The cheap half of a scan: walk the tree, match what is there against the
 * track paths already in the library, and fill `filesByPath`. No file is read
 * and no tag is parsed, so this costs a `readdir` per directory and nothing
 * else.
 *
 * ⚠️ Matching is by PATH ALONE, deliberately, even though `trackKey` is
 * path + size + mtime. A file that was edited in place — retagged on a desktop
 * and re-synced — has a new size or mtime and therefore a new track id, so an
 * id match would drop it and show the track as missing until a full re-scan.
 * Its path has not changed and it is plainly the same track, so it plays. The
 * stale tags in the library are what "Rescan" is for, and this app already
 * treats everything in the database as disposable (see `lib/types.ts`).
 *
 * ⚠️ On Android this is a walk of the CHOSEN folder, and it never opens the
 * picker: it runs at launch, with nobody's tap behind it. If access has gone,
 * the tracks simply stay unplayable and the banner's Rescan — a tap — is what
 * asks for the folder again.
 */
async function reattachNative(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
): Promise<void> {
  const root = get().roots.find((r) => r.nativePath != null)
  if (!root) return
  let entries
  try {
    entries = await walkNativeLibrary(undefined, root.nativePath ?? NATIVE_ROOT_PATH)
  } catch (err) {
    console.error('[jukebox] Could not re-read the music folder on startup:', err)
    return
  }
  const prefix = prefixOf(root)
  const files = new Map<string, SourceFile>(get().filesByPath)
  for (const entry of entries) {
    files.set(prefix ? `${prefix}/${entry.path}` : entry.path, new NativeFile(entry))
  }
  set({ filesByPath: files })
}

async function runScan(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
  source: ScanSource,
  label: string,
  handle: FileSystemDirectoryHandle | null,
  /** Re-scanning an existing root, rather than adding a new one. */
  existingId?: string,
  /** Set for the native music folder — the phone's answer to `handle`. */
  nativePath: string | null = null,
) {
  // A second scan started while one is running aborts the first, or the two
  // walks interleave into one library and the progress count runs backwards.
  scanAbort?.abort()
  const abort = new AbortController()
  scanAbort = abort

  // ⚠️ THE EXAMPLE LIBRARY STEPS ASIDE FOR REAL MUSIC. Adding a folder now ADDS,
  // which for every real folder is the point — and for the demo would mean
  // eleven records by four artists who do not exist quietly mixed in among
  // somebody's own albums, indistinguishable in the grid and removable only by
  // knowing which names were fake. It is a demo; the moment there is real music
  // it has done its job.
  if (get().roots.some((r) => r.id === EXAMPLE_ROOT_ID)) {
    await get().removeFolder(EXAMPLE_ROOT_ID)
  }

  /**
   * What this root is called, and therefore what its tracks are filed under.
   *
   * ⚠️ Re-scanning keeps the root's existing prefix, come what may. Deriving it
   * again from the folder's name would rename the root — and since the prefix
   * IS the identity, a renamed root is a second root: the library would end up
   * holding the same music twice, under two names, from one press of "rescan".
   */
  const existing = existingId ? get().roots.find((r) => r.id === existingId) : undefined
  const taken = get().roots.filter((r) => r.id !== existingId).map((r) => prefixOf(r))
  const prefix = existing ? prefixOf(existing) : uniqueLabel(label, taken)
  const rootId = existing?.id ?? prefix

  // ⚠️ The library that is already loaded, captured BEFORE the scan starts.
  // Everything below merges into this snapshot rather than into `get()`, so a
  // batch arriving mid-walk cannot fold itself into a library that already
  // contains the previous batch.
  const before = { tracks: get().tracks, albums: get().albums }
  const scanned: Track[] = []
  const scannedAlbums = new Map<string, Album>()

  set({
    status: 'scanning',
    error: null,
    stoppedEarly: false,
    progress: { seen: 0, added: 0, skipped: 0, where: '', done: false },
  })

  let result
  try {
    result = await scan(source, {
      prefix,
      onBatch: (newTracks, newAlbums) => {
        for (const t of newTracks) scanned.push(t)
        for (const a of newAlbums) scannedAlbums.set(a.id, a)
        // ⚠️ The GRID fills in from the merge, not from the batch. Setting the
        // batch alone was right when a scan replaced the library and would now
        // make the other folders vanish for the length of the walk.
        const merged = addScan(before, prefix, { tracks: scanned, albums: [...scannedAlbums.values()] })
        void db.putTracks(newTracks)
        void db.putAlbums(newAlbums)
        set({ tracks: merged.tracks, albums: merged.albums })
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

  const stopped = abort.signal.aborted
  if (scanAbort === abort) scanAbort = null

  // ⚠️ Fold the user's tidy-up back in, because a scan has just rebuilt this
  // folder from the files and thrown its corrections away. Fixes are keyed by
  // album id and track id — both derived from the files themselves — so a
  // rescan of unchanged music reproduces exactly the ids they refer to. Without
  // this, tidying would last until the next time somebody added an album, which
  // is worse than not offering it.
  //
  // ⚠️ Applied to the WHOLE merged library, not to this scan's tracks: a fix
  // can move a track into an album that lives in a different folder, and
  // `applyFixes` drops any fix whose target album it cannot see.
  const merged = addScan(before, prefix, {
    tracks: result.tracks,
    albums: result.albums,
  })
  const fixes = await db.allFixes()
  const fixed = fixes.length > 0 ? applyFixes(merged.tracks, merged.albums, fixes) : merged

  const root: Root = {
    id: rootId,
    label: prefix,
    prefix,
    handle,
    nativePath,
    scannedAt: Date.now(),
    trackCount: result.tracks.length,
  }

  // The whole picture, written in one go — see `db.replaceLibrary` for why this
  // is a rewrite rather than a diff.
  await Promise.all([db.replaceLibrary(fixed.tracks, fixed.albums), db.putRoot(root)])

  const refusals = [...result.refused.entries()]
    .map(([ext, count]) => ({ ext, count, why: REFUSED[ext] ?? '' }))
    .filter((r) => r.why)
    .sort((a, b) => b.count - a.count)

  // The files of every OTHER folder survive: adding a second folder must not
  // make the first one unplayable.
  const files = new Map<string, SourceFile>(get().filesByPath)
  for (const path of [...files.keys()]) {
    if (pathUnder(path, prefix)) files.delete(path)
  }
  for (const [path, file] of result.files) files.set(path, file)

  const images = new Map(get().folderImages)
  for (const [dir, found] of result.images) images.set(dir, found)

  set({
    status: fixed.tracks.length > 0 ? 'ready' : 'empty',
    tracks: fixed.tracks,
    albums: fixed.albums,
    roots: [...get().roots.filter((r) => r.id !== rootId), root],
    filesByPath: files,
    folderImages: images,
    refusals,
    progress: null,
    stoppedEarly: stopped,
    // ⚠️ A stopped scan is not an error, so it does not get the error slot. It
    // is a library that is complete as far as it goes, and `ScanBanner` says so
    // with the button to finish the job — putting it in red would tell someone
    // their music is broken when what actually happened is that they asked.
    error: stopped || result.tracks.length > 0
      ? null
      : `Nothing playable in ${prefix} — checked ${result.refused.size > 0 ? 'every file' : 'the whole folder'}.`,
  })
}
