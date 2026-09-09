// The three things this app knows about: a track, an album, and a folder it was
// told to look in.
//
// Everything here is DERIVED from files on the user's disk and is therefore
// disposable — which is a design position, not a caveat. "Rescan folder" is a
// one-click full rebuild because it is the honest answer to every "why isn't my
// new album showing" there will ever be, and it is only cheap to offer if
// nothing in the database is precious. Nothing here is.

/**
 * The little of a file this app actually needs — and the reason a phone build
 * is possible at all.
 *
 * ⚠️ A browser `File` satisfies this structurally, so nothing on the web path
 * changed when it was introduced. What it buys is the NATIVE path: inside the
 * iOS/Android shell there is no `File` for a track sitting in the app's music
 * folder, only a path, and materialising one would mean pulling the whole file
 * across the Capacitor bridge — the 40 GB out-of-memory crash that the header
 * of `lib/scan.ts` exists to forbid, arrived at from a different direction.
 *
 * The surface is deliberately four members wide, which is all the scanner, the
 * tag reader and `trackKey` between them ever touch. `lib/nativeFile.ts`
 * implements it over HTTP range reads against Capacitor's local file server;
 * see the note there about why that is exact rather than an approximation.
 */
export interface SourceFile {
  name: string
  size: number
  /** Epoch millis, and part of `trackKey` — so it must be stable across scans. */
  lastModified: number
  /** ⚠️ Range read. NEVER read a whole file — see the header of `lib/scan.ts`. */
  slice(start: number, end: number): { arrayBuffer(): Promise<ArrayBuffer> }
  /**
   * The MIME type, when the source knows it — a browser `File` does.
   *
   * ⚠️ Optional and never load-bearing. The native side has only a filename to
   * go on, so every caller must already have a fallback that guesses from the
   * extension; this is a better answer where one is available, not a required
   * one.
   */
  type?: string
}

/** One playable file. */
export interface Track {
  /** `trackKey(...)` — path + size + mtime. Stable across scans. */
  id: string
  /** Path relative to the chosen root, e.g. "Radiohead/Kid A/01 Everything.flac". */
  path: string
  /** The file name alone, which is the fallback title for an untagged file. */
  name: string
  size: number
  mtime: number
  /** Lower-case extension without the dot — "mp3", "flac". */
  ext: string

  title: string
  artist?: string
  albumArtist?: string
  album?: string
  trackNo?: number
  discNo?: number
  year?: number
  genre?: string
  /**
   * Seconds, and OPTIONAL on purpose.
   *
   * Duration is not in the tags — it is a property of the audio, and getting it
   * exactly right means decoding. `scan.ts` does not decode: a 5,000-file
   * library would spend minutes doing it, and the number is only needed to show
   * a total. It is filled in the first time a track is actually played, when the
   * `<audio>` element knows it for free, and written back.
   */
  durationSec?: number
  /** `albumKey(...)`. */
  albumId: string
}

/** One album, assembled from the tracks that share an `albumId`. */
export interface Album {
  id: string
  title: string
  artist: string
  year?: number
  trackCount: number
  /** The downscaled cover, or null for an album whose files carry no art. */
  cover: Blob | null
}

/**
 * A folder the user chose.
 *
 * ⚠️ `handle` is the whole reason this store exists, and it is why the library
 * survives a reload on Chromium and cannot on Firefox or Safari. A
 * `FileSystemDirectoryHandle` is structured-cloneable, so IndexedDB can hold
 * the actual permission-bearing object — there is no string, path or token that
 * could stand in for it, and no polyfill can invent one. On a browser without
 * File System Access this is `null` and the folder must be re-chosen each
 * session; the LIBRARY still survives, because the index and the artwork are in
 * the other two stores.
 */
export interface Root {
  id: string
  label: string
  /**
   * The path prefix every track under this root carries — `Music` for
   * `Music/Nick Cave/Let Love In/01.mp3`.
   *
   * ⚠️ THIS IS THE ROOT'S IDENTITY, not decoration. It is what makes "remove
   * this folder" a filter over paths, and it is what stops two folders holding
   * the same relative path from producing the same `trackKey` — see the header
   * of `lib/roots.ts`, which is where every rule about it lives.
   *
   * ⚠️ OPTIONAL, because a root stored before multi-folder has no prefix and
   * its tracks have unprefixed paths. `prefixOf()` reads that absence as "" —
   * "everything is mine" — which is exactly true of the single-root library it
   * came from. Never read this field directly; go through `prefixOf`.
   */
  prefix?: string
  handle: FileSystemDirectoryHandle | null
  /**
   * The native shell's answer to `handle`, and it works the same way for a
   * completely different reason.
   *
   * ⚠️ On iOS there IS no directory picker — `showDirectoryPicker` is absent
   * from WKWebView and `webkitdirectory` is ignored — so the folder cannot be
   * chosen, and is instead a fixed one the OS shares with the Files app. That
   * turns out to be the stronger position: a path is a plain string, so it
   * persists in IndexedDB with no permission attached to go stale, and the
   * library comes back after a relaunch without asking the user anything. The
   * Chromium handle only manages the same trick by storing a live object.
   *
   * `null` on the web, where `handle` is the mechanism.
   */
  nativePath?: string | null
  scannedAt: number
  trackCount: number
}

/** Live progress while a scan is running. */
export interface ScanProgress {
  /** Files looked at so far. */
  seen: number
  /** Playable files added. */
  added: number
  /** Files skipped because nothing can play them. */
  skipped: number
  /** The folder currently being walked, for something honest to put on screen. */
  where: string
  done: boolean
}
