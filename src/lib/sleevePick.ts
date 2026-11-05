// sleevePick.ts — which photograph each album with no artwork wears
// (`madeSleeves.ts`). Pure, so `sleevePick.test.ts` can hold it to its rules.
//
// James, 2026-11-05: a wider set of photos (20) and no near repeats. Two rules,
// in order:
//   1. One artist's albums never share a photo (until the artist has more
//      albums than there are photos). Sorted A–Z, an artist's albums sit side
//      by side, so this is what keeps a shelf from showing the same sleeve twice
//      in a row.
//   2. Otherwise the least-used photo, so 40 bare albums wear each photo
//      twice rather than one photo five times. Ties go to the photo nearest the
//      album's own hash, so the choice is spread, not "always the first".
//
// ⚠️ A CHOICE IS KEPT FOR GOOD (`kept`, stored by `madeSleeves.ts`). Greedy
// assignment depends on what came before it, so recomputing would re-dress
// existing albums every time one was added. Only albums without a kept photo
// are assigned; a kept photo that no longer exists (renamed or removed from the
// set) is assigned afresh.

export interface PickAlbum {
  id: string
  artist?: string
}

export function hashOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Every album in `albums` with a photo from `photos`: the kept ones as they
 * were, the rest by the rules above. Returns the whole new map (kept entries
 * for albums not in `albums` are carried over, so an album that comes back
 * gets its old sleeve back).
 */
export function pickPhotos(albums: readonly PickAlbum[], photos: readonly string[], kept: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = { ...kept }
  if (photos.length === 0) return out
  const valid = new Set(photos)
  const count = new Map(photos.map((p) => [p, 0]))
  const byArtist = new Map<string, Set<string>>()
  const artistOf = (a: PickAlbum) => (a.artist ?? '').trim().toLowerCase()
  const fresh: PickAlbum[] = []
  for (const album of albums) {
    const photo = out[album.id]
    if (photo && valid.has(photo)) {
      count.set(photo, (count.get(photo) ?? 0) + 1)
      const seen = byArtist.get(artistOf(album)) ?? new Set<string>()
      seen.add(photo)
      byArtist.set(artistOf(album), seen)
    } else {
      fresh.push(album)
    }
  }
  // A stable order, whatever order the library lists them in.
  fresh.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const album of fresh) {
    const artist = artistOf(album)
    const seen = byArtist.get(artist) ?? new Set<string>()
    const open = photos.filter((p) => !(artist && seen.has(p)))
    const pool = open.length > 0 ? open : photos
    const home = hashOf(album.id) % photos.length
    const distance = (p: string) => (photos.indexOf(p) - home + photos.length) % photos.length
    let best = pool[0]
    for (const p of pool) {
      const c = count.get(p) ?? 0
      const b = count.get(best) ?? 0
      if (c < b || (c === b && distance(p) < distance(best))) best = p
    }
    out[album.id] = best
    count.set(best, (count.get(best) ?? 0) + 1)
    seen.add(best)
    byArtist.set(artist, seen)
  }
  return out
}
