// madeSleeves.ts — a sleeve for every album whose files carry no artwork
// (James, 2026-11-05: "In the case of an album having no album artwork, assign
// it a random Universal Jukebox cover (like in the library) and write the
// artist and album on the sleeve. At the moment it's just a blank colour").
//
// One of twenty photographs of its own (`src/assets/sleeve-photos/`, CC0,
// credited in its README), with the album and artist set on it by the
// example library's painter (`photoSleeve.ts`). NOT the example library's
// photos: an untagged album of yours wearing a demo record's sleeve would read
// as the demo leaking into your library (James, 2026-11-05: "a slightly wider
// library? Say 20?").
//
// Which photo: `sleevePick.ts` — never the same twice for one artist, the
// least-used otherwise — and then KEPT on the device (`KEPT_KEY`), so a record
// is the same sleeve on every visit even as the library grows. The lettering
// (serif / centred) comes from the album's hash.
//
// ⚠️ ONE PHOTO PER CHUNK. Each is inlined (a data URL — `exampleCovers.ts`
// says why: the desktop app's `file://` taints a canvas drawn from a file) and
// loaded on first use through `import.meta.glob`, so a library with three bare
// albums downloads three photos, not twenty.
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
import { hashOf, pickPhotos } from './sleevePick'
import type { Album } from './types'
import { useLibraryStore } from '../stores/libraryStore'

/** The photos, by file name; each loads (as a data URL) only when first asked for. */
const PHOTO_FILES = import.meta.glob<string>('../assets/sleeve-photos/*.jpg', { query: '?inline', import: 'default' })
const PHOTOS = Object.keys(PHOTO_FILES).map((path) => path.slice(path.lastIndexOf('/') + 1)).sort()
const photoLoader = (name: string) => PHOTO_FILES[`../assets/sleeve-photos/${name}`]

/** albumId → photo file name, kept on the device so a sleeve never changes. */
const KEPT_KEY = 'jukebox:made-sleeve-photos'
let kept: Record<string, string> | null = null

function readKept(): Record<string, string> {
  if (kept) return kept
  try {
    const raw = JSON.parse(localStorage.getItem(KEPT_KEY) ?? '{}') as unknown
    kept = raw && typeof raw === 'object' ? (raw as Record<string, string>) : {}
  } catch {
    kept = {}
  }
  return kept
}

/** The photo this album wears: kept, or picked now (with every other bare album, so the rules hold across them). */
function photoFor(album: Album): string | null {
  const had = readKept()[album.id]
  if (had && PHOTOS.includes(had)) return had
  const bare = useLibraryStore.getState().albums.filter((a) => !a.cover)
  if (!bare.some((a) => a.id === album.id)) bare.push(album)
  kept = pickPhotos(bare, PHOTOS, readKept())
  try {
    localStorage.setItem(KEPT_KEY, JSON.stringify(kept))
  } catch { /* private mode: picked again next time, by the same rules */ }
  return kept[album.id] ?? null
}

/** Small: it is only ever a tile, a label or a sleeve, and a big library may have hundreds. */
const SIZE = 400
const QUALITY = 0.8

interface MadeState {
  /** albumId → object URL of its made sleeve. */
  urls: Record<string, string>
}

export const useMadeSleeves = create<MadeState>(() => ({ urls: {} }))

const pending = new Map<string, Promise<string | null>>()
/** Albums whose sleeve could not be drawn, so it isn't retried on every render (they keep the colour tile). */
const failed = new Set<string>()

/** The lettering an album's sleeve gets. Pure; exported for the test. */
export function sleeveLettering(albumId: string): { serif: boolean; centred: boolean } {
  const h = hashOf(albumId)
  return { serif: ((h >>> 8) & 3) === 0, centred: ((h >>> 12) & 3) === 0 }
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
  if (failed.has(album.id) || typeof document === 'undefined') return Promise.resolve(null)
  const running = pending.get(album.id)
  if (running) return running
  const job = (async () => {
    try {
      const name = photoFor(album)
      const load = name ? photoLoader(name) : undefined
      if (!load) {
        failed.add(album.id)
        return null
      }
      const [src, { paintPhotoSleeve }] = await Promise.all([load(), import('./photoSleeve')])
      const pick = sleeveLettering(album.id)
      const blob = await paintPhotoSleeve(
        src,
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
      failed.add(album.id)
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
