// Where you were — for "Resume listening" (James, 2026-09-11: "have a line above
// the first albums / artists / songs with an image of the device + art with
// 'Resume listening' which is the last track they were playing").
//
// The queue is kept in PLAY order (ids), with the position and the second you
// had reached, so resuming puts back what was coming next as well as the song.
// A very long queue keeps a window around where you were: localStorage is small,
// and nobody resumes track 4,000 of a shuffled library from track 12.

// ⚠️ TWO KEYS, and the split is the point (2026-09-27). This used to be one
// blob — up to 4,000 ids, ~480 KB — rewritten every five seconds of playback,
// which is ~350 MB an hour through WebKit's localStorage and left a 164 MB
// write-ahead log on iPhone JPM. The queue only changes when the queue (or a
// long queue's window) does, so it has a key of its own that is written only
// then; what changes every five seconds is a few bytes of position.
const KEY = 'jukebox:session'
const QUEUE_KEY = 'jukebox:session-queue'
export const MAX_IDS = 4000

/** The queue last written, so an unchanged one is not written again. */
let lastQueue: readonly string[] | null = null

function sameIds(a: readonly string[] | null, b: readonly string[]): boolean {
  if (!a || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

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

/**
 * True while "Resume listening" must not be written at all — the example
 * library being tried in place of a real one (`libraryStore.tryExample`).
 *
 * ⚠️ HELD HERE, AT THE ONE DOOR, rather than by each caller. The player saves
 * where you were on every change of track, every five seconds, and as a
 * stopped queue tears down — three routes, each of which would otherwise write
 * the example's ids over the real session, and "Resume listening" would come
 * back from the trial pointing at a demo track the real library does not have.
 * The card would simply vanish, and with it the way back to the song you were
 * on. A flag at the door cannot be forgotten by a fourth route.
 */
let held = false

/** Stop (or start again) writing "Resume listening" — see `held`. */
export function holdSession(hold: boolean): void {
  held = hold
}

export function saveSession(ids: readonly string[], cursor: number, sec: number): void {
  if (held) return
  if (cursor < 0 || cursor >= ids.length) return
  const kept = windowAround(ids, cursor)
  try {
    if (!sameIds(lastQueue, kept.ids)) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(kept.ids))
      lastQueue = kept.ids
    }
    const position = {
      cursor: kept.cursor,
      trackId: kept.ids[kept.cursor],
      sec: Math.max(0, Math.floor(sec)),
      at: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(position))
  } catch { /* storage full or off — nothing to resume next time */ }
}

export function readSession(): SavedSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as (Partial<SavedSession> & { ids?: unknown }) | null
    if (!parsed || typeof parsed.trackId !== 'string') return null
    // A session saved before the split carries its ids inline.
    const raw: unknown = Array.isArray(parsed.ids) ? parsed.ids : JSON.parse(localStorage.getItem(QUEUE_KEY) ?? 'null')
    if (!Array.isArray(raw)) return null
    const ids = raw.filter((id): id is string => typeof id === 'string')
    const cursor = typeof parsed.cursor === 'number' && ids[parsed.cursor] === parsed.trackId
      ? parsed.cursor
      : ids.indexOf(parsed.trackId)
    if (cursor < 0) return null
    return {
      ids,
      cursor,
      trackId: parsed.trackId,
      sec: typeof parsed.sec === 'number' && Number.isFinite(parsed.sec) ? parsed.sec : 0,
      at: typeof parsed.at === 'number' ? parsed.at : 0,
    }
  } catch {
    return null
  }
}
