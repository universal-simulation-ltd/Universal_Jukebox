import { create } from 'zustand'
import { makeCoverBlob, releaseCover } from '../lib/art'
import * as db from '../lib/library'
import { readSlice } from '../lib/scan'
import { readTags, type Picture } from '../lib/tags'
import {
  findCoverGaps,
  findMerges,
  pickFolderImage,
  type MergeProposal,
} from '../lib/tidy'
import type { SourceFile } from '../lib/types'
import { useLibraryStore } from './libraryStore'

// Looking over the library for things that can be put right, and putting them
// right when asked.
//
// ⚠️ Two passes, and they are separated on purpose. FINDING reads files and can
// take a moment on a large library; APPLYING is instant and only touches what
// the user ticked. Anything that changes the library happens in `apply`, after a
// person has looked at a list and pressed a button — `tidy.ts` explains at
// length why nothing here may act on its own.

/** How much of a file to read when hunting for embedded art. */
const ART_READ_BYTES = 512 * 1024

export interface CoverProposal {
  kind: 'cover'
  albumId: string
  title: string
  artist: string
  /** Where the picture came from, for the sentence shown to the user. */
  source: 'folder' | 'track'
  sourceLabel: string
  picture: Picture
  /** A preview URL, revoked when the proposals are dropped. */
  previewUrl: string
}

export type Proposal = CoverProposal | MergeProposal

export type TidyStatus = 'idle' | 'looking' | 'done' | 'unavailable'

interface TidyState {
  status: TidyStatus
  proposals: Proposal[]
  /** Keys of the proposals the user has left ticked. */
  chosen: Set<string>
  /** How many albums were checked, for an honest "nothing to do" message. */
  checked: number
  applied: number

  look(): Promise<void>
  toggle(key: string): void
  chooseAll(on: boolean): void
  apply(): Promise<void>
  reset(): void
}

/** A stable identity for a proposal, for the tick boxes. */
export function proposalKey(p: Proposal): string {
  return p.kind === 'cover' ? `cover:${p.albumId}` : `merge:${p.intoAlbumId}:${p.trackIds.join(',')}`
}

export const useTidyStore = create<TidyState>((set, get) => ({
  status: 'idle',
  proposals: [],
  chosen: new Set(),
  checked: 0,
  applied: 0,

  async look() {
    const library = useLibraryStore.getState()
    const { tracks, albums, filesByPath, folderImages } = library

    // Reading art needs the actual files, which need the folder permission. On
    // a reloaded library that has not been re-granted there is nothing to read,
    // and saying so beats finding zero covers and calling the library tidy.
    if (filesByPath.size === 0) {
      set({ status: 'unavailable', proposals: [], checked: 0 })
      return
    }

    releasePreviews(get().proposals)
    set({ status: 'looking', proposals: [], chosen: new Set(), applied: 0 })

    const byId = new Map(tracks.map((t) => [t.id, t]))
    const gaps = findCoverGaps(tracks, albums)
    const found: Proposal[] = []

    for (const gap of gaps) {
      const picture = await findPicture(gap, byId, filesByPath, folderImages)
      if (!picture) continue
      found.push({
        kind: 'cover',
        albumId: gap.albumId,
        title: gap.title,
        artist: gap.artist,
        source: picture.source,
        sourceLabel: picture.label,
        picture: picture.picture,
        previewUrl: URL.createObjectURL(
          new Blob([picture.picture.bytes as BlobPart], { type: picture.picture.mime }),
        ),
      })
      // Hand the main thread back so a big library does not freeze the tab.
      await new Promise((r) => setTimeout(r, 0))
    }

    found.push(...findMerges(tracks, albums))

    set({
      status: 'done',
      proposals: found,
      // Everything starts ticked: the rules are narrow enough that the common
      // case is "yes, all of that", and un-ticking one is easier than ticking
      // eleven.
      chosen: new Set(found.map(proposalKey)),
      checked: gaps.length,
    })
  },

  toggle(key) {
    const chosen = new Set(get().chosen)
    if (chosen.has(key)) chosen.delete(key)
    else chosen.add(key)
    set({ chosen })
  },

  chooseAll(on) {
    set({ chosen: on ? new Set(get().proposals.map(proposalKey)) : new Set() })
  },

  async apply() {
    const { proposals, chosen } = get()
    const taking = proposals.filter((p) => chosen.has(proposalKey(p)))
    if (taking.length === 0) return

    const library = useLibraryStore.getState()
    let tracks = [...library.tracks]
    let albums = [...library.albums]
    const fixes: db.Fix[] = []

    // ── Covers ─────────────────────────────────────────────────────────────
    for (const p of taking) {
      if (p.kind !== 'cover') continue
      const blob = await makeCoverBlob(p.picture)
      if (!blob) continue
      // ⚠️ Drop any cached object URL for this album first. `art.ts` mints one
      // URL per album id and caches it, so without this the grid would go on
      // showing the fallback tile it had already minted — the fix would work
      // and be invisible until a reload.
      releaseCover(p.albumId)
      albums = albums.map((a) => (a.id === p.albumId ? { ...a, cover: blob } : a))
      fixes.push({ id: db.coverFixId(p.albumId), kind: 'cover', albumId: p.albumId, blob })
    }

    // ── Merges ─────────────────────────────────────────────────────────────
    const moved = new Map<string, string>()
    for (const p of taking) {
      if (p.kind !== 'merge') continue
      for (const trackId of p.trackIds) moved.set(trackId, p.intoAlbumId)
    }
    if (moved.size > 0) {
      tracks = tracks.map((t) => {
        const into = moved.get(t.id)
        return into && into !== t.albumId ? { ...t, albumId: into } : t
      })
      for (const [trackId, albumId] of moved) {
        fixes.push({ id: db.albumFixId(trackId), kind: 'album', trackId, albumId })
      }
    }

    // Counts recomputed rather than adjusted — a merge can empty an album, and
    // an emptied album must go rather than linger as a blank tile.
    const counts = new Map<string, number>()
    for (const t of tracks) counts.set(t.albumId, (counts.get(t.albumId) ?? 0) + 1)
    const gone = albums.filter((a) => (counts.get(a.id) ?? 0) === 0)
    for (const a of gone) releaseCover(a.id)
    albums = albums
      .filter((a) => (counts.get(a.id) ?? 0) > 0)
      .map((a) => ({ ...a, trackCount: counts.get(a.id) ?? 0 }))

    useLibraryStore.setState({ tracks, albums })

    await Promise.all([
      db.putTracks(tracks),
      db.putAlbums(albums),
      db.putFixes(fixes),
      ...gone.map((a) => db.deleteAlbum(a.id)),
    ])

    releasePreviews(proposals)
    set({ status: 'done', proposals: [], chosen: new Set(), applied: taking.length })
  },

  reset() {
    releasePreviews(get().proposals)
    set({ status: 'idle', proposals: [], chosen: new Set(), checked: 0, applied: 0 })
  },
}))

