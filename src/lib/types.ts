// The three things this app knows about: a track, an album, and a folder it was
// told to look in.
//
// Everything here is DERIVED from files on the user's disk and is therefore
// disposable — which is a design position, not a caveat. "Rescan folder" is a
// one-click full rebuild because it is the honest answer to every "why isn't my
// new album showing" there will ever be, and it is only cheap to offer if
// nothing in the database is precious. Nothing here is.

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
