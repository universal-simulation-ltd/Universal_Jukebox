// Walking a folder and turning it into a library.
//
// ⚠️ THE ONE RULE THIS FILE EXISTS TO ENFORCE: **nothing may call
// `file.arrayBuffer()`.** A 5,000-track library is 40 GB. Reading whole files to
// find out what is in their first kilobyte is not slow, it is an out-of-memory
// crash, and it is the single easiest mistake to make here because
// `arrayBuffer()` is the obvious method and it works beautifully on the three
// test files anyone tries first.
//
// Instead every read is `file.slice(a, b).arrayBuffer()` — a range read off
// disk, which is what `Universal_Converter/src/lib/probe.ts` and
// `@unisim/media`'s `probe` already do against multi-GB video.
//
// The scan STREAMS: it reports tracks in batches as it finds them, so the first
// albums appear while the count is still climbing. On a big library that is the
// difference between a progress bar and a frozen tab.

import { readTags, type Picture } from './tags'
import { albumKey, trackKey } from './keys'
import { makeCoverBlob } from './art'
import type { Album, ScanProgress, SourceFile, Track } from './types'
import { NativeFile, type NativeEntry } from './nativeFile'

/**
 * What we ask for off the front of a file.
 *
 * ID3v2 sits at the front and its size is declared, but the tag can legitimately
 * be large — an APIC frame holding a 2 MB sleeve is common. 512 KB covers the
 * overwhelming majority of real files including their art; a tag bigger than
 * this yields text but no cover, which is the right way round to fail.
 */
export const HEAD_BYTES = 512 * 1024

/**
 * ...and off the back, for MP4 only.
 *
 * ⚠️ An MP4's `moov` atom — which contains every tag and the cover — may be at
 * either END of the file. Written by a muxer streaming to disk it lands at the
 * back; "faststart" rewrites move it to the front. Reading only the head finds
 * nothing at all on maybe a third of real M4A files, and the symptom is an
 * album that scans as untitled tracks with no art while playing perfectly. This
 * is a known cost, not a surprise: it is one extra range read, and only for MP4s
 * whose head came back without an `ilst`.
 */
export const TAIL_BYTES = 512 * 1024

/**
 * Image files worth remembering as we walk past them.
 *
 * The scan does not read these — it just notes where they are, which costs a
 * map entry each. `tidy.ts` is what decides whether one is an album cover, and
 * it only does so for albums that have no embedded art at all.
 */
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'])

/** Extensions the browser's `<audio>` element can actually decode. */
const PLAYABLE = new Set(['mp3', 'm4a', 'mp4', 'aac', 'flac', 'wav', 'wave', 'aiff', 'aif', 'ogg', 'oga', 'opus'])

/**
 * Extensions we refuse BY NAME, with a sentence each.
 *
 * Refusing well is a suite convention (`@unisim/media` names every container it
 * won't take, on drop, in a sentence). Silence is the bad outcome here: a
 * folder of WMA that scans to "0 tracks" tells someone their music is broken,
 * when the truth is that no browser has ever decoded WMA and Universal
 * Converter will happily turn it into something that plays.
 */
