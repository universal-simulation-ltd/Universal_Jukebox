// The native shell: what a "file" is when there is no `File`, and where the
// music folder lives on a phone.
//
// ⚠️ READ THIS BEFORE CHANGING HOW MUSIC GETS IN ON iOS. The web app's whole
// interaction is "point it at a folder", and iOS has no way to do that:
// `showDirectoryPicker` does not exist in WKWebView, and `webkitdirectory` is
// ignored by iOS Safari — an `<input>` carrying it silently degrades to picking
// individual files. So a straight Capacitor wrapper of this app would install,
// launch, look completely correct, and have no route to a single track.
//
// The native answer is to stop asking. `UIFileSharingEnabled` +
// `LSSupportsOpeningDocumentsInPlace` (see `ios/App/App/Info.plist`) publish the
// app's Documents directory to the Files app as a folder called "Universal
// Jukebox". Music is copied, AirDropped, unzipped or synced into it, and this
// module walks it. The folder is not chosen because it does not need to be.
//
// ⚠️ AND THAT IS THE VERSION WITH PERSISTENCE, which the obvious alternative
// does not have. A multi-file `<input type="file">` works on iOS today and needs
// none of this — but the `File` objects it hands back are ephemeral, so the
// library would evaporate on every relaunch and a person would re-pick their
// music every time they opened the app. A path is a string: it survives in
// IndexedDB with no permission attached to it, which is how the native build
// gets the thing only Chromium manages on the web.
//
// ⚠️ ANDROID IS DIFFERENT, AND THE iOS ROUTE DOES NOT WORK THERE (2026-09-10).
// `Directory.Documents` on Android is the phone's SHARED Documents folder, and
// scoped storage hides from this app everything in it that the app did not
// write itself. So on Android the folder IS chosen — a Storage Access Framework
// picker, with the grant kept — and walked by an app-local plugin. See
// `usesChosenFolder` below. The READS are unchanged: both platforms play and
// scan through Capacitor's local server, and on Android that server's 206 runs
// past the range it claims — see `readWindow`.

import type { SourceFile } from './types'

/** What a walk of the native music folder found. */
export interface NativeEntry {
  /** Path relative to the music folder — "Nick Cave/Let Love In/01.mp3". */
  path: string
  /** The absolute native URI, for `convertFileSrc`. */
  uri: string
  name: string
  size: number
  mtime: number
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  convertFileSrc?: (url: string) => string
}

/**
 * The global the native runtime injects, or undefined off a native platform.
 *
 * ⚠️ `globalThis`, not `window`, and guarded. In a browser the two are the same
 * object, so nothing changes there — but this module is imported by `scan.ts`,
 * which is imported by the unit tests, which run under Node with no `window` at
 * all. Reading `window` directly makes merely IMPORTING the scanner throw in a
 * test run. `lib/route.ts` and `hasDirectoryPicker` already take the same
 * precaution.
 */
