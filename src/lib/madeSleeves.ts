// madeSleeves.ts — a sleeve for every album whose files carry no artwork
// (James, 2026-11-05: "In the case of an album having no album artwork, assign
// it a random Universal Jukebox cover (like in the library) and write the
// artist and album on the sleeve. At the moment it's just a blank colour").
//
// One of the example library's photographs (`exampleCovers.ts`), with the
// album and artist set on it by the same painter (`photoSleeve.ts`). "Random"
// but STABLE: the photo and the lettering are picked by a hash of the album's
// id, so a record is the same sleeve on every visit, and two albums by one
// artist rarely share a photo.
//
// ⚠️ DISPLAY ONLY — NEVER WRITTEN INTO `album.cover`. A null cover is load-
// bearing elsewhere: Tidy offers to find artwork for exactly those albums,
// a rescan only fills a cover that is empty (`scan.ts`), and the shelves
// prefer albums with real art. So the made sleeve lives here, in memory, and
// is drawn again (a few milliseconds each) the next time the app opens.
//
// ⚠️ ASYNCHRONOUS. A photo has to decode and a canvas has to encode, so the
// first frame shows the old colour tile and the sleeve replaces it when it is
// ready. Components read it through `useAlbumArt` (re-renders when it lands);
// code outside React awaits `albumArt`.

import { create } from 'zustand'
import { coverUrl } from './art'
import { shownName } from './format'
import type { Album } from './types'

/** Small: it is only ever a tile, a label or a sleeve, and a big library may have hundreds. */
const SIZE = 400
const QUALITY = 0.8

interface MadeState {
  /** albumId → object URL of its made sleeve. */
  urls: Record<string, string>
}

export const useMadeSleeves = create<MadeState>(() => ({ urls: {} }))

const pending = new Map<string, Promise<string | null>>()
/** Set once drawing has failed for good here (no canvas, no photos), so it isn't retried on every render. */
let unavailable = false

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Which photo and which lettering an album gets. Pure; exported for the test. */
export function sleeveChoice(albumId: string, photos: number): { photo: number; serif: boolean; centred: boolean } {
  const h = hash(albumId)
  return { photo: h % photos, serif: ((h >>> 8) & 3) === 0, centred: ((h >>> 12) & 3) === 0 }
}

/** The made sleeve's URL if it is drawn already; null otherwise (and it is started). */
export function madeSleeveNow(album: Album): string | null {
  const url = useMadeSleeves.getState().urls[album.id]
  if (url) return url
  void madeSleeve(album)
  return null
}

/** Draw (once) and return the album's made sleeve. */
export function madeSleeve(album: Album): Promise<string | null> {
  const done = useMadeSleeves.getState().urls[album.id]
  if (done) return Promise.resolve(done)
  if (unavailable || typeof document === 'undefined') return Promise.resolve(null)
  const running = pending.get(album.id)
  if (running) return running
  const job = (async () => {
    try {
      const [{ EXAMPLE_PHOTOS }, { paintPhotoSleeve }] = await Promise.all([import('./exampleCovers'), import('./photoSleeve')])
      const photos = Object.values(EXAMPLE_PHOTOS)
      if (photos.length === 0) return null
      const pick = sleeveChoice(album.id, photos.length)
      const blob = await paintPhotoSleeve(
        photos[pick.photo],
        { title: shownName(album.title), artist: shownName(album.artist) ?? '', serif: pick.serif, centred: pick.centred },
        SIZE,
        QUALITY,
      )
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      useMadeSleeves.setState((s) => ({ urls: { ...s.urls, [album.id]: url } }))
      return url
    } catch (err) {
      console.warn('[jukebox] Could not draw a sleeve for an album with no artwork:', err)
      unavailable = true
      return null
    } finally {
      pending.delete(album.id)
    }
  })()
  pending.set(album.id, job)
  return job
}

/** The art to show for an album: its own cover, else its made sleeve (drawn if need be). */
export async function albumArt(album: Album | undefined): Promise<string | null> {
  if (!album) return null
  return coverUrl(album.id, album.cover) ?? madeSleeve(album)
}

/** The same, as a hook: its own cover, or the made sleeve once it is drawn (null until then). */
export function useAlbumArt(album: Album | undefined): string | null {
  const made = useMadeSleeves((s) => (album ? s.urls[album.id] : undefined))
  if (!album) return null
  const own = coverUrl(album.id, album.cover)
  if (own) return own
  if (made) return made
  void madeSleeve(album)
  return null
}

/** Let every made sleeve go — the library was cleared or replaced. */
export function releaseMadeSleeves(): void {
  const { urls } = useMadeSleeves.getState()
  for (const url of Object.values(urls)) URL.revokeObjectURL(url)
  useMadeSleeves.setState({ urls: {} })
}
