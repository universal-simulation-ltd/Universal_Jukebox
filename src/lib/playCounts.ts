// How many times each song has been played, kept on the device, for the
// Most played shelf (James, 2026-10-11: "On the shelves page have an auto
// shelf of most played - allow them to delete the shelf").
//
// A play counts once you have heard half the song, or four minutes of a long
// one — the rule scrobblers use — so skipping through a list counts nothing,
// and a song counts again only when it starts again. Nothing leaves the
// device; the example library being TRIED counts nothing (its songs aren't
// yours, and the trial ends).

import { create } from 'zustand'
import type { Track } from './types'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'

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

// ── Counting ────────────────────────────────────────────────────────────────
// One play at a time: `session` is the song on the deck and whether it has
// counted. A new song, or the same one started again from the top, is a new
// play.
let session: { id: string; counted: boolean; at: number } | null = null
usePlayerStore.subscribe((state) => {
  const track = currentTrack(state)
  if (!track) {
    session = null
    return
  }
  const sec = state.currentSec
  if (!session || session.id !== track.id || (session.counted && sec < 1 && session.at > 2)) {
    session = { id: track.id, counted: false, at: sec }
  }
  session.at = sec
  if (session.counted || !state.playing) return
  if (sec < countsAfter(state.durationSec || track.durationSec || 0)) return
  session.counted = true
  if (useLibraryStore.getState().trying) return
  countPlay(track.id)
})
