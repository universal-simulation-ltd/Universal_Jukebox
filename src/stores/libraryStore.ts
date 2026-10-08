import { create } from 'zustand'
import { releaseAllCovers, releaseCover } from '../lib/art'
import * as db from '../lib/library'
import { EXAMPLE_LABEL, EXAMPLE_ROOT_ID, buildExampleLibrary, exampleFile, isExampleTrack } from '../lib/exampleLibrary'
import {
  MUSIC_LIBRARY_LABEL,
  MUSIC_LIBRARY_ROOT_ID,
  hasMusicLibrary,
  isMusicLibraryTrack,
  preparedFile,
  prepareSong,
  readMusicLibrary,
  requestMusicLibraryAccess,
  type MusicLibraryRead,
} from '../lib/appleMusic'
import { importWithNativePicker } from '../lib/nativeImport'
import {
  addScan,
  isFolderNamed,
  nativeRoots,
  orphanRoots,
  pathUnder,
  planNativePick,
  prefixOf,
  removeRoot,
  rootsNeedingAccess,
  uniqueLabel,
  unusedGrants,
  withCounts,
} from '../lib/roots'
import { filesUnder, hasDirectoryPicker, isPlayable, scan, REFUSED, type FoundImage, type ScanSource } from '../lib/scan'
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
  hasOwnMusicFolder,
  usesChosenFolder,
  walkNativeLibrary,
} from '../lib/nativeFile'
import { applyFixes } from '../lib/tidy'
import { learnLengths } from '../lib/lengths'
import { holdSession } from '../lib/session'
import { mergeDiscSets } from '../lib/discs'
import type { Album, Root, ScanProgress, SourceFile, Track } from '../lib/types'
import { compareNumeric } from '../lib/collate'
import { host, isDesktopApp } from '../lib/host'

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
// ⚠️ 1c. AND IN THE PHONE APPS TOO (2026-09-14). They had one folder, and
// choosing another replaced it. Now "Add a folder…" adds there as well: each
// native root is a folder with its own prefix and its own `nativePath` (the
// app's own folder is `''`, a chosen one its uri), the native side holds one
// grant per uri, and a grant is given back only once no root reads it. The
// rules — same uri is a rescan, same NAME is a second folder — are
// `planNativePick` and `unusedGrants` in `lib/roots.ts`.
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
  /** What the last scan found and could not take — formats, or kinds of song — and why. */
  refusals: Refusal[]
  error: string | null
  /** path → the file, for everything currently reachable. Never persisted. */
  filesByPath: Map<string, SourceFile>
  /** Directory → the images found in it, for the tidy-up. Never persisted. */
  folderImages: Map<string, FoundImage[]>
  canPersistFolder: boolean

  /**
   * The id of the root whose scan was stopped early, or null — so the UI can
   * say what it kept, and "Scan the rest" reads THAT root.
   *
   * ⚠️ An id, not a flag (2026-09-13). As a flag the banner rescanned
   * `roots[0]`, which is the OLDEST root, not the one just stopped — with a
   * folder and then the Music library, stopping the import offered to rescan
   * the folder.
   */
  stoppedEarly: string | null

  /**
   * Folders whose permission has just been given back and whose rescan is
   * still running — so the permission banner can say "Access allowed" and get
   * out of the way, rather than asking again for the whole length of the scan.
   *
   * ⚠️ The banner is DERIVED from tracks with no file (`needAccessFrom`), and a
   * scan only hands its files over when it finishes — so without this, the
   * folder you had just allowed kept asking for permission until the last file
   * was read (James, 2026-10-08: "when clicking allow access i'd expect the
   * banner to close"). Not saved: it means nothing after a restart.
   */
  reconnecting: string[]
  /**
   * The folders are being found again at launch — `reattachNative` /
   * `reattachFolders`. The permission banner waits for this: shown from the
   * moment the library is, it flashed up and vanished on every launch where
   * the folder came straight back (James, 2026-10-08: "I see the banner and
   * then it disappears, can it just not be shown").
   */
  reattaching: boolean

  hydrate(): Promise<void>
  /** Stop a running scan, keeping everything found so far. */
  stopScan(): void
  /** Choose a folder and ADD it to the library. */
  pickFolder(): Promise<void>
  /**
   * A folder with no stored handle, chosen again through the directory picker
   * where there is one. Must be called from a click, like `regrantFolder`.
   */
  chooseFolderAgain(id: string): Promise<void>
  /**
   * The Firefox/Safari path, and "pick individual files". Also adds — unless
   * `intoRootId` names the folder these files are that folder chosen AGAIN, in
   * which case it is a rescan of that folder (see the implementation).
   */
  addFiles(files: FileList | File[], label?: string, intoRootId?: string): Promise<void>
  /** Fill the library with the generated example records — see `lib/exampleLibrary.ts`. */
  loadExample(): Promise<void>
  /**
   * True while the example library is on screen IN PLACE OF a real library,
   * which stays saved exactly as it was — "Try the example library" in Tune
   * this app. See `tryExample`.
   */
  trying: boolean
  /**
   * Show the example library for a while, without touching the real one.
   *
   * ⚠️ NOT `loadExample`, which REPLACES the library — clears IndexedDB, gives
   * back the phone's folder grants — and is therefore offered only where there
   * is nothing to replace (the landing page). This is the second door the
   * example library never had (backlog, 2026-09-29: "if it wants a second
   * door … that door needs a confirm and a way back, and neither exists"): the
   * real library is set aside IN MEMORY, live file handles and all, and
   * nothing is written anywhere. `leaveExample` puts it back as it was.
   *
   * ⚠️ AND A RELOAD IS ALSO A WAY BACK, by construction. Nothing about the
   * trial is persisted — not the flag, not the example's records — so the page
   * opens again on the real library read from IndexedDB, which was never
   * touched. That was chosen over "still trying, after a reload" on purpose:
   * the alternative means persisting a second library beside the first and a
   * flag saying which is real, and every bug in THAT is somebody opening the
   * app to a demo with no idea where their music went. The strip that says
   * "Back to my music" is the way back you can see; closing the app is the one
   * that cannot fail.
   *
   * Only from a real library that has finished loading: with nothing to set
   * aside it is the landing page's door, and mid-scan there is no settled
   * library to put back.
   */
  tryExample(): Promise<void>
  /** End `tryExample`: the real library back exactly as it was set aside. */
  leaveExample(): void
  /** Re-ask for one folder's permission and re-read it. */
  regrantFolder(id: string): Promise<void>
  /** Re-read one folder, picking up anything new inside it. */
  rescanFolder(id: string): Promise<void>
  /** Take one folder out of the library, leaving the others alone. */
  removeFolder(id: string): Promise<void>
  /** Forget the lot. */
  clear(): Promise<void>
  /**
   * Native only: read a phone folder and build the library from it.
   *
   * With `id`: re-read THAT native root — the permission banner's "Rescan".
   * If it is a chosen folder that can no longer be opened, the picker opens so
   * it can be chosen again (`addNativeFolder(id)`): this was a tap on that
   * folder's own button, and choosing it is the only way back.
   *
   * Without: the app's OWN folder (iOS — the Files app's "Universal Jukebox"),
   * adding it as a root if the library does not read it yet. That is the
   * landing page's "Files" answer, and where "Add tracks…" copies to. Android
   * has no own folder, so there it reads every chosen folder, or — with none
   * yet — asks for one.
   */
  scanNativeFolder(id?: string): Promise<void>
  /**
   * Where `usesChosenFolder()` (Android and iOS; any platform whose shell
   * registers a `JukeboxMusicFolder` plugin): open the system folder picker and
   * ADD what is chosen to the library, as the web's "Add a folder" does. A
   * no-op everywhere else.
   *
   * ⚠️ It used to REPLACE the one phone folder (there was one native root until
   * 2026-09-14). Now: the same folder again is a rescan of it; a folder with a
   * name already taken is kept beside it as "Music (2)" (James); and with
   * `intoRootId` — a lost folder being chosen again — a folder of that root's
   * name takes the root over, keeping every track id. See `planNativePick`.
   */
  addNativeFolder(intoRootId?: string): Promise<void>
  /**
   * Native only: re-read every phone folder, one after another — the app
   * menu's "Rescan". Never opens the picker: a lost folder is left for its own
   * button in the permission banner, rather than a run of pickers nobody asked
   * for. With no folder at all it is `scanNativeFolder()`.
   */
  rescanNativeFolders(): Promise<void>
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
  /**
   * Does this track need a file MADE before it can play? True only for a
   * Music-library song not played recently — see `lib/appleMusic.ts`.
   * Synchronous and cheap: the player asks it on every start.
   */
  needsPreparing(track: Track): boolean
  /** Make the track playable; `null` if it cannot be. The player awaits this. */
  prepare(track: Track): Promise<SourceFile | null>
  /**
   * iOS: read the iPhone's own Music library — the songs synced from a Mac —
   * into the library, or refresh it. Asks for permission the first time.
   */
  importMusicLibrary(): Promise<void>
  /** iOS: add audio files through the native picker, then rescan. */
  pickNativeFiles(): Promise<void>
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

