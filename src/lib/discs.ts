import { albumKey } from './keys'
import type { Album, Track } from './types'

// A multi-disc set that arrived as separate albums, put back together (James,
// 2026-09-11: "can we group multi-albums? E.g. The Essential Britney Spears +
// (1) + (2)"). His library has three albums tagged "The Essential Britney
// Spears", "… (1)" and "… (2)": one release, split by whatever wrote the tags.
//
// ⚠️ A VIEW OF THE LIBRARY, applied as it is loaded or scanned — NOT a change
// to `albumKey`. The key is every stored track's identity; changing it would
// part the library on the phone from its covers and its tidy-up fixes until a
// full rescan. This regroups what is already there, on the next launch.
//
// ⚠️ ONLY WHAT IS PLAINLY A DISC NUMBER: "(1)", "[2]", "(Disc 1)", "CD 2",
// "- Disc 2 of 2". Not "Vol. 2" (volumes are separate releases), not a year
// ("(2004)"), and not a bare trailing number ("Blink-182", "Adele 21"). And
// only where two or more albums by the same artist share what is left, so a
// lone "Greatest Hits (2)" keeps its name.

const BRACKETED = /\s*[([]\s*(?:(?:dis[ck]|cd)\s*)?(\d{1,2})(?:\s*(?:of|\/)\s*\d{1,2})?\s*[)\]]\s*$/i
const WORDED = /\s*(?:[-–—:,]\s*)?\b(?:dis[ck]|cd)\s*(\d{1,2})(?:\s*(?:of|\/)\s*\d{1,2})?\s*$/i

/** An album title without a trailing disc number, and that number (null if none). */
export function discPart(title: string): { base: string; disc: number | null } {
  const m = BRACKETED.exec(title) ?? WORDED.exec(title)
  if (!m || m.index === 0) return { base: title, disc: null }
  return { base: title.slice(0, m.index).trim(), disc: Number(m[1]) }
}

interface Part {
  album: Album
  base: string
  disc: number | null
}

/**
 * The library with each disc set as ONE album: the unnumbered part (or else
 * the lowest-numbered) keeps its id and gives the album its title, and the
 * other parts' tracks move into it as later discs. The same arrays come back
 * when there is nothing to join, so nothing downstream re-renders for it.
 *
 * Disc numbers: kept when the tags already tell the parts apart (disc 1 in one,
 * disc 2 in the other); otherwise the parts are numbered in order — unnumbered
 * first, then (1), (2) — which is what puts "Disc 1", "Disc 2", "Disc 3" on the
 * album page and plays them in that order.
 */
export function mergeDiscSets(tracks: Track[], albums: Album[]): { tracks: Track[]; albums: Album[] } {
  const groups = new Map<string, Part[]>()
  for (const album of albums) {
    const { base, disc } = discPart(album.title)
    const key = albumKey({ albumArtist: album.artist, album: base })
    const group = groups.get(key)
    const part = { album, base, disc }
    if (group) group.push(part)
    else groups.set(key, [part])
  }

  /** A part's album id → the album it joins, and its disc there (null: keep the tags'). */
  const joins = new Map<string, { id: string; title: string; disc: number | null }>()
  const merged = new Map<string, Album>()
  for (const parts of groups.values()) {
    if (parts.length < 2 || parts.every((p) => p.disc === null)) continue
    parts.sort((a, b) => (a.disc ?? 0) - (b.disc ?? 0))
    const head = parts[0]

    const discsIn = parts.map((p) => new Set(tracks.filter((t) => t.albumId === p.album.id).map((t) => t.discNo ?? 0)))
    const tagsTellApart = discsIn.every(
      (mine, i) => !mine.has(0) && discsIn.every((other, j) => j === i || [...mine].every((d) => !other.has(d))),
    )
    parts.forEach((p, i) => joins.set(p.album.id, { id: head.album.id, title: head.base, disc: tagsTellApart ? null : i + 1 }))

    const years = parts.map((p) => p.album.year).filter((y): y is number => typeof y === 'number')
    merged.set(head.album.id, {
      ...head.album,
      title: head.base,
      year: years.length > 0 ? Math.min(...years) : undefined,
      trackCount: parts.reduce((n, p) => n + p.album.trackCount, 0),
      cover: parts.find((p) => p.album.cover)?.album.cover ?? null,
    })
  }
  if (joins.size === 0) return { tracks, albums }

  return {
    albums: albums.flatMap((a) => {
      const join = joins.get(a.id)
      if (!join) return [a]
      return join.id === a.id ? [merged.get(a.id) as Album] : []
    }),
    tracks: tracks.map((t) => {
      const join = joins.get(t.albumId)
      if (!join) return t
      return { ...t, albumId: join.id, album: join.title, discNo: join.disc ?? t.discNo }
    }),
  }
}