export const REFUSED: Record<string, string> = {
  wma: 'Windows Media audio — no browser decodes it. Universal Converter can turn it into MP3.',
  m4p: 'This track is protected by DRM and no browser can play it.',
  m4b: 'An audiobook container — no browser decodes it.',
  ape: "Monkey's Audio — no browser decodes it. Universal Converter can turn it into FLAC.",
  wv: 'WavPack — no browser decodes it.',
  mid: 'MIDI is a score, not a recording — there is no audio in the file to play.',
  midi: 'MIDI is a score, not a recording — there is no audio in the file to play.',
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

export function isPlayable(name: string): boolean {
  return PLAYABLE.has(extensionOf(name))
}

/** One file found on the way round, before anything has been read from it. */
interface Found {
  file: SourceFile
  path: string
}

/** An image file found beside some music. */
export interface FoundImage {
  /** File name, lower-cased — `tidy.ts` matches on `cover`, `folder` and so on. */
  name: string
  path: string
  file: SourceFile
}

export interface ScanResult {
  tracks: Track[]
  albums: Album[]
  /** Extensions refused, and how many of each — so the UI can name them once. */
  refused: Map<string, number>
  /**
   * path → the live `File`, for every playable file found.
   *
   * Returned from here rather than re-derived by the caller because the walk
   * already has them in hand: `libraryStore` used to walk the directory a
   * SECOND time to build this, which is a full re-enumeration of a
   * five-thousand-file tree to recover something that had just been thrown
   * away. A `File` is a handle, not the bytes — holding five thousand costs
   * almost nothing, and reading one is still the explicit `.slice()` below.
   *
   * ⚠️ Never persist this map. A `File` outlives its permission by exactly
   * nothing, and a stored one is a broken reference that looks valid.
   */
  files: Map<string, SourceFile>
  /**
   * Directory → the image files sitting in it.
   *
   * ⚠️ Collected but NOT read. A folder image is the commonest place an album's
   * artwork lives in a ripped library, and the scanner used to walk straight
   * past every one of them — an album with `cover.jpg` right beside its tracks
   * showed a blank tile. Noting the path costs nothing; reading it is `tidy.ts`'s
   * business, and only for albums that need it.
   */
  images: Map<string, FoundImage[]>
}

export interface ScanOptions {
  /** Called as tracks arrive, so the UI can fill in while the walk continues. */
  onBatch?: (tracks: Track[], albums: Album[]) => void
  onProgress?: (progress: ScanProgress) => void
  /** Aborts the walk between files. */
  signal?: AbortSignal
  /**
   * The root's name, put in front of every path this scan produces.
   *
   * ⚠️ NOT cosmetic. `trackKey` is path + size + mtime, so without it two
   * folders that both contain `Nick Cave/Let Love In/01.mp3` mint the SAME
   * track id and the same `filesByPath` key, and one silently overwrites the
   * other — the bug that had to be fixed before a second folder could be
   * allowed at all. See the header of `lib/roots.ts`.
   *
   * ⚠️ It is applied by BOTH walkers, to paths that are relative to the chosen
   * folder. `webkitRelativePath` already begins with the folder's own name, so
   * `walkFileList` strips that first segment before this goes on — otherwise
   * the same folder would be `Music/Music/…` on Firefox and `Music/…` on
   * Chrome, i.e. two different libraries depending on the browser.
   */
  prefix?: string
}

/** How many tracks to accumulate before handing a batch to the UI and the DB. */
const BATCH = 40

// ── The two ways in ──────────────────────────────────────────────────────────

/**
 * Walk a `FileSystemDirectoryHandle` (Chromium's `showDirectoryPicker`).
 *
 * Depth-first and iterative rather than recursive: a deeply nested library is
 * rare but a recursion that blows the stack halfway through a scan loses
 * everything found so far, and there is no reason to accept that.
 */
async function* walkHandle(
  root: FileSystemDirectoryHandle,
  signal?: AbortSignal,
  rootPrefix = '',
): AsyncGenerator<Found> {
  const stack: { dir: FileSystemDirectoryHandle; prefix: string }[] = [{ dir: root, prefix: rootPrefix }]
  while (stack.length > 0) {
    if (signal?.aborted) return
    const { dir, prefix } = stack.pop()!
    let entries: AsyncIterableIterator<[string, FileSystemHandle]>
    try {
      entries = (dir as unknown as { entries(): AsyncIterableIterator<[string, FileSystemHandle]> }).entries()
    } catch {
      continue
    }
    try {
      for await (const [name, handle] of entries) {
        if (signal?.aborted) return
        // Skip the folders that are never music and are sometimes enormous.
        if (name.startsWith('.') || name === 'node_modules') continue
        const path = prefix ? `${prefix}/${name}` : name
        if (handle.kind === 'directory') {
          stack.push({ dir: handle as FileSystemDirectoryHandle, prefix: path })
        } else {
          try {
            const file = await (handle as FileSystemFileHandle).getFile()
            yield { file, path }
          } catch {
            // A file that vanished or cannot be opened is one file, not a scan.
          }
        }
      }
    } catch {
      // An unreadable directory is skipped rather than fatal.
    }
  }
}

/**
 * The Firefox/Safari path: a `<input webkitdirectory>` FileList, which arrives
 * already flattened with `webkitRelativePath` carrying the folder structure.
 */
function* walkFileList(files: FileList | File[], rootPrefix = ''): Generator<Found> {
  for (const file of Array.from(files)) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
    // ⚠️ Drop the leading segment: `webkitRelativePath` is
    // `<the folder they chose>/<everything below it>`, and the caller has
    // already decided what this root is called. Keeping both would give the
    // same folder a different path on Firefox than on Chrome.
    const relative = rel && rel.length > 0 ? rel.slice(rel.indexOf('/') + 1) || file.name : file.name
    yield { file, path: rootPrefix ? `${rootPrefix}/${relative}` : relative }
  }
}

/**
 * The native path: a walk of the phone's music folder, already flattened.
 *
 * ⚠️ The entries carry ABSOLUTE native paths inside them (`uri`) and a path
 * RELATIVE to the music folder (`path`). Only the relative one is ever put in
 * the library, because `Track.path` is a library key that the root prefix is
 * prepended to — a device-absolute path would embed the app's container UUID,
 * which iOS changes on reinstall, and every track id would churn.
 */
