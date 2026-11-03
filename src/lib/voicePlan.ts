import { sortAlbumTracks } from './albumOrder'
import { shuffleQueue, type ShuffleKind } from './shuffleQueue'
import { planVoice, type VoiceFocus, type VoiceRequest } from './voiceSearch'
import type { Album, Track } from './types'

// What a Home Screen shortcut or a voice request turns into — decided ONCE,
// here, for both of the places that carry it out:
//
//   - the page (`lib/shortcuts.ts`), with the app open, through the player
//     store and its animations;
//   - Siri on a LOCKED iPhone (`src/siri/planner.ts` → `SiriIntents.swift`),
//     where the page's JavaScript is not running and the native engine starts
//     the queue itself (James, 2026-11-03: "allow Siri so that the user doesn't
//     have to unlock for every operation").
//
// ⚠️ PURE, AND NO STORE OR I18N BEHIND IT. The planner bundle runs this file in
// JavaScriptCore; anything it imports is in that bundle. A second copy of these
// rules in Swift would drift from the page's without anything failing.

/** Only what the decisions read — the planner's tracks are the manifest's, not full `Track`s. */
export type PlanTrack = Pick<
  Track,
  'id' | 'albumId' | 'path' | 'title' | 'artist' | 'albumArtist' | 'album' | 'genre' | 'trackNo' | 'discNo'
>
export type PlanAlbum = Pick<Album, 'id' | 'artist'>

export interface PlanLibrary {
  tracks: readonly PlanTrack[]
  albums: readonly PlanAlbum[]
}

export type Decision =
  /** "Play music": carry on with what is loaded, or from last time — the caller knows which. */
  | { kind: 'carryOn' }
  /** A new queue, in play order from `at`, and whether shuffle should be on for it. */
  | { kind: 'queue'; tracks: PlanTrack[]; at: number; shuffle: boolean }
  /** Nothing in the library answers to what was asked. */
  | { kind: 'none'; asked: string }

const FOCUSES: readonly VoiceFocus[] = ['artist', 'album', 'song', 'genre', 'any']

/** A shortcut's action: `shuffle-songs`, `shuffle-albums`, `shuffle-artists`, `play`. */
export function decideShortcut(action: string, library: PlanLibrary, seed: number): Decision {
  if (action === 'play') return { kind: 'carryOn' }
  const what = action.startsWith('shuffle-') ? action.slice('shuffle-'.length) : ''
  if (what === 'songs' || what === 'albums' || what === 'artists') return shuffled(what, library, seed)
  // An action from a newer build: nothing to do, and nothing to say about it.
  return { kind: 'queue', tracks: [], at: 0, shuffle: false }
}

/**
 * "Hey Siri, play Mika on Jukebox" / "Hey Google, play Radiohead on Jukebox" —
 * see `voiceSearch.ts`. `shuffle` is Siri's "shuffle … on Jukebox".
 */
export function decideSearch(
  request: VoiceRequest & { shuffle?: boolean },
  library: PlanLibrary,
  seed: number,
): Decision {
  const focus = FOCUSES.includes(request.focus as VoiceFocus) ? request.focus : undefined
  const plan = planVoice({ ...request, focus }, library.tracks as Track[], sortAlbumTracks)
  switch (plan.kind) {
    case 'play':
      // "Shuffle Jukebox" from Siri arrives as a search with nothing named.
      return request.shuffle ? shuffled('songs', library, seed) : { kind: 'carryOn' }
    case 'shuffle':
      return shuffled(plan.what, library, seed)
    case 'mix':
      return shuffled('songs', { ...library, tracks: plan.tracks }, seed)
    case 'inOrder':
      // "Shuffle Hyperlove on Jukebox".
      if (request.shuffle) return shuffled('songs', { ...library, tracks: plan.tracks }, seed)
      // An album is asked for in its own order, whatever shuffle was left at.
      return { kind: 'queue', tracks: plan.tracks, at: plan.at, shuffle: false }
    case 'none':
      return { kind: 'none', asked: plan.asked }
  }
}

/**
 * The three shuffles, as `startShuffle` in `playerStore` plays them: songs
 * with shuffle on, albums and artists with it off (each album or artist's own
 * order is the point).
 */
function shuffled(kind: ShuffleKind, library: PlanLibrary, seed: number): Decision {
  const tracks = shuffleQueue(kind, library.tracks as Track[], library.albums as Album[], seed, sortAlbumTracks)
  return { kind: 'queue', tracks, at: 0, shuffle: kind === 'songs' }
}

/** "Resume listening" (`lib/session.ts`) — the saved queue in play order, where it was. */
export interface SavedPlace {
  ids: readonly string[]
  trackId: string
}

/**
 * The saved queue against the library as it is now — `playerStore.resume`'s
 * rule: tracks gone since are left out, and nothing if the song itself is.
 */
export function resumeQueue<T extends { id: string }>(saved: SavedPlace, tracks: readonly T[]): { tracks: T[]; at: number } | null {
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const sequence = saved.ids.map((id) => byId.get(id)).filter((t): t is T => !!t)
  const at = sequence.findIndex((t) => t.id === saved.trackId)
  return at < 0 ? null : { tracks: sequence, at }
}
