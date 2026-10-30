// How many times each song has been played, kept on the device, for the
// Most played shelf (James, 2026-10-11: "On the shelves page have an auto
// shelf of most played - allow them to delete the shelf").
//
// A play counts once you have heard half the song, or four minutes of a long
// one — the rule scrobblers use — so skipping through a list counts nothing,
// and a song counts again only when it starts again. Nothing leaves the
// device; the example library being TRIED counts nothing (its songs aren't
// yours, and the trial ends).
//
// ⚠️ THE COUNTING ITSELF IS `playCounting.ts`, which watches the player. Kept
// apart so the counts can be read — by the shelves, deciding whether the
// starter shelf has done its job — without loading the player and its audio.

import { create } from 'zustand'
import type { Track } from './types'

const KEY = 'jukebox:plays'
/** Songs on the Most played shelf, at most. */
export const MOST_PLAYED_MAX = 20
/** Plays before a song goes on it: once is a listen, twice is a favourite. */
export const MOST_PLAYED_MIN = 2

export interface PlayCount {
  /** Times played. */
  n: number
  /** When it last counted, ms since 1970 — the tie-break, newest first. */
  last: number
}

function read(): Record<string, PlayCount> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (!raw || typeof raw !== 'object') return {}
    const out: Record<string, PlayCount> = {}
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      const v = value as Partial<PlayCount> | null
      if (v && typeof v.n === 'number' && v.n > 0 && typeof v.last === 'number') out[id] = { n: Math.floor(v.n), last: v.last }
    }
    return out
  } catch {
    return {}
  }
}

export const usePlayCounts = create<{ counts: Record<string, PlayCount> }>(() => ({ counts: read() }))

export function countPlay(trackId: string, now = Date.now()): void {
  const counts = usePlayCounts.getState().counts
  const next = { ...counts, [trackId]: { n: (counts[trackId]?.n ?? 0) + 1, last: now } }
  usePlayCounts.setState({ counts: next })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch { /* storage full or off — counted until the app closes */ }
}

/**
 * Every count gone, so Most played starts again from nothing (James,
 * 2026-10-30: "For the most played stats have an option to 'Reset' the played
 * statistics") — Tune this app ▸ Your library.
 */
export function resetPlays(): void {
  usePlayCounts.setState({ counts: {} })
  try {
    localStorage.removeItem(KEY)
  } catch { /* storage off — the counts were only ever in memory */ }
}

/** When a play of a song this long has been heard: half of it, at most four minutes. */
export function countsAfter(durationSec: number): number {
  return durationSec > 0 ? Math.min(durationSec / 2, 240) : 30
}

/** The Most played shelf: songs played at least twice, most first, then the most recent. Pure. */
export function mostPlayed(counts: Record<string, PlayCount>, byId: ReadonlyMap<string, Track>): Track[] {
  return Object.entries(counts)
    .filter(([id, c]) => c.n >= MOST_PLAYED_MIN && byId.has(id))
    .sort(([, a], [, b]) => b.n - a.n || b.last - a.last)
    .slice(0, MOST_PLAYED_MAX)
    .map(([id]) => byId.get(id) as Track)
}