function* walkNativeEntries(entries: NativeEntry[], rootPrefix = ''): Generator<Found> {
  for (const entry of entries) {
    yield {
      file: new NativeFile(entry),
      path: rootPrefix ? `${rootPrefix}/${entry.path}` : entry.path,
    }
  }
}

// ── Reading one file ─────────────────────────────────────────────────────────

/**
 * A range read off disk.
 *
 * ⚠️ Exported so that `lib/lyrics.ts` can re-read one file without reinventing
 * this, which is the only way THE ONE RULE at the top of this file stays true.
 * A second copy of "read a bit of a file" elsewhere in the app is exactly how
 * somebody eventually writes `file.arrayBuffer()` and turns a 40 GB library
 * into an out-of-memory crash.
 */
export async function readSlice(file: SourceFile, start: number, end: number): Promise<Uint8Array> {
  const clampedStart = Math.max(0, Math.min(start, file.size))
  const clampedEnd = Math.max(clampedStart, Math.min(end, file.size))
  if (clampedEnd <= clampedStart) return new Uint8Array(0)
  // ⚠️ `.slice(...)` first, ALWAYS. See the rule at the top of this file.
  const buffer = await file.slice(clampedStart, clampedEnd).arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Tags for one file, reading as little as will do.
 *
 * `wantArt` is passed straight through: art is only ever asked for on the first
 * track met from a given album, which is what keeps the artwork cache one
 * picture per record instead of one per file.
 */
async function readOne(file: SourceFile, wantArt: boolean) {
  const ext = extensionOf(file.name)
  const head = await readSlice(file, 0, HEAD_BYTES)
  let tags = readTags(head, wantArt)

  // The MP4 tail read — see TAIL_BYTES. Only when the head yielded nothing
  // useful, so a faststart file costs one read like everything else.
  const isMp4 = ext === 'm4a' || ext === 'mp4' || ext === 'aac'
  if (isMp4 && !tags.title && !tags.album && file.size > HEAD_BYTES) {
    const tail = await readSlice(file, file.size - TAIL_BYTES, file.size)
    const fromTail = readTags(tail, wantArt)
    if (fromTail.title || fromTail.album || fromTail.picture) tags = fromTail
  }
  return tags
}

/**
 * A readable title for a file whose tags gave us nothing.
 *
 * Strips a leading track number and the extension, and turns underscores into
 * spaces — the shape a downloaded folder of "04_Song_Name.mp3" actually has.
 * Deliberately conservative: it never invents an artist, because a wrong artist
 * is worse than no artist and there is no way to tell "Artist - Title" from a
 * song whose title contains a dash.
 */
export function titleFromFilename(name: string): string {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  return stem
    // ⚠️ TWO rules, because one cannot tell "04 Song Name" from "99 Problems".
    //
    //   1. Digits followed by a SEPARATOR — "04 - ", "04.", "04_", "4)" — is a
    //      track number in every ripper's naming scheme.
    //   2. Digits followed only by a space are ambiguous, so a leading ZERO
    //      decides it: "04 Song Name" is track four, "99 Problems" is a song and
    //      "1979" is a whole title. Nobody zero-pads a number they mean to keep.
    //
    // Rule 2 was missing at first, which left the single most common download
    // filename shape — "04 Song Name.mp3" — showing its track number in the
    // title of every row. The tests are what found it.
    .replace(/^\s*\d{1,3}\s*[-._)]+\s*/, '')
    .replace(/^\s*0\d{0,2}\s+/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || name
}

// ── The scan ─────────────────────────────────────────────────────────────────

/**
 * Walk a source, read every playable file's header, and build the library.
 *
 * Returns everything it found, and calls `onBatch` along the way with the same
 * data so the caller can persist and render incrementally. The two are not
 * alternatives: the return value is what a caller wants at the end, the
 * callback is what makes the app feel alive during.
 */
export async function scan(
  source: ScanSource,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const { onBatch, onProgress, signal, prefix = '' } = options

  const tracks: Track[] = []
  const albums = new Map<string, Album>()
  const refused = new Map<string, number>()
  const files = new Map<string, SourceFile>()
  const images = new Map<string, FoundImage[]>()
  /** Album ids we have already tried to get a cover for. */
  const artTried = new Set<string>()

  let seen = 0
  let added = 0
  let skipped = 0
  let where = ''

  let batchTracks: Track[] = []
  let batchAlbums: Album[] = []

  const flush = () => {
    if (batchTracks.length === 0 && batchAlbums.length === 0) return
    onBatch?.(batchTracks, batchAlbums)
    batchTracks = []
    batchAlbums = []
  }

  const report = (done = false) => {
    onProgress?.({ seen, added, skipped, where, done })
  }

  const walker = isDirectoryHandle(source)
    ? walkHandle(source, signal, prefix)
    : isNativeEntries(source)
      ? walkNativeEntries(source, prefix)
      : walkFileList(source as FileList | File[], prefix)

  for await (const found of walker) {
    if (signal?.aborted) break
    seen++
    const ext = extensionOf(found.file.name)

    if (!PLAYABLE.has(ext)) {
      if (IMAGE_EXTS.has(ext)) {
        const dir = directoryOf(found.path)
        const list = images.get(dir)
        const image: FoundImage = { name: found.file.name.toLowerCase(), path: found.path, file: found.file }
        if (list) list.push(image)
        else images.set(dir, [image])
      }
      if (REFUSED[ext]) refused.set(ext, (refused.get(ext) ?? 0) + 1)
      skipped++
      // Reporting on every single file makes the scan slower than the disk.
      if (seen % 25 === 0) report()
      continue
    }

    where = directoryOf(found.path)

    // The album a file belongs to is only known AFTER its tags are read, and
    // whether to ask for art is only known from the album. So: read text first,
    // then re-read for art on the one track that establishes a new album. The
    // second read is a slice off the same warm file and only happens once per
    // record.
    let tags
    try {
      tags = await readOne(found.file, false)
    } catch {
      tags = {}
    }

    const id = albumKey(tags)
    let picture: Picture | undefined
    if (!artTried.has(id)) {
      artTried.add(id)
      try {
        picture = (await readOne(found.file, true)).picture
      } catch {
        picture = undefined
      }
    }

    const track: Track = {
      id: trackKey({ path: found.path, size: found.file.size, mtime: found.file.lastModified }),
      path: found.path,
      name: found.file.name,
      size: found.file.size,
      mtime: found.file.lastModified,
      ext,
      title: tags.title?.trim() || titleFromFilename(found.file.name),
      artist: tags.artist,
      albumArtist: tags.albumArtist,
      album: tags.album,
      trackNo: tags.trackNo,
      discNo: tags.discNo,
      year: tags.year,
      genre: tags.genre,
      albumId: id,
    }
    tracks.push(track)
    batchTracks.push(track)
    files.set(found.path, found.file)
    added++

    const existing = albums.get(id)
    if (existing) {
      existing.trackCount++
      // The first track that HAS a year sets it. A single mistagged file
      // shouldn't be able to move an album into another decade, and there is no
      // cheap way to take a majority vote while streaming.
      existing.year ??= tags.year
      if (!existing.cover && picture) {
        existing.cover = await makeCoverBlob(picture)
        batchAlbums.push(existing)
      }
    } else {
      const album: Album = {
        id,
        title: tags.album?.trim() || 'Unknown album',
        artist: (tags.albumArtist || tags.artist)?.trim() || 'Unknown artist',
        year: tags.year,
        trackCount: 1,
        cover: picture ? await makeCoverBlob(picture) : null,
      }
      albums.set(id, album)
      batchAlbums.push(album)
    }

    if (batchTracks.length >= BATCH) {
      flush()
      report()
      // Hand the main thread back so the grid can paint. Without this the whole
      // scan is one long task and the "live progress" never renders — the
      // classic way a streaming design ends up behaving exactly like a blocking
      // one.
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  flush()
  report(true)

  return { tracks, albums: [...albums.values()], refused, files, images }
}

/** The folder a path sits in — '' for a file at the root of the chosen folder. */
export function directoryOf(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? '' : path.slice(0, slash)
}

/** Everything `scan()` knows how to walk. */
export type ScanSource = FileSystemDirectoryHandle | FileList | File[] | NativeEntry[]

/**
 * ⚠️ Checked BEFORE the FileList fallback, and by a field a `File` does not
 * have. `NativeEntry[]` and `File[]` are both arrays, so an `Array.isArray`
 * test cannot tell them apart — and getting it wrong sends native entries
 * through `walkFileList`, which reads `.name` off them (they have one) and
 * produces a library of zero-byte tracks that never play.
 */
function isNativeEntries(source: unknown): source is NativeEntry[] {
  return Array.isArray(source) && (source.length === 0 || typeof (source[0] as NativeEntry)?.uri === 'string')
}

function isDirectoryHandle(source: unknown): source is FileSystemDirectoryHandle {
  return (
    typeof source === 'object' &&
    source !== null &&
    (source as FileSystemHandle).kind === 'directory'
  )
}

/** Does this browser have the API that lets a chosen folder survive a reload? */
export function hasDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}
