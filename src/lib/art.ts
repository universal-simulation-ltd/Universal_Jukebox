// Cover art: extracted bytes in, a drawable URL out — with the memory
// discipline that makes the difference between a library that opens and a tab
// the browser kills.
//
// ⚠️ THE ARITHMETIC THAT SHAPES THIS FILE. A 5,000-track library where each
// file carries a 500 KB embedded JPEG is 2.5 GB of artwork. Holding that as
// blobs is not slow, it is fatal. Two rules follow, and everything here is one
// of them:
//
//   1. **One cover per ALBUM, not per track.** A 14-track album has 14 copies of
//      the same picture in the files; the library needs one. `scan.ts` therefore
//      only asks `readTags` for art on the first track it meets from each album.
//   2. **Downscale before storing.** A 3000x3000 sleeve is stored to be shown at
//      most 512px wide. The stored copy is the small one; the original is left
//      in the file, where it already lives, at no cost to us.
//
// Together those take the same library to roughly 400 albums x ~40 KB ≈ 16 MB,
// which is an ordinary IndexedDB.

import { downscaleImage } from '@unisim/sdk'
import type { Picture } from './tags'

/**
 * The stored edge length. 512 is chosen against the largest place a cover is
 * ever drawn — the Now Playing deck, which is capped at 420px CSS and doubles
 * on a 2x screen. Storing bigger buys nothing visible; storing smaller shows on
 * exactly the one screen the app is built around.
 */
export const COVER_MAX = 512

/**
 * WebP at 0.82: about half the bytes of an equivalent JPEG at a quality nobody
 * can pick out at album-grid size. Every browser that can play a FLAC in an
 * `<audio>` element can also encode WebP, so there is no fallback branch to
 * maintain — and if the encode fails for any reason we keep the original bytes
 * rather than losing the cover.
 */
const COVER_TYPE = 'image/webp'
const COVER_QUALITY = 0.82

/**
 * Turn an embedded picture into the blob we store.
 *
 * Never throws: a cover that will not decode is a cover we do not have, and
 * that must not stop an album — let alone a scan — from existing. The album
 * simply shows its fallback tile.
 */
export async function makeCoverBlob(picture: Picture): Promise<Blob | null> {
  try {
    // `downscaleImage` takes a File and gives one back; the name is never used
    // for anything but its own type sniffing.
    const source = new File([picture.bytes as BlobPart], 'cover', { type: picture.mime })
    const small = await downscaleImage(source, {
      maxDimension: COVER_MAX,
      mimeType: COVER_TYPE,
      quality: COVER_QUALITY,
    })
    // A downscale that came back BIGGER means the source was already small and
    // well compressed — keep whichever is smaller rather than paying for the
    // round trip.
    return small.size > 0 && small.size < picture.bytes.byteLength
      ? small
      : new Blob([picture.bytes as BlobPart], { type: picture.mime })
  } catch {
    try {
      return new Blob([picture.bytes as BlobPart], { type: picture.mime })
    } catch {
      return null
    }
  }
}

// ── Object URLs ──────────────────────────────────────────────────────────────
//
// `URL.createObjectURL` pins its blob in memory until `revokeObjectURL` is
// called. An album grid that mints a URL per render and never revokes leaks the
// whole artwork cache back into the tab — the exact thing rule 2 above was
// avoiding, arrived at from the other direction.
//
// So URLs are minted ONCE per album and cached here, keyed by album id. The
// cache is bounded: past `MAX_LIVE_URLS` the least recently used are revoked.
// A revoked album that scrolls back into view simply mints a new URL from the
// blob still in IndexedDB.

const MAX_LIVE_URLS = 300

/** albumId → object URL, in least-recently-used-first order (Map preserves insertion). */
const urls = new Map<string, string>()

/**
 * A drawable URL for an album's cover blob, minted at most once.
 *
 * Call it with the blob you already have; it will not go to the database.
 * Returns null for an album with no cover, which the UI renders as its
 * generated fallback tile rather than a broken image.
 */
export function coverUrl(albumId: string, blob: Blob | null | undefined): string | null {
  const existing = urls.get(albumId)
  if (existing) {
    // Re-insert to mark it recently used.
    urls.delete(albumId)
    urls.set(albumId, existing)
    return existing
  }
  if (!blob) return null

  const url = URL.createObjectURL(blob)
  urls.set(albumId, url)

  // Evict from the front — the Map's iteration order is insertion order, and
  // every hit above re-inserts, so the front is genuinely the least recent.
  while (urls.size > MAX_LIVE_URLS) {
    const oldest = urls.keys().next()
    if (oldest.done) break
    const dead = urls.get(oldest.value)
    if (dead) URL.revokeObjectURL(dead)
    urls.delete(oldest.value)
  }
  return url
}

/** Drop one album's URL — after a rescan replaces its cover, say. */
export function releaseCover(albumId: string): void {
  const url = urls.get(albumId)
  if (!url) return
  URL.revokeObjectURL(url)
  urls.delete(albumId)
}

/** Drop everything. Used when the library is cleared or the folder changes. */
export function releaseAllCovers(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url)
  urls.clear()
}

// ── The fallback tile ────────────────────────────────────────────────────────

/**
 * A stable colour for an album with no artwork.
 *
 * Derived from the album id, so the same record is the same colour on every
 * visit — which is what makes an untagged library navigable at all. Two albums
 * being similar is fine; an album changing colour between sessions is not, and
 * that is why this hashes rather than picking at random.
 *
 * Hues avoid the 20°–45° band the brand orange occupies, so a fallback tile
 * never reads as a UI accent.
 */
export function fallbackHue(albumId: string): number {
  let hash = 0
  for (let i = 0; i < albumId.length; i++) {
    hash = (hash * 31 + albumId.charCodeAt(i)) | 0
  }
  const h = Math.abs(hash) % 300
  return h >= 20 ? h + 45 : h
}
