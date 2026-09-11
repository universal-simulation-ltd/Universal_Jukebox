// The Jukebox tab's shelves (James, 2026-09-11: "I also want a jukebox tab
// that has a jukebox view and an empty shelf with a (+) button for people to
// add a record — essentially a styled playlist — when they add to one shelf
// then add an additional empty shelf below it"). A shelf is a playlist of
// SONGS, each shown as a 45 in its album's sleeve.
//
// Only shelves with a song on them are kept; the empty one always shown after
// them is not stored — it becomes a shelf when its first song goes on, and
// then another empty one appears below it.

export interface JukeboxShelf {
  id: string
  trackIds: string[]
  /** What you called it — "Shelf 1, 2…" by position until you do. */
  name?: string
}

/** The empty shelf at the end, which is not stored until something goes on it. */
export const NEW_SHELF = 'new'

/** The shelves as shown: every one with a song on it, then one empty shelf. */
export function shelvesToShow(shelves: readonly JukeboxShelf[]): JukeboxShelf[] {
  return [...shelves.filter((s) => s.trackIds.length > 0), { id: NEW_SHELF, trackIds: [] }]
}

/**
 * Put a song on a shelf, or take it off if it is already there. A song for a
 * shelf that does not exist (the empty one) starts a new shelf with `newId`.
 * A shelf left with nothing on it goes. Returns the shelf the song went to.
 */
export function toggleOnShelf(
  shelves: readonly JukeboxShelf[],
  shelfId: string,
  trackId: string,
  newId: string,
): { shelves: JukeboxShelf[]; shelfId: string } {
  if (!shelves.some((s) => s.id === shelfId)) {
    return { shelves: [...shelves, { id: newId, trackIds: [trackId] }], shelfId: newId }
  }
  const next = shelves
    .map((s) => {
      if (s.id !== shelfId) return s
      const on = s.trackIds.includes(trackId)
      return { ...s, trackIds: on ? s.trackIds.filter((id) => id !== trackId) : [...s.trackIds, trackId] }
    })
    .filter((s) => s.trackIds.length > 0)
  return { shelves: next, shelfId }
}

/** Whatever was stored, as shelves — anything malformed is dropped, not trusted. */
export function parseShelves(raw: unknown): JukeboxShelf[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is { id: string; trackIds: unknown[]; name?: unknown } => !!s && typeof s.id === 'string' && Array.isArray(s.trackIds))
    .map((s) => ({
      id: s.id,
      trackIds: s.trackIds.filter((id): id is string => typeof id === 'string'),
      ...(typeof s.name === 'string' && s.name.trim() ? { name: s.name.trim().slice(0, NAME_MAX) } : {}),
    }))
    .filter((s) => s.trackIds.length > 0)
}

/** Longest name a shelf keeps. */
export const NAME_MAX = 40

/** A shelf's name as shown: yours, or "Shelf N" by its place. */
export function shelfName(shelf: JukeboxShelf, index: number): string {
  return shelf.name?.trim() || `Shelf ${index + 1}`
}

/** Call a shelf something — or, with an empty name, go back to "Shelf N". */
export function renameShelf(shelves: readonly JukeboxShelf[], shelfId: string, name: string): JukeboxShelf[] {
  const clean = name.trim().slice(0, NAME_MAX)
  return shelves.map((s) => {
    if (s.id !== shelfId) return s
    if (clean) return { ...s, name: clean }
    const unnamed = { ...s }
    delete unnamed.name
    return unnamed
  })
}

/** Move a song one place along its shelf (−1 left, +1 right); at an end, it stays. */
export function moveOnShelf(shelves: readonly JukeboxShelf[], shelfId: string, trackId: string, delta: -1 | 1): JukeboxShelf[] {
  return shelves.map((s) => {
    if (s.id !== shelfId) return s
    const from = s.trackIds.indexOf(trackId)
    const to = from + delta
    if (from < 0 || to < 0 || to >= s.trackIds.length) return s
    const ids = [...s.trackIds]
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    return { ...s, trackIds: ids }
  })
}

/**
 * Put several songs on a shelf — an album from its page — skipping any already
 * there, in their order. A shelf that does not exist (the empty one) starts a
 * new shelf with `newId`. Returns the shelf they went to.
 */
export function addToShelf(
  shelves: readonly JukeboxShelf[],
  shelfId: string,
  trackIds: readonly string[],
  newId: string,
): { shelves: JukeboxShelf[]; shelfId: string } {
  const unique = [...new Set(trackIds)]
  if (unique.length === 0) return { shelves: [...shelves], shelfId }
  if (!shelves.some((s) => s.id === shelfId)) return { shelves: [...shelves, { id: newId, trackIds: unique }], shelfId: newId }
  return {
    shelves: shelves.map((s) => (s.id !== shelfId ? s : { ...s, trackIds: [...s.trackIds, ...unique.filter((id) => !s.trackIds.includes(id))] })),
    shelfId,
  }
}
