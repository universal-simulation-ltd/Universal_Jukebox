import { useMemo } from 'react'
import { create } from 'zustand'
import { readSession, type SavedSession } from './session'
import type { Album, Track } from './types'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'

// Whether "Resume listening" is showing, and for what. Asked by the card AND by
// the lists, which open on the same record (James, 2026-09-11: "in row 1 have
// the album for that track as item 1") — one answer, so the card and the tile
// above it can never disagree about whether there is anything to resume.

/**
 * "Hide" lasts until the app is next opened. `read` counts the times the saved
 * session must be read again while the page is open — see below.
 */
const useHidden = create<{ hidden: boolean; read: number }>(() => ({ hidden: false, read: 0 }))
export const hideResume = (): void => useHidden.setState({ hidden: true })

// ⚠️ BACK FROM TRYING THE EXAMPLE LIBRARY, the card is how you get back to
// what you were playing (the player stopped it on the way in — see the end of
// `playerStore`). So it is shown again even if it had been hidden, and the
// session is READ AGAIN: a card mounted before the trial read it then, and the
// player has since saved the exact second it stopped at. Without the re-read
// the card offered wherever the last five-second save had got to.
useLibraryStore.subscribe((now, before) => {
  if (before.trying && !now.trying) useHidden.setState((s) => ({ hidden: false, read: s.read + 1 }))
})

export interface Resumable {
  session: SavedSession
  track: Track
  album: Album | undefined
}

/** What "Resume listening" offers, or null while it is not showing. */
export function useResumable(): Resumable | null {
  const enabled = useSettingsStore((s) => s.resumeCard)
  const hidden = useHidden((s) => s.hidden)
  // Shown only while nothing is playing: once something is, the player bar is
  // the way back.
  const queued = usePlayerStore((s) => s.queue.length)
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const read = useHidden((s) => s.read)
  // Read once per visit to the page: the card shows where you WERE.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `read` is the signal to read again, not an input
  const session = useMemo(() => readSession(), [read])
  return useMemo(() => {
    if (!enabled || hidden || queued > 0 || !session) return null
    const track = tracks.find((t) => t.id === session.trackId)
    if (!track) return null
    return { session, track, album: albums.find((a) => a.id === track.albumId) }
  }, [enabled, hidden, queued, session, tracks, albums])
}

/**
 * `items` with the first one `lead` picks moved to the front, the rest in their
 * order. Nothing is ADDED: something the list's filters left out (a search, "Full
 * albums only") stays out, so the count beside the tab is still the list's length.
 */
export function leadWith<T>(items: readonly T[], lead: ((item: T) => boolean) | null): T[] {
  const at = lead ? items.findIndex(lead) : -1
  if (at <= 0) return [...items]
  return [items[at], ...items.slice(0, at), ...items.slice(at + 1)]
}
