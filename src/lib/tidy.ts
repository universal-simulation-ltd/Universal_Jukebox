import { directoryOf } from './scan'
import { UNKNOWN_ALBUM } from './keys'
import type { Album, Track } from './types'

// Tidying up a library, using only what is already on the disk.
//
// ⚠️ THERE IS NO LOOKUP, AND THERE NEVER WILL BE. Every other music player
// solves missing artwork by asking MusicBrainz or the Cover Art Archive, which
// means sending somebody's album and artist names to a server. This app's whole
// claim is that nothing leaves the machine, and "we only send the metadata" is
// exactly the sentence people say when they have quietly started sending
// something. So a cover comes from one of two places, both local:
//
//   1. An image file sitting in the same folder as the tracks — `cover.jpg`,
//      `folder.jpg`, and the handful of other names rippers use. The scanner
//      walks past these already; it just never used to note them.
//   2. Embedded art in ANOTHER track of the same album. The scan asks the first
//      track it meets for art, so an album whose sleeve is on track 2 shows
//      nothing at all — which looks exactly like an album with no art.
//
// ⚠️ AND EVERYTHING HERE IS A PROPOSAL, NEVER AN ACTION. `keys.ts` says it
// already: a wrongly merged album cannot be told apart afterwards. So this file
// finds candidates and explains them, and a person presses the button. The rules
// below are deliberately narrow — a rule that is right 95% of the time is a rule
// that quietly ruins one album in twenty.

/** File names rippers actually use for cover art, without their extension. */
const COVER_NAMES = [
  'cover', 'folder', 'front', 'album', 'albumart', 'albumartsmall',
  'artwork', 'sleeve', 'frontcover', 'thumb',
]

/**
 * How confident we are that a folder image is THIS album's cover.
 *
 * Lower is better; `null` means "not a cover, leave it alone". A photo someone
 * dropped in the folder is not artwork, and guessing wrong replaces a blank
 * tile — which is honest — with a wrong picture, which is not.
 */
export function coverNameRank(fileName: string): number | null {
  const dot = fileName.lastIndexOf('.')
  const stem = (dot > 0 ? fileName.slice(0, dot) : fileName).toLowerCase().replace(/[\s_-]+/g, '')
  const at = COVER_NAMES.indexOf(stem)
  return at < 0 ? null : at
}

/** The best cover-looking image in a folder, or null if none of them qualify. */
export function pickFolderImage<T extends { name: string }>(images: T[]): T | null {
  let best: T | null = null
  let bestRank = Number.MAX_SAFE_INTEGER
  for (const image of images) {
    const rank = coverNameRank(image.name)
    if (rank === null || rank >= bestRank) continue
    best = image
    bestRank = rank
  }
  return best
}

// ── Merges ───────────────────────────────────────────────────────────────────

export interface MergeProposal {
  kind: 'merge'
  /** The album everything is being folded into. */
  intoAlbumId: string
  intoTitle: string
  intoArtist: string
  /** Albums folded in whole; they will end up with no tracks and be removed. */
  fromAlbumIds: string[]
  /** The tracks that move. */
  trackIds: string[]
  /** One sentence, shown to the user, saying why this is safe. */
  reason: string
}

/** Every distinct folder an album's tracks live in. */
function albumDirectories(tracks: Track[]): Map<string, Set<string>> {
  const byAlbum = new Map<string, Set<string>>()
  for (const track of tracks) {
    const dirs = byAlbum.get(track.albumId)
    const dir = directoryOf(track.path)
    if (dirs) dirs.add(dir)
    else byAlbum.set(track.albumId, new Set([dir]))
  }
  return byAlbum
}

/**
 * Find merges that are safe enough to offer.
 *
 * ⚠️ Both rules key off the FOLDER, which is the only strong signal available
 * without asking anyone anything. Tracks sitting in one directory are one album
 * in every library anybody actually has; two albums that share a directory are
 * almost always one album with inconsistent tags.
 *
 * Deliberately NOT offered, because each is wrong often enough to matter:
 *
 * - Same album title in DIFFERENT folders. That is "Greatest Hits" by two
 *   artists, or a record you own twice at two bitrates.
 * - Titles that differ by punctuation or a suffix — "Album" and "Album (Deluxe
 *   Edition)" are different releases with different track lists, and a person
 *   who has both has them on purpose.
 * - Anything based on how similar two strings look. Fuzzy matching is where a
 *   tidy-up feature starts destroying libraries.
 */
