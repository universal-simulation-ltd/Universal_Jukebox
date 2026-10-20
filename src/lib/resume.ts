import { useMemo } from 'react'
import { create } from 'zustand'
import { readSession, type SavedSession } from './session'
import type { Album, Track } from './types'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'

// Whether "Resume listening" is showing, and for what. Asked by the card AND by
// the lists, which open on the same record (James, 2026-09-11: "in row 1 have
// the album for that track as item 1") — one answer, so the card and the tile
// above it can never disagree about whether there is anything to resume.

/**
 * "Hide" lasts until the app is next opened. `read` counts the times the saved
 * session must be read again while the page is open — see below.
 */
const useHidden = create<{ hidden: boolean; read: number; discover: boolean }>(() => ({ hidden: false, read: 0, discover: false }))
export const hideResume = (): void => useHidden.setState({ hidden: true })

// ⚠️ THE FIRST LOOK AT A NEW LIBRARY IS "LISTEN TO THIS" (James, 2026-10-20:
// the Albums shelf is "the first view after importing a library (including
// existing) with the now resume playing card being the discovery card"). The
// phone app sets this when a library is imported, and once on phones that
// had one already; it lasts until that Albums view is left, and then "Resume
// listening" comes back whenever there is something to resume.
export const discoverFirst = (on: boolean): void => {
  if (useHidden.getState().discover !== on) useHidden.setState({ discover: on })
}
export const isDiscoveringFirst = (): boolean => useHidden.getState().discover

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
  const discover = useHidden((s) => s.discover)
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
    if (!enabled || hidden || discover || queued > 0 || !session) return null
    const track = tracks.find((t) => t.id === session.trackId)
    if (!track) return null
    return { session, track, album: albums.find((a) => a.id === track.albumId) }
  }, [enabled, hidden, discover, queued, session, tracks, albums])
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

// ── "Listen to this" ─────────────────────────────────────────────────────────
// With nothing to resume, the card offers a song at random instead (James,
// 2026-10-11: "If there's no resume listening, show 'Listen to this' with a
// random song"). One pick for the life of the app, so it doesn't change under
// your thumb as the lists re-render; from an album with a cover where there
// is one. Hidden and "Don't show again" are the resume card's own.
let suggestedId: string | null = null
/** The song "Another" will bring, picked ahead so the card can draw its record
 *  before the tap (James, 2026-10-12: the new record took a long time to come). */
let upNextId: string | null = null
/** Which showing of the card the pick is for: a new visit to the page, or the card's shuffle, picks again. */
let suggestedFor = -1
let visits = 0
/** A number for this showing of the card — call once per mount (`useState(nextVisit)`). */
export const nextVisit = (): number => ++visits

export interface Suggestion {
  track: Track
  album: Album | undefined
  /** The song's album, in order, to play on from it. */
  albumTracks: Track[]
  /** What "Another" will show next — the card draws its picture ahead. */
  upNext: { track: Track; album: Album | undefined } | null
}

/**
 * `showing` is the card's own number for this visit (`nextVisit`), bumped by
 * its shuffle button: a different number picks a different song (James,
 * 2026-10-11: "Have a shuffle button on the card to be able to see another
 * random choice and if going off the page e.g. now playing and coming back
 * show a different song").
 */
export function useSuggestion(showing: number): Suggestion | null {
  const enabled = useSettingsStore((s) => s.resumeCard)
  const hidden = useHidden((s) => s.hidden)
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const resumable = useResumable()
  // ⚠️ WHILE MUSIC PLAYS TOO (James, 2026-10-11: "When the resume song is
  // playing replace the card with listen to this too"): the resume card goes
  // once something plays, and this takes its place — never the song playing,
  // so tapping a suggestion brings a new one.
  const playingId = usePlayerStore((s) => currentTrack(s)?.id ?? null)
  return useMemo(() => {
    if (!enabled || hidden || resumable || tracks.length === 0) return null
    const fresh = showing !== suggestedFor
    const previous = suggestedId
    let track = !fresh && suggestedId && suggestedId !== playingId ? tracks.find((t) => t.id === suggestedId) : undefined
    const covered = new Set(albums.filter((a) => a.cover).map((a) => a.id))
    const pick = (not: (string | null)[]): Track => {
      const pool = tracks.filter((t) => covered.has(t.albumId) && !not.includes(t.id))
      const others = tracks.filter((t) => !not.includes(t.id))
      const from = pool.length > 0 ? pool : others.length > 0 ? others : tracks
      return from[Math.floor(Math.random() * from.length)]
    }
    if (!track) {
      const ahead = upNextId && upNextId !== playingId && upNextId !== previous ? tracks.find((t) => t.id === upNextId) : undefined
      track = ahead ?? pick([playingId, previous])
      suggestedId = track.id
    }
    let next = upNextId && upNextId !== track.id && upNextId !== playingId ? tracks.find((t) => t.id === upNextId) : undefined
    if (!next && tracks.length > 1) next = pick([playingId, track.id])
    upNextId = next?.id ?? null
    suggestedFor = showing
    const albumId = track.albumId
    return {
      track,
      album: albums.find((a) => a.id === albumId),
      albumTracks: sortAlbumTracks(tracks.filter((t) => t.albumId === albumId)),
      upNext: next ? { track: next, album: albums.find((a) => a.id === next.albumId) } : null,
    }
  }, [enabled, hidden, resumable, tracks, albums, playingId, showing])
}