function releasePreviews(proposals: Proposal[]): void {
  for (const p of proposals) {
    if (p.kind === 'cover') URL.revokeObjectURL(p.previewUrl)
  }
}

interface FoundPicture {
  picture: Picture
  source: 'folder' | 'track'
  label: string
}

/**
 * Look for a cover for one album, cheapest source first.
 *
 * A folder image is one read of one small file; hunting through the album's
 * tracks is a 512 KB read each. So the folder is tried first — and on a ripped
 * library that is also where the answer usually is.
 */
async function findPicture(
  gap: { albumId: string; directories: string[]; trackIds: string[] },
  byId: Map<string, { path: string; name: string }>,
  files: Map<string, SourceFile>,
  folderImages: Map<string, { name: string; path: string; file: SourceFile }[]>,
): Promise<FoundPicture | null> {
  // ── 1. An image sitting beside the tracks ────────────────────────────────
  for (const dir of gap.directories) {
    const image = pickFolderImage(folderImages.get(dir) ?? [])
    if (!image) continue
    try {
      // ⚠️ `readSlice`, not `arrayBuffer()`, even though this genuinely does
      // want the whole file. A folder image is small and reading all of it is
      // correct — but going through the one sanctioned read keeps THE ONE RULE
      // at the top of `lib/scan.ts` literally true, so a search for
      // `arrayBuffer(` still turns up nothing to argue with. It is also what
      // lets a native file, which has no `arrayBuffer`, get here at all.
      const bytes = await readSlice(image.file, 0, image.file.size)
      const mime = image.file.type || guessMime(image.name)
      if (bytes.byteLength > 64 && mime) {
        return { picture: { mime, bytes }, source: 'folder', label: image.path }
      }
    } catch { /* unreadable image — try the next place */ }
  }

  // ── 2. Embedded art in any of the album's own tracks ─────────────────────
  //
  // ⚠️ The scan only asks the FIRST track it meets from each album, because
  // reading art from all of them would be a 512 KB read per file across the
  // whole library. That is right for a scan and wrong afterwards: an album
  // whose sleeve happens to be on track 2 shows nothing at all. Here we are
  // looking at a handful of albums the user asked us to look at, so the cost
  // is affordable and the miss is worth catching.
  for (const trackId of gap.trackIds) {
    const meta = byId.get(trackId)
    const file = meta ? files.get(meta.path) : undefined
    if (!file) continue
    try {
      const slice = await file.slice(0, ART_READ_BYTES).arrayBuffer()
      const tags = readTags(new Uint8Array(slice), true)
      if (tags.picture) {
        return { picture: tags.picture, source: 'track', label: meta?.name ?? 'a track on this album' }
      }
    } catch { /* one unreadable file is not a failed tidy */ }
  }

  return null
}

function guessMime(name: string): string | null {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return null
}