export function findMerges(tracks: Track[], albums: Album[]): MergeProposal[] {
  const byId = new Map(albums.map((a) => [a.id, a]))
  const dirs = albumDirectories(tracks)
  const proposals: MergeProposal[] = []

  // Which properly-tagged albums occupy each directory, and which album-less
  // tracks are sitting in it.
  //
  // ⚠️ "Album-less" is `!track.album`, NOT `albumId === UNKNOWN_ALBUM`, and the
  // difference is most of the cases this rule exists for. A track with an
  // artist tag but no album tag does not land in the unknown bucket — it gets
  // an album key of its own (artist + empty title) and becomes a one-track
  // album called "Unknown album" sitting next to the record it belongs to.
  // Keying off the bucket found only the tracks with no tags at all, which is
  // the rarer half. Caught by a test fixture with exactly that shape.
  const knownInDir = new Map<string, Set<string>>()
  const looseInDir = new Map<string, Track[]>()
  for (const track of tracks) {
    const dir = directoryOf(track.path)
    if (!track.album || track.album.trim() === '') {
      const list = looseInDir.get(dir)
      if (list) list.push(track)
      else looseInDir.set(dir, [track])
    } else {
      const set = knownInDir.get(dir)
      if (set) set.add(track.albumId)
      else knownInDir.set(dir, new Set([track.albumId]))
    }
  }

  const merged = new Set<string>()

  // ── Rule 1: two albums confined to the same single folder ────────────────
  for (const [dir, ids] of knownInDir) {
    if (ids.size < 2) continue
    // Every one of them must live ONLY here. An album spread across this folder
    // and others is a different thing that happens to have a track in common.
    const confined = [...ids].filter((id) => {
      const d = dirs.get(id)
      return d && d.size === 1 && d.has(dir)
    })
    if (confined.length < 2) continue

    // Only when they agree on the album TITLE. Two genuinely different records
    // in one folder is a folder of singles, and merging those is destructive.
    const byTitle = new Map<string, string[]>()
    for (const id of confined) {
      const album = byId.get(id)
      if (!album) continue
      const title = normalise(album.title)
      const list = byTitle.get(title)
      if (list) list.push(id)
      else byTitle.set(title, [id])
    }

    for (const [, ids2] of byTitle) {
      if (ids2.length < 2) continue
      const keep = pickSurvivor(ids2, byId, tracks)
      const from = ids2.filter((id) => id !== keep)
      if (from.some((id) => merged.has(id))) continue
      from.forEach((id) => merged.add(id))
      const keeper = byId.get(keep)
      proposals.push({
        kind: 'merge',
        intoAlbumId: keep,
        intoTitle: keeper?.title ?? 'Unknown album',
        intoArtist: keeper?.artist ?? 'Unknown artist',
        fromAlbumIds: from,
        trackIds: tracks.filter((t) => from.includes(t.albumId)).map((t) => t.id),
        reason: `Same album name, same folder (${dir || 'the chosen folder'}), different artist tags.`,
      })
    }
  }

  // ── Rule 2: album-less tracks sitting in one album's folder ─────────────
  for (const [dir, loose] of looseInDir) {
    const known = knownInDir.get(dir)
    // Exactly one known album here, or there is no single right answer.
    if (!known || known.size !== 1) continue
    const intoId = [...known][0]
    if (merged.has(intoId)) continue
    const album = byId.get(intoId)
    if (!album) continue
    proposals.push({
      kind: 'merge',
      intoAlbumId: intoId,
      intoTitle: album.title,
      intoArtist: album.artist,
      fromAlbumIds: [],
      trackIds: loose.map((t) => t.id),
      reason: `${loose.length === 1 ? 'This track has' : 'These tracks have'} no album tag, but ${loose.length === 1 ? 'sits' : 'sit'} in the same folder (${dir || 'the chosen folder'}) as the rest of the record.`,
    })
  }

  return proposals
}