/** One kind of file a scan found and could not take, and why. */
export interface Refusal {
  ext: string
  /**
   * What to call it on screen, where `.EXT` would be wrong. The Music
   * library's skips are kinds of SONG, not formats, and shown as extensions
   * they read as ".PROTECTED" and ".ICLOUD" (2026-09-10). Absent for a folder
   * scan's refused format, which is named by its extension.
   */
  label?: string
  count: number
  why: string
}

/** How a refusal is named in the skipped-files report: its label, else `.EXT`. */
export function refusalLabel(refusal: Refusal): string {
  return refusal.label ?? `.${refusal.ext.toUpperCase()}`
}

/** The example library's records are made on demand — no folder, ever. */
function isGenerated(root: Root): boolean {
  // ⚠️ The Music library is "generated" in the sense that matters here: none of
  // its tracks has a file until one is played (`lib/appleMusic.ts`), so an
  // empty file map says nothing about whether it is reachable. Without this,
  // every relaunch would report it as a folder that needs its permission back
  // — and offer a "Choose folder" button for a library that has no folder.
  return root.id === EXAMPLE_ROOT_ID || root.source === 'music-library'
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
    return compareNumeric(a.path, b.path)
  })
}

/**
 * The one read of the stored library, per page.
 *
 * ⚠️ `status` MUST leave `'loading'`, on every path including a thrown one.
 * The app renders nothing at all while it is loading (`lib/boot.ts`), so a
 * hydrate that never finished used to cost a flash of the landing page and now
 * costs the whole screen. Nothing below is expected to throw — `library.ts`
 * resolves rather than rejects when storage is unavailable — but "expected" is
 * not a guarantee, and the native branch talks to a plugin.
 */