function capacitor(): CapacitorGlobal | undefined {
  if (typeof globalThis === 'undefined') return undefined
  return (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
}

/**
 * True inside a Capacitor WebView.
 *
 * ⚠️ Reads the global the native runtime injects rather than importing
 * `@capacitor/core`, so it can be answered SYNCHRONOUSLY during the first
 * render. That is what lets the landing page show the native copy immediately
 * instead of flashing "choose a folder" — a button that cannot work here — on
 * the way to it. Same trick, and the same reason, as
 * `Universal_PDF/src/lib/nativeOpen.ts`.
 */
export function isNativeShell(): boolean {
  try {
    return capacitor()?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/** 'ios' | 'android' inside the shell; 'web' outside it. */
export function nativePlatform(): string {
  try {
    return capacitor()?.getPlatform?.() ?? 'web'
  } catch {
    return 'web'
  }
}

/**
 * A native file path as a URL the WebView can actually fetch and play.
 *
 * Capacitor serves the device filesystem over its own local origin; a raw
 * `file://` URL is blocked by WKWebView and gives an `<audio>` element a media
 * error with no explanation.
 */
export function nativeFileUrl(uri: string): string {
  const convert = capacitor()?.convertFileSrc
  return convert ? convert(uri) : uri
}

/**
 * One file in the native music folder, read the same way the web reads a `File`.
 *
 * ⚠️ `slice()` is a genuine RANGE READ, not a convenient fiction that reads the
 * file and slices the result. Capacitor's iOS asset handler honours the HTTP
 * `Range` header and answers `206 Partial Content`
 * (`node_modules/@capacitor/ios/…/WebViewAssetHandler.swift`), so asking for the
 * first 512 KB of a 90 MB FLAC transfers 512 KB. That is what keeps THE ONE RULE
 * at the top of `lib/scan.ts` true on a phone: scanning a library reads a
 * fraction of a percent of it, exactly as it does in a browser.
 *
 * ⚠️ A server that ignored `Range` would answer `200` with the WHOLE file, and
 * the failure would be invisible — correct bytes, correct tags, and a scan that
 * quietly moves the entire library through memory. So a non-206 answer to a
 * request for part of a file is treated as a fault and the slice is trimmed from
 * whatever came back, rather than trusted.
 */
export class NativeFile implements SourceFile {
  readonly name: string
  readonly size: number
  readonly lastModified: number
  /**
   * The URL an `<audio>` element plays this from — see `lib/trackSource.ts`.
   *
   * Public because playback needs it and nothing else should invent it; the
   * same URL serves the range reads below, so a track is fetched from one place
   * whether it is being scanned or played.
   */
  readonly playbackUrl: string
  /** The file's own `file://` URL — for native code that reads it (`LoudnessPlugin`). */
  readonly uri: string

  constructor(entry: NativeEntry) {
    this.name = entry.name
    this.size = entry.size
    this.lastModified = entry.mtime
    this.playbackUrl = nativeFileUrl(entry.uri)
    this.uri = entry.uri
  }

  slice(start: number, end: number): { arrayBuffer(): Promise<ArrayBuffer> } {
    const from = Math.max(0, Math.min(start, this.size))
    const to = Math.max(from, Math.min(end, this.size))
    const url = this.playbackUrl
    return {
      async arrayBuffer(): Promise<ArrayBuffer> {
        if (to <= from) return new ArrayBuffer(0)
        // `to - 1`: HTTP ranges are inclusive at both ends, `slice` is not.
        const response = await fetch(url, { headers: { Range: `bytes=${from}-${to - 1}` } })
        if (!response.ok) {
          throw new Error(`Could not read ${url}: HTTP ${response.status}`)
        }
        // A 200 is the whole file from byte 0 because the range was ignored.
        // Skip to the part that was asked for so the CALLER still gets correct
        // bytes, and say so once — a silent full read is the expensive bug this
        // guards.
        const ranged = response.status === 206
        if (!ranged) warnRangeIgnored()
        return readWindow(response, ranged ? 0 : from, to - from)
      },
    }
  }
}

/**
 * Exactly `want` bytes of a response body, starting `skip` bytes in — and then
 * STOP READING.
 *
 * ⚠️ ANDROID'S 206 IS NOT THE RANGE IT CLAIMS. Capacitor's Android local server
 * (`WebViewLocalServer.handleLocalRequest`) answers a range request with `206`
 * and a `Content-Range` naming exactly the window asked for — and a body that
 * starts at the window and runs ON TO THE END OF THE FILE. Measured on an
 * Android 15 emulator, 2026-09-10: `bytes=0-9` of a 3 MB file came back as
 * 3,145,728 bytes, and a 512 KB head read of a 20 MB file as all 20 MB. The
 * status says the range was honoured, the first bytes are the right ones, and
 * the tags parse perfectly — so `response.arrayBuffer()` here would hold every
 * file in the library in memory, one at a time, with nothing to say so. That is
 * THE ONE RULE at the top of `lib/scan.ts`, broken by the server.
 *
 * So the body is read as a stream and CANCELLED once the window is full, which
 * stops the native side reading too: the same 512 KB head read then cost about
 * 1 MB of disk reads in the app process (`/proc/<pid>/io`), against 21 MB for
 * `arrayBuffer()`. iOS answers a true 206 and is unaffected — the loop simply
 * reaches the end of a body that is already the right length.
 */
async function readWindow(response: Response, skip: number, want: number): Promise<ArrayBuffer> {
  const body = response.body
  if (!body) {
    // No stream to stop (an environment without one). Correct bytes, full cost.
    return (await response.arrayBuffer()).slice(skip, skip + want)
  }
  const reader = body.getReader()
  const out = new Uint8Array(want)
  let skipped = 0
  let have = 0
  try {
    while (have < want) {
      const { done, value } = await reader.read()
      if (done) break
      let chunk = value
      if (skipped < skip) {
        const drop = Math.min(skip - skipped, chunk.byteLength)
        skipped += drop
        chunk = chunk.subarray(drop)
      }
      const take = Math.min(chunk.byteLength, want - have)
      out.set(chunk.subarray(0, take), have)
      have += take
    }
  } finally {
    // The point of the whole function: tell the server to stop.
    void reader.cancel().catch(() => {})
  }
  return have === want ? out.buffer : out.slice(0, have).buffer
}

let rangeWarned = false
function warnRangeIgnored(): void {
  if (rangeWarned) return
  rangeWarned = true
  console.warn(
    '[jukebox] The native file server ignored a Range request and returned whole files. ' +
      'Scanning still works but reads far more than it needs to.',
  )
}

// ── Walking the music folder ─────────────────────────────────────────────────

/** Folders that are never music and are sometimes enormous. Mirrors `scan.ts`. */
function skippable(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules'
}

/**
 * The label the native music folder carries in the library.
 *
 * It is a `Root.prefix`, so it is also the first segment of every native track
 * path — see the header of `lib/roots.ts` for why that matters.
 */
export const NATIVE_ROOT_LABEL = 'Music'

/**
 * The music folder's path, relative to the Documents directory it IS.
 *
 * ⚠️ Empty, and that is a value rather than an absence — `Root.nativePath` is
 * what marks the one native root, and it is tested with `!= null` for exactly
 * this reason. Never tighten that to a truthiness check.
 */
export const NATIVE_ROOT_PATH = ''

// ── Android: a folder the person chooses ─────────────────────────────────────

/**
 * True where the music folder is CHOSEN rather than fixed — i.e. Android.
 *
 * ⚠️ THE iOS ANSWER DOES NOT EXIST ON ANDROID. `Directory.Documents` there is
 * not an app folder: `@capacitor/filesystem` maps it to the phone's SHARED
 * `/storage/emulated/0/Documents`, and under scoped storage (Android 11+) an
 * app can list only the files it wrote there itself. Measured on an Android 15
 * emulator, 2026-09-10: an MP3 put into Documents from outside was invisible to
 * `readdir`, which listed only this app's own readme — and every file under
 * `/sdcard/Music` was invisible too. So the Android build installed, told
 * people to use "the Universal Jukebox folder in your Files app" (there is no
 * such folder on Android), and could never find a single track.
 *
 * The Android build instead asks for a folder through the system picker and
 * Android keeps the grant, so it survives a relaunch the way the iOS path does
 * — see `android/app/src/main/java/uk/co/unisim/jukebox/MusicFolderPlugin.java`.
 *
 * ⚠️ DECIDED BY THE PLUGIN, NOT BY THE PLATFORM'S NAME. The chosen-folder route
 * is on wherever the native shell registers a `JukeboxMusicFolder` plugin —
 * Android today, because `MainActivity` registers one. A native plugin of the
 * same name with the same three methods (`MusicFolderPlugin` below) turns it on
 * for any other platform, iOS included, without a single call site changing.
 *
 * `PluginHeaders` rather than `Capacitor.isPluginAvailable`: the native bridge
 * injects the headers before any page script runs, so this is answerable
 * SYNCHRONOUSLY on the first render (the same reason `isNativeShell` exists),
 * whereas `isPluginAvailable` is added by `@capacitor/core`, which need not
 * have loaded yet.
 */
export function usesChosenFolder(): boolean {
  if (!isNativeShell()) return false
  try {
    const headers = (capacitor() as { PluginHeaders?: { name?: string }[] } | undefined)?.PluginHeaders
    return Array.isArray(headers) && headers.some((h) => h?.name === MUSIC_FOLDER_PLUGIN)
  } catch {
    return false
  }
}

/**
 * Does this platform have a music folder of the APP'S OWN, usable without a
 * picker?
 *
 * iOS does: `Directory.Documents` is private to the app and published to the
 * Files app by two Info.plist keys, so music can be put into it and read back
 * with no grant at all. Android does not: there `Directory.Documents` is the
 * phone's SHARED Documents folder, and scoped storage hides from this app
 * everything in it that the app did not write itself.
 *
 * ⚠️ A SEPARATE QUESTION FROM `usesChosenFolder`, and conflating the two was a
 * bug. That one asks "can a folder be chosen here"; this one asks "is there a
 * folder already". On iOS both are now yes (James, 2026-09-10: "choose their
 * library folder instead of forcing them to use ours" — choice, not the loss of
 * ours), and every place that read `usesChosenFolder()` as "there is no own
 * folder" would have dropped the app's own folder the moment the iOS picker
 * plugin was registered — stopped seeding it, refused to walk it, and made a
 * library already scanned from it throw on the next launch.
 *
 * ⚠️ Platform, not capability, on purpose: there is no runtime probe for "is
 * Documents private to this app". It is a fact about each OS's storage model.
 */
export function hasOwnMusicFolder(): boolean {
  return isNativeShell() && nativePlatform() === 'ios'
}

/** The native plugin behind a chosen folder — see `usesChosenFolder`. */
export const MUSIC_FOLDER_PLUGIN = 'JukeboxMusicFolder'

/**
 * What a platform's `JukeboxMusicFolder` plugin must do. Android's is
 * `MusicFolderPlugin.java`; another platform's needs these three and nothing
 * else.
 *
 * - `pick()` opens the system folder picker and KEEPS the grant (Android:
 *   `takePersistableUriPermission`). Resolves `{ uri, name }`, or
 *   `{ cancelled: true }` when backed out of — never a rejection for that.
 *   `uri` is an opaque string the library stores as `Root.nativePath` in
 *   IndexedDB and hands back to `walk` on every launch; this module never
 *   parses it.
 * - `walk({ uri })` lists every file under it as `NativeEntry`s — `path`
 *   relative to the folder, and an entry `uri` that `Capacitor.convertFileSrc`
 *   can serve with range reads, since scanning and playback both go through the
 *   local server. It REJECTS when the folder can no longer be reached, rather
 *   than resolving `[]`.
 * - `release({ uri })` drops a grant the library no longer uses.
 */
interface MusicFolderPlugin {
  pick(): Promise<{ uri?: string; name?: string; cancelled?: boolean }>
  walk(options: { uri: string }): Promise<{ files: NativeEntry[] }>
  release(options: { uri: string }): Promise<void>
}

let musicFolder: MusicFolderPlugin | null = null

/**
 * Register the app-local plugin, once.
 *
 * ⚠️ RETURNS NOTHING, and callers read `musicFolder` afterwards — on purpose. A
 * Capacitor plugin is a Proxy that answers EVERY property with a native-method
 * wrapper, `then` included (`@capacitor/core`'s `registerPlugin`), so resolving
 * a promise WITH it makes the promise machinery call a native method named
 * "then", which never answers. An `async` function that returns the plugin is
 * exactly that.
 */
async function loadMusicFolder(): Promise<void> {
  if (musicFolder) return
  const { registerPlugin } = await import('@capacitor/core')
  musicFolder = registerPlugin<MusicFolderPlugin>(MUSIC_FOLDER_PLUGIN)
}

/** Ask for the music folder. `null` when the picker was backed out of. */
export async function pickNativeMusicFolder(): Promise<{ uri: string; name: string } | null> {
  await loadMusicFolder()
  const picked = await musicFolder!.pick()
  if (picked.cancelled || !picked.uri) return null
  return { uri: picked.uri, name: picked.name || NATIVE_ROOT_LABEL }
}

/**
 * Give back the grant on a folder the library no longer reads.
 *
 * Android caps how many a single app may hold, so choosing a different folder
 * lets go of the old one rather than collecting them. Never throws: a grant
 * that could not be released is untidy, not broken.
 */
export async function releaseNativeMusicFolder(uri: string): Promise<void> {
  try {
    await loadMusicFolder()
    await musicFolder!.release({ uri })
  } catch (err) {
    console.warn('[jukebox] Could not release the old music folder:', err)
  }
}

/**
 * Walk the music folder and return every file in it.
 *
 * On iOS that is the app's Documents directory, and `folder` is
 * `NATIVE_ROOT_PATH`. On Android it is the chosen folder's tree URI —
 * `Root.nativePath` — walked natively in one call, because each directory there
 * is a content-provider query rather than a `readdir`.
 *
 * Iterative rather than recursive, for the reason `walkHandle` in `lib/scan.ts`
 * gives: a stack blown halfway through loses everything found so far.
 *
 * ⚠️ Returns EVERY file, not just playable ones. Deciding what is music is
 * `scan.ts`'s job and it already does it — including counting what it refused,
 * which is how the UI can say "12 .wma files were skipped" rather than leaving
 * somebody to wonder where half their library went.
 */
export async function walkNativeLibrary(
  signal?: AbortSignal,
  folder: string = NATIVE_ROOT_PATH,
): Promise<NativeEntry[]> {
  // A CHOSEN folder — a non-empty `Root.nativePath` — is walked by the plugin.
  if (folder && usesChosenFolder()) {
    await loadMusicFolder()
    const { files } = await musicFolder!.walk({ uri: folder })
    return files.map((f) => ({ ...f, mtime: f.mtime ?? 0 }))
  }
  // ⚠️ `''` IS THE APP'S OWN FOLDER, IN BOTH MODES, WHEREVER THERE IS ONE. On
  // iOS a folder can be chosen AND the app keeps its own — and every library
  // scanned before the picker existed is stored under `''`, so treating `''`
  // as "nothing chosen" whenever a picker is registered would make it throw on
  // the first launch after the update. Only where there is no own folder
  // (Android) is `''` genuinely "no folder", which is "I could not look",
  // never "empty".
  if (!hasOwnMusicFolder()) throw new Error('No music folder has been chosen yet')
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const found: NativeEntry[] = []
  const stack: string[] = ['']

  while (stack.length > 0) {
    if (signal?.aborted) return found
    const dir = stack.pop()!
    let entries
    try {
      entries = (await Filesystem.readdir({ path: dir, directory: Directory.Documents })).files
    } catch (err) {
      // ⚠️ THE ROOT IS DIFFERENT FROM EVERY OTHER DIRECTORY. A sub-folder that
      // will not open is skipped, exactly as the web walker skips one — but if
      // the MUSIC FOLDER ITSELF cannot be read, returning `[]` reports "your
      // folder is empty" for what is actually "I could not look". Those need
      // different things from the user (put music in / something is wrong), and
      // conflating them is how a broken app looks merely unused.
      if (dir === NATIVE_ROOT_PATH) throw err
      continue
    }
    for (const entry of entries) {
      if (signal?.aborted) return found
      if (skippable(entry.name)) continue
      const path = dir ? `${dir}/${entry.name}` : entry.name
      if (entry.type === 'directory') {
        stack.push(path)
        continue
      }
      found.push({
        path,
        uri: entry.uri,
        name: entry.name,
        size: entry.size,
        // ⚠️ `mtime` is part of `trackKey`, so a missing one must not become
        // `Date.now()` — that would mint a new id for the same file on every
        // scan, and every play count, cover fix and queue entry keyed to it
        // would be orphaned each time. 0 is stable and wrong in a way nothing
        // depends on.
        mtime: entry.mtime ?? 0,
      })
    }
  }
  return found
}

/**
 * Copy files the user picked into the music folder, so they persist.
 *
 * The in-app route in, for somebody who does not want to go via the Files app.
 * iOS `<input type="file" multiple>` DOES work — it is only the *directory*
 * variant that does not — so the picker hands back real `File` objects; this
 * writes them into Documents, after which they are ordinary members of the
 * library and survive a relaunch like anything else in there.
 *
 * ⚠️ Written in chunks through base64, because that is the only thing the
 * Capacitor bridge takes. That makes importing an expensive way to move a large
 * library and a fine way to add an album — which is why the Files app is
 * presented as the main route and this as the convenience. `onProgress` exists
 * so the UI can be honest about the cost while it happens.
 */
export async function importFilesToNativeLibrary(
  files: File[],
  onProgress?: (done: number, total: number, name: string) => void,
): Promise<number> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  let written = 0
  for (const file of files) {
    onProgress?.(written, files.length, file.name)
    // Keep the folder structure the picker reported, so an imported album lands
    // as an album rather than as loose tracks in the root.
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    const path = relative && relative.length > 0 ? relative : file.name
    try {
      const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
      if (parent) {
        await Filesystem.mkdir({ path: parent, directory: Directory.Documents, recursive: true }).catch(
          () => {
            /* Already there. `recursive` still throws when the leaf exists. */
          },
        )
      }
      await Filesystem.writeFile({
        path,
        directory: Directory.Documents,
        data: await base64Of(file),
      })
      written++
    } catch (err) {
      // One file that would not copy is one file, not a failed import.
      console.error(`[jukebox] Could not import ${file.name}:`, err)
    }
  }
  onProgress?.(written, files.length, '')
  return written
}

/**
 * A `File` as base64, without building the whole string by hand.
 *
 * `FileReader.readAsDataURL` does the encoding natively; doing it in JS over a
 * 40 MB track means a 40-million-iteration `String.fromCharCode` loop that
 * blocks the main thread for seconds.
 */
function base64Of(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma < 0 ? '' : result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * The note this app leaves in its own music folder on a fresh install.
 *
 * ⚠️ IT IS THERE TO MAKE THE FOLDER APPEAR AT ALL. iOS lists an app under
 * *Files → On My iPhone* only once its Documents directory has something in it,
 * so a newly installed Jukebox has NO folder for anyone to put music into — and
 * the landing page cheerfully tells them to use one that is not there. That is a
 * dead end, and it is the more serious half of the day-one "Scan does nothing"
 * report: there was nowhere to put the music, and then nothing happened when
 * you asked it to look.
 *
 * ⚠️ `.txt`, so the scanner ignores it — `isPlayable` says no and it is not in
 * `REFUSED`, so it is skipped silently rather than reported as a snubbed format.
 */
const README_NAME = 'Put your music in here.txt'

const README_BODY = [
  'Universal Jukebox — your music goes in this folder.',
  '',
  'Copy albums in here, AirDrop them, unzip them here, or drag them across',
  'from a computer. Folders are fine and are kept — Artist/Album/track.mp3 is',
  'exactly right.',
  '',
  'It plays MP3, M4A, FLAC and WAV.',
  '',
  'Then open Universal Jukebox and tap "Scan my music folder". Anything you add',
  'later needs another scan: the app cannot tell that a file appeared while it',
  'was closed.',
  '',
  'This note is not needed for anything and can be deleted.',
  '',
].join('\n')

/**
 * Make sure the music folder exists and is visible in the Files app.
 *
 * Writes the note above, and ONLY when the folder is completely empty. So it
 * appears on a fresh install, it never comes back once there is music in there,
 * and if somebody empties the folder it returns with the instructions — which is
 * the one moment they are wanted again.
 *
 * Swallows its own failure: a folder that cannot be seeded is a worse first run,
 * never a reason to fail a launch.
 */
export async function ensureNativeMusicFolder(): Promise<void> {
  // ⚠️ Only where the app HAS its own folder (`hasOwnMusicFolder` — iOS). On
  // Android `Directory.Documents` is the phone's SHARED Documents folder, which
  // the library does not read — a readme written into it would be litter in
  // somebody's Documents, telling them to put music somewhere that is ignored.
  // ⚠️ NOT keyed on `usesChosenFolder()`: iOS can choose a folder now too, and
  // still offers its own — which only appears in the Files app once seeded.
  if (!hasOwnMusicFolder()) return
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { files } = await Filesystem.readdir({
      path: NATIVE_ROOT_PATH,
      directory: Directory.Documents,
    }).catch(() => ({ files: [] as { name: string }[] }))
    if (files.length > 0) return
    await Filesystem.writeFile({
      path: README_NAME,
      directory: Directory.Documents,
      data: README_BODY,
      encoding: Encoding.UTF8,
    })
  } catch (err) {
    console.error('[jukebox] Could not seed the music folder:', err)
  }
}