/**
 * Which of a set of duplicate albums to keep.
 *
 * The one with the most tracks, because it is the one most of the library
 * already points at. Ties go to the album whose artist is not the fallback —
 * "Unknown artist" surviving a merge would take a real name off a record.
 */
function pickSurvivor(ids: string[], byId: Map<string, Album>, tracks: Track[]): string {
  const counts = new Map<string, number>()
  for (const track of tracks) {
    if (ids.includes(track.albumId)) counts.set(track.albumId, (counts.get(track.albumId) ?? 0) + 1)
  }
  return [...ids].sort((a, b) => {
    const byCount = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    if (byCount !== 0) return byCount
    const known = (id: string) => (byId.get(id)?.artist === 'Unknown artist' ? 1 : 0)
    const byKnown = known(a) - known(b)
    if (byKnown !== 0) return byKnown
    return a.localeCompare(b)
  })[0]
}

function normalise(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ── Covers ───────────────────────────────────────────────────────────────────

/** An album with no artwork, and where we might look for some. */
export interface CoverGap {
  albumId: string
  title: string
  artist: string
  /** The folders this album's tracks live in. */
  directories: string[]
  /** Its tracks, so their embedded art can be tried. */
  trackIds: string[]
}

/** Albums with no cover at all. */
export function findCoverGaps(tracks: Track[], albums: Album[]): CoverGap[] {
  const dirs = albumDirectories(tracks)
  const byAlbum = new Map<string, string[]>()
  for (const track of tracks) {
    const list = byAlbum.get(track.albumId)
    if (list) list.push(track.id)
    else byAlbum.set(track.albumId, [track.id])
  }

  return albums
    .filter((album) => !album.cover)
    // The unknown bucket is not a record and has no sleeve to find.
    .filter((album) => album.id !== UNKNOWN_ALBUM)
    .map((album) => ({
      albumId: album.id,
      title: album.title,
      artist: album.artist,
      directories: [...(dirs.get(album.id) ?? [])],
      trackIds: byAlbum.get(album.id) ?? [],
    }))
}

// ── Applying fixes ───────────────────────────────────────────────────────────

/** A fix as stored, without the IndexedDB plumbing. */
export type StoredFix =
  | { kind: 'cover'; albumId: string; blob: Blob }
  | { kind: 'album'; trackId: string; albumId: string }

/**
 * Fold stored fixes back into a freshly scanned library.
 *
 * ⚠️ This is what makes tidying stick. Everything in `tracks` and `albums` is
 * derived from the files and thrown away by every rescan, so without this a
 * person's corrections would last exactly until they added an album — and a
 * tidy-up you have to redo is worse than none, because you have to remember
 * whether you did it.
 *
 * Pure, so the fiddly part (an album that loses its last track, a fix pointing
 * at music that is no longer there) is checkable without a browser.
 */
export function applyFixes(
  tracks: Track[],
  albums: Album[],
  fixes: StoredFix[],
): { tracks: Track[]; albums: Album[] } {
  const albumOf = new Map<string, string>()
  const covers = new Map<string, Blob>()
  for (const fix of fixes) {
    if (fix.kind === 'album') albumOf.set(fix.trackId, fix.albumId)
    else covers.set(fix.albumId, fix.blob)
  }

  const known = new Set(albums.map((a) => a.id))
  const nextTracks = tracks.map((track) => {
    const moved = albumOf.get(track.id)
    // ⚠️ Only to an album that still exists. A fix can outlive its target — the
    // folder was renamed, the record deleted — and moving a track into an album
    // id nothing else refers to would hide it from every view in the app.
    return moved && moved !== track.albumId && known.has(moved) ? { ...track, albumId: moved } : track
  })

  // Track counts have to be recomputed rather than adjusted: a merge can empty
  // an album completely, and an album with no tracks must not survive as a
  // permanently blank tile.
  const counts = new Map<string, number>()
  for (const track of nextTracks) counts.set(track.albumId, (counts.get(track.albumId) ?? 0) + 1)

  const nextAlbums = albums
    .filter((album) => (counts.get(album.id) ?? 0) > 0)
    .map((album) => ({
      ...album,
      trackCount: counts.get(album.id) ?? 0,
      cover: covers.get(album.id) ?? album.cover,
    }))

  return { tracks: nextTracks, albums: nextAlbums }
}