async function hydrateOnce(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
): Promise<void> {
  try {
    const [storedTracks, storedAlbums, storedRoots] = await Promise.all([db.allTracks(), db.allAlbums(), db.allRoots()])
    // Tracks an interrupted scan left filed under no folder get one back, so
    // they can ask for it — see `orphanRoots`. Not in the phone apps, whose
    // folders are found again by path and never chosen through a picker.
    const orphans = isNativeShell() ? [] : orphanRoots(storedRoots, storedTracks, Date.now())
    for (const root of orphans) void db.putRoot(root)
    const roots = [...storedRoots, ...orphans]
    // A disc set stored as separate albums comes back as one — `lib/discs.ts`.
    const joined = mergeDiscSets(storedTracks, storedAlbums)
    const tracks = joined.tracks
    // ⚠️ THE STORED COUNTS ARE NOT TRUSTED. The "Full albums" and "Min. 3"
    // filters read `trackCount`, and a count that is wrong in storage would
    // stay wrong at every launch while the album page, which counts the tracks
    // it lists, says something else. One pass over the tracks rules that out.
    // [Correction 2026-09-30: this was added for James's "American Boy" (one
    // track, on the Albums tab under a lit "Full albums"). That was not a stale
    // count: the lit pill meant the filter was OFF, and the pill said "Full
    // albums" either way. The label now says what is shown (`App.tsx`). The
    // recount stays, as a guard.]
    const albums = withCounts(tracks, joined.albums)
    set({
      tracks,
      albums,
      roots,
      status: tracks.length > 0 ? 'ready' : 'empty',
      // Cleared in the `finally` below, whichever way the reattach goes.
      reattaching: roots.some((r) => r.handle || r.nativePath != null),
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
    //
    // ⚠️ AFTER the `set` above, not before it, and that ordering is now what
    // gets the app on screen: the shelves are shown from the cache the instant
    // it is read, while the folder walk that puts the live handles back carries
    // on behind them.
    if (isNativeShell()) {
      // ⚠️ Before anything else native: on a fresh install iOS will not show
      // this app in the Files app until its Documents folder has something in
      // it, so the landing page's "put your music in the Universal Jukebox
      // folder" refers to a folder that does not exist yet.
      await ensureNativeMusicFolder()
      // Every phone folder, however many — a library from the one-folder build
      // is simply one of them (see "The phone apps' folders" in `lib/roots.ts`).
      if (nativeRoots(roots).length > 0) await reattachNative(set, get)
    }
    // ⚠️ And a chosen folder whose permission is still held comes back the
    // same way, with no banner and no click (James, 2026-10-08: "can't we have
    // a permanent permission so the allow access is automatic?"). See
    // `reattachFolders`.
    else await reattachFolders(set, get)
  } catch (err) {
    console.error('[jukebox] Could not read the stored library:', err)
    // Show the app rather than an empty page: the front door is a working
    // screen, and every button on it still does what it says.
    if (get().status === 'loading') set({ status: 'empty' })
  } finally {
    // ⚠️ ALWAYS, or a reattach that threw would hide the banner for good —
    // the one thing that says why nothing plays.
    if (get().reattaching) set({ reattaching: false })
  }
}

/**
 * The in-flight (or finished) read of the stored library — see `hydrate`.
 *
 * ⚠️ Deliberately NOT reset by `clear()` or a rescan. This is "has the page
 * already loaded what was on disk when it opened", which happens exactly once;
 * everything after it is the store's own state and needs no re-read.
 */
let hydration: Promise<void> | null = null

/** How often a running scan publishes what it has found (see `runScan`). */
const SCAN_PUBLISH_MS = 750

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
  reconnecting: [],
  reattaching: false,
  canPersistFolder: hasDirectoryPicker(),
  stoppedEarly: null,
  trying: false,

  /**
   * Load whatever last session left behind.
   *
   * Note what this does NOT do: ask for permission. A permission prompt fired
   * on page load is one the browser rejects (it needs a user gesture) and one
   * the user has no context for. The library is shown from the cache, and the
   * re-grant is a button.
   *
   * ⚠️ ONCE PER PAGE, however many times it is called. `main.tsx` starts it
   * before React renders (the read then overlaps mounting instead of following
   * it) and `App` awaits it again from an effect, which under StrictMode is
   * itself two calls — three reads of the whole library where one will do. The
   * promise is the memo, so every caller gets the same one.
   */
  hydrate() {
    hydration ??= hydrateOnce(set, get)
    return hydration
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

  async chooseFolderAgain(id) {
    const root = get().roots.find((r) => r.id === id)
    if (!root || !hasDirectoryPicker()) return
    let handle: FileSystemDirectoryHandle
    try {
      handle = await (window as unknown as {
        showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker({ mode: 'read' })
    } catch {
      return
    }
    // INTO this root when it is the folder asked for — the same rule as
    // `addFiles` — and now with a handle, so the next launch only has to ask
    // for permission rather than for the folder.
    if (!isFolderNamed(root, handle.name)) {
      await runScan(set, get, handle, handle.name, handle)
      return
    }
    // The folder asked for: the banner stands down now, with its tick, rather
    // than going on asking for a folder that is already being read — the same
    // as `regrantFolder` (James, 2026-10-08: the prompt sat above the scan).
    set({ reconnecting: [...get().reconnecting.filter((r) => r !== id), id] })
    try {
      await runScan(set, get, handle, handle.name, handle, root.id)
    } finally {
      set({ reconnecting: get().reconnecting.filter((r) => r !== id) })
    }
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
    // ⚠️ Never while TRYING the example: this one clears the stored library,
    // and the stored library is the real one the trial promised to keep. Only
    // the landing page calls it, and that is not on screen during a trial —
    // this is the belt for whatever calls it next.
    if (get().trying) return
    releaseAllCovers()
    scanAbort?.abort()
    // Replaces everything, so a scan still finishing must not write over it.
    generation++
    const grants = get().roots.map((r) => r.nativePath)
    await db.clearLibrary()
    set({ status: 'scanning', tracks: [], albums: [], roots: [], error: null, stoppedEarly: null, refusals: [], progress: null })
    releaseUnused(get, grants)

    const { tracks, albums } = await buildExampleLibrary()
    const root = exampleRoot(tracks.length)
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

  async tryExample() {
    const ready = () => {
      const now = get()
      return !now.trying && now.status === 'ready' && !now.roots.some((r) => r.id === EXAMPLE_ROOT_ID)
    }
    if (!ready()) return
    // Anything that throws the library away while the sleeves are being drawn
    // wins — the trial then has nothing to set aside.
    const started = generation
    const { tracks, albums } = await buildExampleLibrary()
    if (generation !== started || !ready()) return

    // ⚠️ SET ASIDE NOW, after the build, not before it. A duration learnt by
    // the player or a tidy-up applied while the records were being cut changed
    // the library in the meantime, and putting back an older copy would undo it.
    trial = setAside(get())
    set({
      trying: true,
      status: 'ready',
      tracks,
      albums,
      roots: [exampleRoot(tracks.length)],
      filesByPath: new Map(),
      folderImages: new Map(),
      refusals: [],
      stoppedEarly: null,
      progress: null,
      error: null,
    })
    // ⚠️ AFTER the `set`, which is what tells the player to save exactly where
    // it was and stop (see the end of `playerStore`). Held before it, that last
    // save would be the one thing refused.
    holdSession(true)
  },

  leaveExample() {
    const kept = trial
    if (!get().trying || !kept) return
    trial = null
    // Only the example's own sleeves. The real library's are still minted and
    // cached, which is part of why the way back is instant.
    for (const album of get().albums) releaseCover(album.id)
    set({ trying: false, ...kept, progress: null, error: null })
    // After the `set`, which is what stopped the example's queue: nothing it
    // does as it winds down may reach "Resume listening".
    holdSession(false)
  },

  async addFiles(files, label, intoRootId) {
    const list = Array.from(files)
    if (list.length === 0) return
    // Real music ends a trial — see `leaveFirst`.
    leaveFirst(get)
    // The label is the top folder of the first path, which is what the person
    // actually chose — `webkitRelativePath` carries it and nothing else does.
    const first = (list[0] as File & { webkitRelativePath?: string }).webkitRelativePath
    const derived = first && first.includes('/') ? first.slice(0, first.indexOf('/')) : label
    const name = derived ?? 'Chosen files'
    // ⚠️ A stranded folder chosen AGAIN is a rescan of that folder, not a second
    // one. Without this the "Choose folder" button — the only way back on
    // Firefox and Safari — filed the folder as "Music (2)" beside the original
    // "Music", which stayed stranded and kept asking for itself. `runScan`
    // with the root's id keeps its prefix, so every track id comes back the
    // same. Only when the name matches, though: somebody asked for Music who
    // picks Podcasts has added Podcasts.
    const into = intoRootId ? get().roots.find((r) => r.id === intoRootId) : undefined
    if (!into || !isFolderNamed(into, name)) {
      await runScan(set, get, list, name, null)
      return
    }
    // Its banner row stands down while it is read — see `chooseFolderAgain`.
    set({ reconnecting: [...get().reconnecting.filter((r) => r !== into.id), into.id] })
    try {
      await runScan(set, get, list, name, null, into.id)
    } finally {
      set({ reconnecting: get().reconnecting.filter((r) => r !== into.id) })
    }
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
    leaveFirst(get)
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
    // Allowed: the banner can stand down now, not when the scan ends — see
    // `reconnecting`. Cleared however the scan ends, so a folder that really
    // does still need something can ask again.
    set({ reconnecting: [...get().reconnecting.filter((r) => r !== id), id] })
    try {
      await runScan(set, get, root.handle, root.label, root.handle, root.id)
    } finally {
      set({ reconnecting: get().reconnecting.filter((r) => r !== id) })
    }
  },

  async rescanFolder(id) {
    // The example being tried is made, not read: there is nothing to rescan,
    // and `loadExample` below would replace the real library with it.
    if (get().trying && id === EXAMPLE_ROOT_ID) return
    leaveFirst(get)
    const root = get().roots.find((r) => r.id === id)
    if (!root) return
    // The example library has no folder — "rescan" is simply "build it again".
    if (root.id === EXAMPLE_ROOT_ID) {
      await get().loadExample()
      return
    }
    // ⚠️ Nor has the Music library — it is read through iOS, never chosen.
    // Without this it fell through to "choose Music library again", a folder
    // that does not exist, from the banner's "Scan the rest" after a stopped
    // import (2026-09-13). Rescanning it is a refresh.
    if (root.source === 'music-library') {
      await get().importMusicLibrary()
      return
    }
    // ⚠️ A phone folder is read again by walking it — no handle, no picker.
    // Before this, "Scan the rest" on a stopped phone scan fell through to the
    // browser's "can't reopen a folder on its own" below, which is not true of
    // any phone folder.
    if (root.nativePath != null) {
      await scanNative(set, get, root.nativePath, root.id, root.label)
      return
    }
    if (root.handle) {
      await get().regrantFolder(id)
      return
    }
    // No handle means no way back to the folder without the picker. Say so
    // rather than pretending to rescan.
    set({
      error: `${host().This} can’t reopen a folder on its own — choose ${root.label} again to rescan it. Your library and covers are kept, so it will be quick.`,
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
    // ⚠️ "Remove" on the example being TRIED is the way back, not a removal.
    // Taken literally it rewrote the database to the library without the
    // example — which during a trial is the empty library, over the real one.
    if (get().trying) {
      get().leaveExample()
      if (id === EXAMPLE_ROOT_ID) return
    }
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
    // A phone folder's grant goes with it — Android caps how many an app may
    // hold. Nothing at all on the web, where a root has no `nativePath`.
    releaseUnused(get, [root.nativePath])
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

  /**
   * ⚠️ Stops any scan or import FIRST, and makes sure it writes nothing when it
   * finishes (`generation`). The scan card's "Delete" is a stop and then this,
   * and a stopped scan KEEPS what it read — so without the bump it wrote the
   * library straight back a moment after it had been cleared.
   */
  async clear() {
    // Forgetting the library forgets the real one, which is what the button
    // says — so the trial is ended first and what it set aside is cleared too.
    leaveFirst(get)
    scanAbort?.abort()
    generation++
    releaseAllCovers()
    const grants = get().roots.map((r) => r.nativePath)
    await db.clearLibrary()
    set({
      status: 'empty', tracks: [], albums: [], roots: [], progress: null,
      refusals: [], filesByPath: new Map(), folderImages: new Map(),
      error: null,
      stoppedEarly: null,
    })
    releaseUnused(get, grants)
  },

  async scanNativeFolder(id) {
    if (!isNativeShell()) return
    leaveFirst(get)

    // ⚠️ ROOTS ARE FOUND BY ID OR BY `nativePath`, NEVER BY A CONSTANT. `runScan`
    // derives a new root's id from its LABEL, so the first native scan creates a
    // root whose id is "Music" — look it up by a fixed id afterwards and nothing
    // is found, and `uniqueLabel` files the same folder a second time as
    // "Music (2)": one folder, two roots, every track twice.
    if (id !== undefined) {
      const root = nativeRoots(get().roots).find((r) => r.id === id)
      if (!root) return
      const folder = root.nativePath ?? NATIVE_ROOT_PATH
      const outcome = await scanNative(set, get, folder, root.id, root.label)
      // ⚠️ A CHOSEN folder has been lost — moved, renamed, deleted, access
      // withdrawn, a drive unplugged. Choosing it again is the only way back,
      // and this was a tap on THIS folder's button, so the picker opens now
      // rather than an error naming a fix the screen has no button for. Backing
      // out of it leaves the error showing. The app's own folder (`''`) is never
      // "lost" in that sense — there is nothing to re-choose — so it gets the
      // error alone.
      if (outcome === 'unreadable' && folder && usesChosenFolder()) await get().addNativeFolder(root.id)
      return
    }

    // No folder of the app's own (Android): "scan my music folder" means the
    // folders chosen so far, or — with none — choosing one.
    // ⚠️ Keyed on `hasOwnMusicFolder`, not on `usesChosenFolder`: iOS can choose
    // folders AND keeps its own, and reading the second as "no own folder" once
    // sent every iOS scan of its own folder to the picker.
    if (!hasOwnMusicFolder() && usesChosenFolder()) {
      if (nativeRoots(get().roots).length === 0) await get().addNativeFolder()
      else await get().rescanNativeFolders()
      return
    }
    const own = get().roots.find((r) => r.nativePath === NATIVE_ROOT_PATH)
    await scanNative(set, get, NATIVE_ROOT_PATH, own?.id, NATIVE_ROOT_LABEL)
  },

  async addNativeFolder(intoRootId) {
    if (!usesChosenFolder()) return
    let picked
    try {
      picked = await pickNativeMusicFolder({
        // Open in the app's own folder only while the library does not read it.
        startInOwnFolder: !get().roots.some((r) => r.nativePath === NATIVE_ROOT_PATH),
      })
    } catch (err) {
      console.error('[jukebox] The folder picker failed:', err)
      set({ error: 'That folder could not be used — the phone would not let the app keep access to it. Try again, or choose a different folder.' })
      return
    }
    if (!picked) return // Backed out of the picker: not an error, nothing to say.
    // The plan is made against the REAL library's folders.
    leaveFirst(get)

    const plan = planNativePick(get().roots, picked, intoRootId)
    if (plan.kind === 'rescan') {
      // Already in the library: read it again, and keep its one grant.
      await scanNative(set, get, picked.uri, plan.root.id, plan.root.label)
      return
    }
    const replaced = plan.kind === 'refile' ? plan.root.nativePath : null
    await scanNative(set, get, picked.uri, plan.kind === 'refile' ? plan.root.id : undefined, picked.name)
    // Whichever of the two the library does not read now: the new folder's, if
    // it held no music, could not be opened, or its scan was deleted part-way;
    // the lost folder's old uri, once the root reads the new one.
    releaseUnused(get, [picked.uri, replaced])
  },

  async rescanNativeFolders() {
    leaveFirst(get)
    const roots = nativeRoots(get().roots)
    if (roots.length === 0) {
      await get().scanNativeFolder()
      return
    }
    // ⚠️ Each scan clears the error slot as it starts, so the first folder
    // that could not be read would otherwise be forgotten by the next one's
    // success — and "Rescan" would look as if it had worked.
    const started = generation
    let firstError: string | null = null
    for (const root of roots) {
      if (generation !== started) return // The library was forgotten meanwhile.
      if (!get().roots.some((r) => r.id === root.id)) continue // Removed meanwhile.
      await get().rescanFolder(root.id)
      firstError ??= get().error
    }
    if (firstError && !get().error && generation === started) set({ error: firstError })
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

  needsPreparing(track) {
    return isMusicLibraryTrack(get().roots, track) && !preparedFile(track)
  },

  async prepare(track) {
    if (!isMusicLibraryTrack(get().roots, track)) return get().fileFor(track)
    try {
      return await prepareSong(track)
    } catch (err) {
      console.error(`[jukebox] Could not prepare “${track.title}” for playback:`, err)
      return null
    }
  },

  async importMusicLibrary() {
    if (!hasMusicLibrary()) return
    let access
    try {
      access = await requestMusicLibraryAccess()
    } catch (err) {
      console.error('[jukebox] Could not ask for the Music library:', err)
      set({ error: 'The Music library could not be opened.' })
      return
    }
    if (access !== 'authorized') {
      set({
        error: access === 'restricted'
          ? 'Access to the Music library is restricted on this iPhone (Screen Time or a device profile), so Universal Jukebox can’t read it.'
          : 'Universal Jukebox isn’t allowed to read your Music library. Turn it on in Settings → Apps → Universal Jukebox → Media & Apple Music, then try again.',
      })
      return
    }

    // Real music ends a trial, and this merges into the real library.
    leaveFirst(get)
    // A folder scan running at the same time would merge into the same library
    // from under this one.
    scanAbort?.abort()
    // ⚠️ AND THIS IMPORT IS NOW THE SCAN THAT "STOP" REACHES (2026-09-13). It
    // never set `scanAbort`, so the scan card's "Keep …" was a no-op and the
    // import ran to its end, and "Delete" cleared the library only for the
    // import to put it straight back. Stopping now ends the art fetch and keeps
    // every song (see `readMusicLibrary`); `generation` is what makes Delete
    // stick.
    const abort = new AbortController()
    scanAbort = abort
    const started = generation
    const current = () => generation === started
    // The demo steps aside for real music, exactly as it does for a folder.
    if (get().roots.some((r) => r.id === EXAMPLE_ROOT_ID)) await get().removeFolder(EXAMPLE_ROOT_ID)
    if (!current()) return

    // ⚠️ Refreshing keeps the root's prefix, like a rescan does — the prefix IS
    // the identity (`lib/roots.ts`), and a new one would file the same songs a
    // second time under a second name.
    const existing = get().roots.find((r) => r.source === 'music-library')
    const taken = get().roots.filter((r) => r.id !== existing?.id).map((r) => prefixOf(r))
    const prefix = existing ? prefixOf(existing) : uniqueLabel(MUSIC_LIBRARY_LABEL, taken)
    const rootWith = (trackCount: number): Root => ({
      id: existing?.id ?? MUSIC_LIBRARY_ROOT_ID,
      label: prefix,
      prefix,
      handle: null,
      nativePath: null,
      source: 'music-library',
      scannedAt: Date.now(),
      trackCount,
    })

    // ⚠️ A FIRST IMPORT FILLS THE SHELVES WHILE THE ART IS STILL COMING IN
    // (`readMusicLibrary`'s `onReady`). A refresh does NOT: the library already
    // on screen stays as it is until the new one is complete, rather than
    // shrinking to a handful of records and growing back.
    //
    // ⚠️ The root goes up WITH the first records, not at the end. Without it a
    // record tapped mid-import is not a Music-library track (`isMusicLibraryTrack`
    // asks the roots), so it is never exported for playback and fails as a
    // missing file. It is not written to the database until the import is done.
    const onReady = existing
      ? undefined
      : (sofar: { tracks: Track[]; albums: Album[] }) => {
          if (!current()) return
          const merged = addScan({ tracks: get().tracks, albums: get().albums }, prefix, sofar)
          const joined = mergeDiscSets(merged.tracks, merged.albums)
          const root = rootWith(sofar.tracks.length)
          set({ tracks: joined.tracks, albums: joined.albums, roots: [...get().roots.filter((r) => r.id !== root.id), root] })
        }

    set({
      status: 'scanning',
      error: null,
      stoppedEarly: null,
      progress: { seen: 0, added: 0, skipped: 0, where: MUSIC_LIBRARY_LABEL, done: false },
    })
    let read: MusicLibraryRead
    try {
      read = await readMusicLibrary(
        prefix,
        // A sleeve still landing after a Delete would otherwise bring the scan
        // card back over an empty library.
        (progress) => {
          if (current()) set({ progress })
        },
        onReady,
        abort.signal,
      )
    } catch (err) {
      if (scanAbort === abort) scanAbort = null
      if (!current()) return
      console.error('[jukebox] Could not read the Music library:', err)
      // Whatever a first import had already put on the shelves comes off again.
      if (!existing) {
        const left = removeRoot({ tracks: get().tracks, albums: get().albums }, prefix)
        set({ tracks: left.tracks, albums: left.albums, roots: get().roots.filter((r) => r.id !== MUSIC_LIBRARY_ROOT_ID) })
      }
      set({
        status: get().tracks.length > 0 ? 'ready' : 'empty',
        progress: null,
        error: 'The Music library could not be read.',
      })
      return
    }
    const stopped = abort.signal.aborted
    if (scanAbort === abort) scanAbort = null
    // ⚠️ Stopped alone is "Keep": every song goes in below. But a library
    // forgotten since this started ("Delete") stays forgotten.
    if (!current()) return

    if (read.tracks.length === 0) {
      set({
        status: get().tracks.length > 0 ? 'ready' : 'empty',
        progress: null,
        error: emptyMusicLibraryMessage(read),
      })
      return
    }

    // ⚠️ `addScan` keeps a record's old sleeve where the new read has none, so
    // a REFRESH that is stopped early loses no art it already had; only a first
    // import's unread records are left blank.
    const before = { tracks: get().tracks, albums: get().albums }
    const merged = addScan(before, prefix, { tracks: read.tracks, albums: read.albums })
    // Tidy-up fixes are keyed to track and album ids, which a refresh
    // reproduces exactly — so they come back, as they do after a folder rescan.
    const fixes = await db.allFixes()
    if (!current()) return
    const tidied = fixes.length > 0 ? applyFixes(merged.tracks, merged.albums, fixes) : merged
    // Disc sets joined AFTER the fixes, which are keyed to the parts' own ids.
    const fixed = mergeDiscSets(tidied.tracks, tidied.albums)
    const root = rootWith(read.tracks.length)
    await Promise.all([db.replaceLibrary(fixed.tracks, fixed.albums), db.putRoot(root)])
    if (!current()) return
    set({
      status: 'ready',
      tracks: fixed.tracks,
      albums: fixed.albums,
      roots: [...get().roots.filter((r) => r.id !== root.id), root],
      progress: null,
      stoppedEarly: stopped ? root.id : null,
      // ⚠️ What was left out is SAID, in the same place a folder scan names the
      // formats it refused — somebody whose library is half Apple Music
      // downloads should not be left wondering where half of it went.
      refusals: musicLibrarySkips(read),
    })
  },

  async pickNativeFiles() {
    let copied: number | null
    try {
      copied = await importWithNativePicker()
    } catch (err) {
      console.error('[jukebox] The file picker failed:', err)
      set({ error: 'Those files could not be copied into the music folder.' })
      return
    }
    if (copied === null) return // Backed out of the picker: nothing to say.
    if (copied === 0) {
      set({ error: 'None of those files could be copied into the music folder.' })
      return
    }
    await get().scanNativeFolder()
  },

  fileFor(track) {
    const file = get().filesByPath.get(track.path)
    if (file) return file
    // A Music-library song's file is its exported copy, once one has been made
    // — null until then, and `needsPreparing` is what the player asks first.
    if (isMusicLibraryTrack(get().roots, track)) return preparedFile(track)
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

// Lengths for every track with a file, in the background — `lib/lengths.ts`.
// Started whenever the live files change: after a folder is allowed back,
// chosen, or scanned, and as a scan hands its files over batch by batch.
const lengthsHost = {
  tracks: () => useLibraryStore.getState().tracks,
  fileFor: (track: Track) => useLibraryStore.getState().filesByPath.get(track.path) ?? null,
  publish: (learnt: Map<string, number>) =>
    useLibraryStore.setState({
      tracks: useLibraryStore.getState().tracks.map((t) => {
        const sec = learnt.get(t.id)
        return sec !== undefined && !t.durationSec ? { ...t, durationSec: sec } : t
      }),
    }),
  save: (id: string, sec: number) => void db.setDuration(id, sec),
}
useLibraryStore.subscribe((state, prev) => {
  if (state.filesByPath !== prev.filesByPath && state.filesByPath.size > 0) void learnLengths(lengthsHost)
})

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
function emptyFolderMessage(folder: string): string {
  // Keyed on the folder that was READ, not on whether a picker exists: on iOS
  // both kinds of folder are possible and they need different directions.
  if (folder) {
    return 'No music in that folder. Copy albums into it from a computer or with the Files app — Artist/Album/track.mp3 is exactly right — then scan again, or choose a different folder.'
  }
  const where =
    nativePlatform() === 'ios'
      ? 'Open the Files app, go to On My iPhone \u2192 Universal Jukebox, and copy an album in.'
      : 'Copy an album into the Universal Jukebox folder in your Files app.'
  return `No music in your folder yet. ${where} Folders are kept, so Artist/Album/track.mp3 is exactly right \u2014 then scan again. Or tap \u201cAdd songs one at a time\u201d to pick files here.`
}

/** Why a Music library came back with nothing this app can play. */
function emptyMusicLibraryMessage(read: MusicLibraryRead): string {
  if (read.total === 0) {
    return 'There are no songs in the Music library on this iPhone. Sync them from your Mac (Finder → your iPhone → Music), then try again.'
  }
  const parts: string[] = []
  if (read.protected > 0) parts.push(`${read.protected} are Apple Music downloads, which are protected and can’t be played by other apps`)
  if (read.cloudOnly > 0) parts.push(`${read.cloudOnly} are in iCloud but not downloaded to this iPhone`)
  return `None of the ${read.total} songs in your Music library can be played here: ${parts.join(', and ')}. Songs synced from your Mac play fine.`
}

/**
 * The songs a Music-library import left out, in the shape of the refused-format
 * report a folder scan fills — so they are named in the same place, once.
 *
 * ⚠️ Each carries a `label`, because these are kinds of song, not formats: the
 * report names a refusal by its extension otherwise, and "Apple Music
 * downloads" came out as ".PROTECTED". `ext` stays as the list key.
 */
export function musicLibrarySkips(read: Pick<MusicLibraryRead, 'protected' | 'cloudOnly'>): Refusal[] {
  const skips: Refusal[] = []
  if (read.protected > 0) {
    skips.push({
      ext: 'protected',
      label: 'Apple Music downloads',
      count: read.protected,
      why: 'protected, and iOS doesn’t let other apps play them. Songs synced from your Mac aren’t affected.',
    })
  }
  if (read.cloudOnly > 0) {
    skips.push({
      ext: 'icloud',
      label: 'iCloud-only songs',
      count: read.cloudOnly,
      why: 'not downloaded to this iPhone. Download them in the Music app, then refresh the Music library.',
    })
  }
  return skips
}

let scanAbort: AbortController | null = null

/**
 * The abort reason a scan is given when ANOTHER scan replaces it, as opposed to
 * the person pressing Stop.
 *
 * ⚠️ THE TWO MUST NOT LOOK ALIKE. Both abort the walk, and a plain `aborted`
 * check read a replaced scan as a stopped one: it finished a moment after its
 * successor had started, wrote "Stopped early" and cleared the progress — so
 * the card counting the new scan and a banner saying scanning had stopped sat
 * on screen together (James, 2026-10-08, the Windows app: "it says stopped
 * early but it's ongoing"). A replaced scan keeps what it read and says
 * nothing; the scan that replaced it owns the progress and the outcome.
 */
const SUPERSEDED = 'superseded'
const wasSuperseded = (abort: AbortController) => abort.signal.aborted && abort.signal.reason === SUPERSEDED

/** The example library's one root. */
function exampleRoot(trackCount: number): Root {
  return {
    id: EXAMPLE_ROOT_ID,
    label: EXAMPLE_LABEL,
    prefix: EXAMPLE_LABEL,
    handle: null,
    scannedAt: Date.now(),
    trackCount,
  }
}

/** What `tryExample` sets aside, and `leaveExample` puts back. */
type SetAside = Pick<
  LibraryState,
  'status' | 'tracks' | 'albums' | 'roots' | 'filesByPath' | 'folderImages' | 'refusals' | 'stoppedEarly'
>

/**
 * The real library, while the example is being tried in its place — or null.
 *
 * ⚠️ MODULE-LEVEL AND NEVER PERSISTED, for the reason at the top of this file:
 * it holds `filesByPath`, the live handles, and a live handle written anywhere
 * is a broken reference that looks valid. Keeping the very same Map is what
 * makes the way back instant on every platform — no permission re-granted on
 * the web, no folder walked again on a phone. And it is the stored library
 * that survives a reload, which the trial never wrote to.
 */
let trial: SetAside | null = null

function setAside(state: LibraryState): SetAside {
  const { status, tracks, albums, roots, filesByPath, folderImages, refusals, stoppedEarly } = state
  return { status, tracks, albums, roots, filesByPath, folderImages, refusals, stoppedEarly }
}

/**
 * Every way of getting REAL music into the library ends a trial first.
 *
 * ⚠️ NOT OPTIONAL, and the reason is `before`. Each of these reads the library
 * it is about to add to, merges into it and writes the result to IndexedDB as
 * the whole picture (`db.replaceLibrary`). During a trial the library in the
 * store is the example — so a folder added then was merged into the demo, the
 * demo "stepped aside" (`runScan`), and what was written over the real library
 * was one new folder and nothing else. Somebody who adds their music while
 * trying the example means to add it to THEIR library, so that is where it goes.
 * None of these is on screen during a trial (the menu offers "Back to my
 * music" in the library's place); this is for the ones that come later.
 */
function leaveFirst(get: () => LibraryState): void {
  if (get().trying) get().leaveExample()
}

/**
 * Bumped by everything that throws the whole library away — `clear` and
 * `loadExample`. A scan or import records it when it starts and writes nothing
 * once it has moved on.
 *
 * ⚠️ Aborting is not enough on its own, because a stopped scan KEEPS what it
 * read — that is what "Keep …" means. "Delete" is the same stop followed by a
 * clear, and the stopped scan finishing a moment later wrote the library back.
 */
let generation = 0

/**
 * Give back every folder grant in `uris` that no root reads any more — see
 * `unusedGrants`. Asked of the roots as they are NOW, so call it after the
 * change. Does nothing (and loads no plugin) when nothing is unused, which is
 * always the case on the web.
 */
function releaseUnused(get: () => LibraryState, uris: (string | null | undefined)[]): void {
  for (const uri of unusedGrants(get().roots, uris)) void releaseNativeMusicFolder(uri)
}

/**
 * Walk a native music folder and scan what is in it — the part of a native
 * scan that is the same on both platforms.
 *
 * `folder` is `Root.nativePath`: `''` for the app's own folder (iOS's
 * Documents), a chosen folder's uri otherwise. Returns how it went, because
 * the callers do different things next — a tap on a lost folder re-opens the
 * picker on `'unreadable'`, and `addNativeFolder` gives back whichever grant
 * the library is not using.
 */
async function scanNative(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
  folder: string,
  existingId: string | undefined,
  label: string,
): Promise<'ok' | 'empty' | 'unreadable'> {
  leaveFirst(get)
  set({ status: 'scanning', error: null, progress: { seen: 0, added: 0, skipped: 0, where: '', done: false } })
  let entries
  try {
    entries = await walkNativeLibrary(undefined, folder)
  } catch (err) {
    console.error('[jukebox] Could not read the music folder:', err)
    set({
      status: get().tracks.length > 0 ? 'ready' : 'empty',
      progress: null,
      // Named, because with several folders "that folder" could be any of them.
      error: folder
        ? `${label} could not be opened — it may have been moved or renamed, or access to it was withdrawn. Choose it again.`
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
      error: emptyFolderMessage(folder),
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
    // `''` for the app's own folder but NOT null: `nativePath != null` is what
    // marks a root as a phone folder (`nativeRoots`), in `hydrate` and below.
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
 * ⚠️ A chosen folder is walked through the plugin, and this never opens the
 * picker: it runs at launch, with nobody's tap behind it. If access has gone,
 * the tracks simply stay unplayable and the banner's Rescan — a tap — is what
 * asks for the folder again.
 *
 * ⚠️ EVERY phone folder, each on its own (2026-09-14). One that cannot be
 * walked is logged and left unplayable; the others come back regardless — so
 * the permission banner names exactly the folder that lapsed (`needAccessFrom`
 * is per root). Each merges into the map as it lands, reading it afresh, so
 * two walks finishing together cannot drop each other's files.
 */
async function reattachNative(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
): Promise<void> {
  await Promise.all(
    nativeRoots(get().roots).map(async (root) => {
      let entries
      try {
        entries = await walkNativeLibrary(undefined, root.nativePath ?? NATIVE_ROOT_PATH)
      } catch (err) {
        console.error(`[jukebox] Could not re-read ${root.label} on startup:`, err)
        return
      }
      const prefix = prefixOf(root)
      // ⚠️ Into the library these files belong to. A trial started while the
      // walk was still going has set the real library aside, and a set here
      // would file the phone's music under the EXAMPLE — then lose it on the
      // way back, leaving every song unplayable until a rescan.
      const into = trial ?? get()
      const files = new Map<string, SourceFile>(into.filesByPath)
      for (const entry of entries) {
        files.set(prefix ? `${prefix}/${entry.path}` : entry.path, new NativeFile(entry))
      }
      if (trial) trial.filesByPath = files
      else set({ filesByPath: files })
    }),
  )
}

/**
 * Put the live files back for every chosen folder that can be read without
 * asking — a walk, not a scan, exactly like `reattachNative`.
 *
 * ⚠️ IN THE DESKTOP APP IT ALSO ASKS, unprompted. A browser tab cannot: its
 * `requestPermission` needs a click, and a prompt on page load is one nobody
 * has context for — which is why `hydrate` otherwise never asks. But the
 * desktop app's Chromium answers its own permission requests (Electron grants
 * them; there is no dialog to show), so the click on "Allow access" bought
 * nothing but the click. If it is ever refused — Electron tightening its
 * defaults, a user-activation rule — nothing is lost: the folder simply stays
 * unreachable, and the banner asks as before.
 *
 * In a browser, the folder comes back only when the permission is already
 * GRANTED (Chrome's "Allow on every visit" for an installed app).
 */
/**
 * `requestPermission`, run by the desktop shell WITH a user gesture — the one
 * thing Chromium insists on, and the one thing a page load does not have. See
 * 'jukebox:with-gesture' in `electron/main.cjs`.
 *
 * ⚠️ The request must be made INSIDE the call main.cjs makes, synchronously,
 * or the gesture is gone — so the page queues it here and main.cjs drains the
 * queue. An older shell without the bridge, or one that never calls back,
 * resolves as 'prompt' and the banner asks instead.
 */
const gestureQueue: (() => void)[] = []

function requestWithGesture(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  const bridge = (window as unknown as { unisimDesktop?: { withGesture?: () => Promise<unknown> } }).unisimDesktop?.withGesture
  if (!bridge) return Promise.resolve('prompt')
  return new Promise((resolve) => {
    // ⚠️ Generous, and only a guard against a shell that never answers: a
    // refusal comes back at once. 4 s gave up on the FIRST launch after an
    // install — Windows scanning the new .exe slows everything — and showed
    // the banner on a launch that would have reconnected (James, 2026-10-08).
    const timer = setTimeout(() => resolve('prompt'), 20000)
    gestureQueue.push(() => {
      clearTimeout(timer)
      const request = (handle as FileSystemDirectoryHandle & {
        requestPermission?(d: { mode: 'read' }): Promise<PermissionState>
      }).requestPermission?.({ mode: 'read' })
      if (!request) resolve('prompt')
      else request.then(resolve, () => resolve('prompt'))
    })
    ;(window as unknown as { __jukeboxGesture?: () => void }).__jukeboxGesture = () => {
      for (const run of gestureQueue.splice(0)) run()
    }
    bridge().catch(() => resolve('prompt'))
  })
}

async function reattachFolders(
  set: (partial: Partial<LibraryState>) => void,
  get: () => LibraryState,
): Promise<void> {
  const desktop = isDesktopApp()
  await Promise.all(
    get().roots.map(async (root) => {
      const handle = root.handle as (FileSystemDirectoryHandle & {
        queryPermission?(d: { mode: 'read' }): Promise<PermissionState>
        requestPermission?(d: { mode: 'read' }): Promise<PermissionState>
      }) | null
      if (!handle) return
      try {
        let state = (await handle.queryPermission?.({ mode: 'read' })) ?? 'prompt'
        if (state !== 'granted' && desktop) state = await requestWithGesture(handle)
        if (state !== 'granted') return
        const found = await filesUnder(handle, prefixOf(root))
        if (found.size === 0) return
        // Into the library these belong to — see the same line in `reattachNative`.
        const into = trial ?? get()
        const files = new Map<string, SourceFile>(into.filesByPath)
        for (const [path, file] of found) if (!files.has(path)) files.set(path, file)
        if (trial) trial.filesByPath = files
        else set({ filesByPath: files })
      } catch (err) {
        // Moved, renamed, or on a drive that is not there: the banner says so.
        console.warn(`[jukebox] Could not reopen ${root.label} on startup:`, err)
      }
    }),
  )
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
  leaveFirst(get)
  // A second scan started while one is running aborts the first, or the two
  // walks interleave into one library and the progress count runs backwards.
  scanAbort?.abort(SUPERSEDED)
  const abort = new AbortController()
  scanAbort = abort
  // See `generation`: a library cleared while this runs stays cleared.
  const started = generation
  const current = () => generation === started

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

  // ⚠️ THE FOLDER IS RECORDED BEFORE ITS FIRST TRACK (2026-10-08). `onBatch`
  // below writes tracks to IndexedDB as they are found, and the root used to be
  // written only once the walk finished — so a scan that never finished (the
  // window closed, the read failed, a newer scan replaced it) left thousands of
  // tracks stored under no folder at all. After a relaunch none of them had a
  // file, no folder was there to ask permission for, so the banner had nothing
  // to say, and with errors hidden by default every press of play did nothing
  // in silence (James, desktop: "isn't playing anything and doesn't say there's
  // an issue"). Written first, an interrupted scan leaves a folder that asks
  // for itself back like any other. The count and time are filled in at the end.
  await db.putRoot({
    id: rootId,
    label: prefix,
    prefix,
    handle,
    nativePath,
    scannedAt: existing?.scannedAt ?? Date.now(),
    trackCount: existing?.trackCount ?? 0,
  })
  if (!current()) return

  // ⚠️ The library that is already loaded, captured BEFORE the scan starts.
  // Everything below merges into this snapshot rather than into `get()`, so a
  // batch arriving mid-walk cannot fold itself into a library that already
  // contains the previous batch.
  const before = { tracks: get().tracks, albums: get().albums }
  // ...plus any length learnt WHILE the walk runs: a song played mid-scan has
  // its length published to the store (`flushDurations`), and the next publish
  // below, built from the snapshot, would otherwise take it away again.
  const beforeNow = () => {
    const learnt = new Map<string, number>()
    for (const t of get().tracks) if (t.durationSec) learnt.set(t.id, t.durationSec)
    if (learnt.size === 0) return before
    return {
      ...before,
      tracks: [
        ...before.tracks.map((t) => (!t.durationSec && learnt.has(t.id) ? { ...t, durationSec: learnt.get(t.id) } : t)),
        // A FIRST scan's songs are not in the snapshot at all — carried as
        // their own, unchanged otherwise, since `addScan` replaces them.
        ...scanned.filter((t) => learnt.has(t.id)).map((t) => ({ ...t, durationSec: learnt.get(t.id) })),
      ],
    }
  }
  const scanned: Track[] = []
  const scannedAlbums = new Map<string, Album>()

  if (!current()) return
  set({
    status: 'scanning',
    error: null,
    stoppedEarly: null,
    progress: { seen: 0, added: 0, skipped: 0, where: '', done: false },
  })

  // The library on screen follows the scan, but at most every
  // SCAN_PUBLISH_MS rather than every 40-track batch: each publish rebuilds
  // and re-sorts every list on screen, so a 5,000-song first scan used to do
  // that ~125 times over an ever-growing library. The first batch still shows
  // at once, and whatever is pending is published before the scan's outcome
  // is handled below, so nothing found is ever left out.
  let liveFiles: ReadonlyMap<string, SourceFile> | null = null
  let publishTimer: ReturnType<typeof setTimeout> | null = null
  let lastPublish = 0
  const publish = () => {
    publishTimer = null
    if (!current()) return
    lastPublish = Date.now()
    // ⚠️ The GRID fills in from the merge, not from the batch. Setting the
    // batch alone was right when a scan replaced the library and would now
    // make the other folders vanish for the length of the walk.
    const merged = addScan(beforeNow(), prefix, { tracks: scanned, albums: [...scannedAlbums.values()] })
    const joined = mergeDiscSets(merged.tracks, merged.albums)
    // ⚠️ AND THEIR FILES (2026-10-08). The grid filled in from here while the
    // files were handed over only once the walk ended — minutes, for a few
    // thousand songs — so every track pressed during a scan had "no file",
    // was skipped, and with errors hidden by default nothing happened at all
    // (James: "track name imported but same play issue"). What is on screen
    // can now be played.
    const playable = new Map(get().filesByPath)
    for (const t of scanned) {
      const file = liveFiles?.get(t.path)
      if (file) playable.set(t.path, file)
    }
    set({ tracks: joined.tracks, albums: joined.albums, filesByPath: playable })
  }
  const flushPublish = () => {
    if (publishTimer === null) return
    clearTimeout(publishTimer)
    publish()
  }

  let result
  try {
    result = await scan(source, {
      prefix,
      onBatch: (newTracks, newAlbums, files) => {
        if (!current()) return
        liveFiles = files
        for (const t of newTracks) scanned.push(t)
        for (const a of newAlbums) scannedAlbums.set(a.id, a)
        void db.putTracks(newTracks)
        void db.putAlbums(newAlbums)
        if (publishTimer !== null) return
        const wait = lastPublish + SCAN_PUBLISH_MS - Date.now()
        if (wait <= 0) publish()
        else publishTimer = setTimeout(publish, wait)
      },
      onProgress: (progress) => {
        if (current()) set({ progress })
      },
      signal: abort.signal,
    })
  } catch {
    flushPublish()
    if (scanAbort === abort) scanAbort = null
    if (!current() || wasSuperseded(abort)) return
    // The folder stays — see "recorded before its first track" above — so the
    // tracks already shown are filed under something that can be rescanned.
    const kept: Root = { id: rootId, label: prefix, prefix, handle, nativePath, scannedAt: Date.now(), trackCount: scanned.length }
    set({
      roots: [...get().roots.filter((r) => r.id !== rootId), kept],
      status: get().tracks.length > 0 ? 'ready' : 'empty',
      progress: null,
      error: 'That folder could not be read all the way through. Anything found before the problem is in the library.',
    })
    return
  }

  flushPublish()
  const stopped = abort.signal.aborted
  if (scanAbort === abort) scanAbort = null
  if (!current()) return

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
  const merged = addScan(beforeNow(), prefix, {
    tracks: result.tracks,
    albums: result.albums,
  })
  const fixes = await db.allFixes()
  if (!current()) return
  const tidied = fixes.length > 0 ? applyFixes(merged.tracks, merged.albums, fixes) : merged
  // Disc sets joined AFTER the fixes, which are keyed to the parts' own ids.
  const fixed = mergeDiscSets(tidied.tracks, tidied.albums)

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
  if (!current()) return

  const refusals: Refusal[] = [...result.refused.entries()]
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

  // Replaced by a newer scan: keep what was read, but the progress, the
  // outcome and the banners are the newer scan's to set — see `SUPERSEDED`.
  if (wasSuperseded(abort)) {
    set({
      tracks: fixed.tracks,
      albums: fixed.albums,
      roots: [...get().roots.filter((r) => r.id !== rootId), root],
      filesByPath: files,
      folderImages: images,
    })
    return
  }

  set({
    status: fixed.tracks.length > 0 ? 'ready' : 'empty',
    tracks: fixed.tracks,
    albums: fixed.albums,
    roots: [...get().roots.filter((r) => r.id !== rootId), root],
    filesByPath: files,
    folderImages: images,
    refusals,
    progress: null,
    stoppedEarly: stopped ? rootId : null,
    // ⚠️ A stopped scan is not an error, so it does not get the error slot. It
    // is a library that is complete as far as it goes, and `ScanBanner` says so
    // with the button to finish the job — putting it in red would tell someone
    // their music is broken when what actually happened is that they asked.
    error: stopped || result.tracks.length > 0
      ? null
      : `Nothing playable in ${prefix} — checked ${result.refused.size > 0 ? 'every file' : 'the whole folder'}.`,
  })
}
