// Where you were — for "Resume listening" (James, 2026-09-11: "have a line above
// the first albums / artists / songs with an image of the device + art with
// 'Resume listening' which is the last track they were playing").
//
// The queue is kept in PLAY order (ids), with the position and the second you
// had reached, so resuming puts back what was coming next as well as the song.
// A very long queue keeps a window around where you were: localStorage is small,
// and nobody resumes track 4,000 of a shuffled library from track 12.

const KEY = 'jukebox:session'
export const MAX_IDS = 4000

export interface SavedSession {
  ids: string[]
  cursor: number
  trackId: string
  sec: number
  at: number
}

/** At most `max` ids, around `cursor` — a little behind it, the rest ahead. */
export function windowAround(ids: readonly string[], cursor: number, max = MAX_IDS): { ids: string[]; cursor: number } {
  if (ids.length <= max) return { ids: [...ids], cursor }
  // A quarter of the window behind, never more than 100 — so the window always
  // holds the track you were on, however small it is.
  const behind = Math.min(100, Math.floor(max / 4))
  const start = Math.max(0, Math.min(cursor - behind, ids.length - max))
  return { ids: ids.slice(start, start + max), cursor: cursor - start }
}

export function saveSession(ids: readonly string[], cursor: number, sec: number): void {
  if (cursor < 0 || cursor >= ids.length) return
  const kept = windowAround(ids, cursor)
  const saved: SavedSession = {
    ids: kept.ids,
    cursor: kept.cursor,
    trackId: kept.ids[kept.cursor],
    sec: Math.max(0, Math.floor(sec)),
    at: Date.now(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch { /* storage full or off — nothing to resume next time */ }
}

export function readSession(): SavedSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SavedSession> | null
    if (!parsed || !Array.isArray(parsed.ids) || typeof parsed.trackId !== 'string') return null
    const cursor = typeof parsed.cursor === 'number' ? parsed.cursor : parsed.ids.indexOf(parsed.trackId)
    return {
      ids: parsed.ids.filter((id): id is string => typeof id === 'string'),
      cursor,
      trackId: parsed.trackId,
      sec: typeof parsed.sec === 'number' && Number.isFinite(parsed.sec) ? parsed.sec : 0,
      at: typeof parsed.at === 'number' ? parsed.at : 0,
    }
  } catch {
    return null
  }
}
