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

  constructor(entry: NativeEntry) {
    this.name = entry.name
    this.size = entry.size
    this.lastModified = entry.mtime
    this.playbackUrl = nativeFileUrl(entry.uri)
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
        if (!response.ok && response.status !== 206) {
          throw new Error(`Could not read ${url}: HTTP ${response.status}`)
        }
        const buffer = await response.arrayBuffer()
        // The whole file came back because the range was ignored. Take the part
        // that was asked for so the CALLER still gets correct bytes, and say so
        // once — a silent full read is the expensive bug this guards.
        if (response.status !== 206 && buffer.byteLength > to - from) {
          warnRangeIgnored()
          return buffer.slice(from, to)
        }
        return buffer
      },
    }
  }
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

/**
 * Walk the app's Documents directory and return every file in it.
 *
 * Iterative rather than recursive, for the reason `walkHandle` in `lib/scan.ts`
 * gives: a stack blown halfway through loses everything found so far.
 *
 * ⚠️ Returns EVERY file, not just playable ones. Deciding what is music is
 * `scan.ts`'s job and it already does it — including counting what it refused,
 * which is how the UI can say "12 .wma files were skipped" rather than leaving
 * somebody to wonder where half their library went.
 */
export async function walkNativeLibrary(signal?: AbortSignal): Promise<NativeEntry[]> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const found: NativeEntry[] = []
  const stack: string[] = ['']

  while (stack.length > 0) {
    if (signal?.aborted) return found
    const dir = stack.pop()!
    let entries
    try {
      entries = (await Filesystem.readdir({ path: dir, directory: Directory.Documents })).files
    } catch {
      // An unreadable directory is skipped rather than fatal — the same
      // position the web walker takes.
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
